mod config;
mod decode;
mod error;
mod md5_auth;
mod sasl_auth;
mod socket;
mod types;

use bytes::{Buf, Bytes};
pub use config::{Config, TlsMode, load_client_cert, load_root_cert};
pub use decode::{DecodeError, Decoder};
pub use error::Error;
use pgwire::messages::{
    PgWireBackendMessage, PgWireFrontendMessage,
    data::{DataRow, FORMAT_CODE_TEXT, FieldDescription},
    response::CommandComplete,
    simplequery::Query,
    startup::{Authentication, Password, PasswordMessageFamily, Startup},
};
use socket::Socket;
use std::collections::HashMap;
pub use types::{ColumnType, Type};

type Result<T> = std::result::Result<T, Error>;

#[derive(Debug)]
pub struct Connection {
    pub config: Config,
    socket: Socket,
    type_cache: HashMap<u32, String>,
}

impl Connection {
    pub async fn connect(config: Config) -> Result<Self> {
        let stream = config.connect_stream().await?;
        let socket = Socket::with_stream(stream, &config).await?;

        let mut conn = Self {
            config,
            socket,
            type_cache: HashMap::default(),
        };

        conn.startup().await?;

        if let Some(sql) = conn.config.initial_sql.clone() {
            conn.raw_query(sql).await?;
        }

        Ok(conn)
    }

    async fn wait_ready(&mut self) -> Result<()> {
        match self.socket.read_message().await? {
            PgWireBackendMessage::ReadyForQuery(..) => Ok(()),
            msg => Err(Error::protocol("ReadyForQuery", msg)),
        }
    }

    async fn startup(&mut self) -> Result<()> {
        let config = &self.config;
        let mut params = vec![
            ("DateStyle", "ISO, MDY"),
            ("client_encoding", "UTF8"),
            ("TimeZone", "UTC"),
            ("user", &config.username),
            ("database", &config.database),
        ];
        if let Some(val) = &config.application_name {
            params.push(("application_name", val));
        }
        if let Some(val) = &config.extra_float_digits {
            params.push(("extra_float_digits", val));
        }
        // params.push(("options", &config.options));
        let mut startup = Startup::default();
        for (k, v) in params {
            startup.parameters.insert(k.into(), v.into());
        }

        self.socket
            .send_message(PgWireFrontendMessage::Startup(startup))
            .await?;

        loop {
            let msg = self.socket.read_message().await?;
            match msg {
                PgWireBackendMessage::Authentication(auth) => match auth {
                    Authentication::Ok => {}
                    Authentication::CleartextPassword => {
                        self.socket
                            .send_message(PgWireFrontendMessage::PasswordMessageFamily(
                                PasswordMessageFamily::Password(Password::new(
                                    config.password.clone().unwrap_or_default(),
                                )),
                            ))
                            .await?;
                    }
                    Authentication::MD5Password(salt) => {
                        md5_auth::authenticate(&mut self.socket, config, salt).await?;
                    }
                    Authentication::SASL(methods) => {
                        sasl_auth::authenticate(&mut self.socket, config, methods).await?;
                    }
                    auth => {
                        return Err(Error::Protocol(format!(
                            "unsupported authentication method: {:?}",
                            auth
                        )));
                    }
                },
                PgWireBackendMessage::ReadyForQuery(..) => {
                    break;
                }
                PgWireBackendMessage::ErrorResponse(err) => {
                    return Err(Error::error_response(err));
                }
                msg => {
                    return Err(Error::protocol(
                        "Authentication, ReadyForQuery, ErrorResponse",
                        msg,
                    ));
                }
            }
        }
        Ok(())
    }

    pub async fn raw_query<S: AsRef<str>>(
        &mut self,
        sql: S,
    ) -> Result<Vec<Response<FieldDescription>>> {
        self.socket
            .send_message(PgWireFrontendMessage::Query(Query::new(
                sql.as_ref().into(),
            )))
            .await?;

        let mut resps = vec![];
        loop {
            match self.socket.read_message().await? {
                PgWireBackendMessage::RowDescription(desc) => {
                    resps.push(Response::Query(desc.fields, vec![]));
                }
                PgWireBackendMessage::DataRow(row) => {
                    if let Some(Response::Query(_, rows)) = resps.last_mut() {
                        rows.push(split_row(row));
                        continue;
                    }
                    return Err(Error::Protocol(
                        "missing 'RowDescription' before 'DataRow'".into(),
                    ));
                }
                PgWireBackendMessage::CommandComplete(data) => {
                    resps.push(Response::CommandComplete(rows_affected(data).unwrap_or(0)));
                }
                PgWireBackendMessage::ReadyForQuery(..) => {
                    break;
                }
                PgWireBackendMessage::ErrorResponse(err) => {
                    self.wait_ready().await?;
                    return Err(Error::error_response(err));
                }
                PgWireBackendMessage::EmptyQueryResponse(_) => {
                    self.wait_ready().await?;
                    return Ok(vec![]);
                }
                msg => {
                    return Err(Error::protocol(
                        "RowDescription, DataRow, CommandComplete, ErrorResponse, ReadyForQuery, EmptyQueryResponse",
                        msg,
                    ));
                }
            }
        }
        Ok(resps)
    }

    async fn inner_query<S: AsRef<str>>(&mut self, sql: S) -> Result<Vec<Response<Column>>> {
        let resps = self.raw_query(sql).await?;
        let mut new_resps = Vec::with_capacity(resps.len());
        for resp in resps {
            match resp {
                Response::CommandComplete(n) => new_resps.push(Response::CommandComplete(n)),
                Response::Query(fields, rows) => {
                    let mut columns = Vec::with_capacity(fields.len());
                    for field in fields {
                        columns.push(Column {
                            name: field.name,
                            text_format: field.format_code == FORMAT_CODE_TEXT,
                            datatype: self.get_column_type(field.type_id).await?,
                        })
                    }
                    new_resps.push(Response::Query(columns, rows));
                }
            }
        }
        Ok(new_resps)
    }

    pub async fn query<S: AsRef<str>>(&mut self, sql: S) -> Result<Vec<Response<Column>>> {
        match self.inner_query(sql.as_ref()).await {
            Ok(res) => Ok(res),
            Err(Error::ErrorResponse(e)) => Err(Error::ErrorResponse(e)),
            rst => {
                *self = Self::connect(self.config.clone()).await?;
                // self.inner_query(sql).await
                rst
            }
        }
    }

    async fn get_column_type(&mut self, oid: u32) -> Result<ColumnType> {
        // Built-in types
        if let Some(t) = ColumnType::from_oid(oid) {
            return Ok(t);
        }

        // Read from cache
        if let Some(t) = self.type_cache.get(&oid) {
            return Ok(ColumnType::Custom(t.clone()));
        }

        // Read from the database
        // TODO: Read multiple oids at once
        let sql = format!("SELECT typname FROM pg_type WHERE oid = {}", oid);
        if let Some(Response::Query(_, rows)) = self.raw_query(sql).await?.first() {
            if let Some(row) = rows.first() {
                if let Some(Some(bytes)) = row.first() {
                    if let Ok(typename) = Decoder::<String>::decode(bytes) {
                        self.type_cache.insert(oid, typename.clone());
                        return Ok(ColumnType::Custom(typename));
                    }
                }
            }
        }

        // Not found in the database, cache it
        self.type_cache.insert(oid, "".into());

        Ok(ColumnType::Custom("".into()))
    }
}

#[derive(Debug)]
pub enum Response<T> {
    Query(Vec<T>, Vec<Vec<Option<Bytes>>>),
    CommandComplete(u64),
}

#[derive(Debug)]
pub struct Column {
    pub name: String,
    pub datatype: ColumnType,
    pub text_format: bool,
}

fn rows_affected(state: CommandComplete) -> Option<u64> {
    let mut parts = state.tag.split_ascii_whitespace();
    let Some(command) = parts.next() else {
        return None;
    };
    match command {
        "COPY" | "DELETE" | "INSERT" | "MERGE" | "UPDATE" => {
            parts.next_back().and_then(|s| s.parse::<u64>().ok())
        }
        _ => None,
    }
}

fn split_row(mut row: DataRow) -> Vec<Option<Bytes>> {
    let mut rst = Vec::with_capacity(row.field_count as usize);
    for _ in 0..row.field_count as usize {
        let len = row.data.get_i32();
        if len < 0 {
            rst.push(None);
        } else {
            rst.push(Some(row.data.split_to(len as usize).freeze()));
        }
    }
    rst
}
