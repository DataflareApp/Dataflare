use crate::utils::FirstCell;
use crate::{ChunkInsert, Database, LOCALHOST, MsSqlAuthConfig, MsSqlConfig, Result, Value};
use query::{Query, QueryColumn};
use std::sync::Arc;
use std::time::Instant;
use tiberius::time::time::{Date, OffsetDateTime, PrimitiveDateTime, Time};
use tiberius::{
    AuthMethod, Client, ColumnData, ColumnType, Config, EncryptionLevel, QueryStream, Row,
};
use tokio::net::TcpStream;
use tokio::sync::Mutex;
use tokio_util::compat::{Compat, TokioAsyncWriteCompatExt};

#[derive(Debug, Clone)]
pub struct MsSqlConnection {
    conn: Arc<Mutex<Connection>>,
}

// TODO:
// Support instance name
// Support TLS config
// Support Proxy

impl MsSqlConnection {
    pub(crate) async fn test(config: MsSqlConfig) -> Result<Option<String>> {
        Connection::connect(Self::make_config(config))
            .await?
            .query("SELECT @@VERSION;")
            .await?
            .rows
            .first_cell_string()
            .map(Some)
    }

    pub(crate) async fn connect(config: MsSqlConfig) -> Result<Database> {
        let conn = Connection::connect(Self::make_config(config)).await?;
        Ok(Database::MsSql(Self {
            conn: Arc::new(Mutex::new(conn)),
        }))
    }

    fn make_config(config: MsSqlConfig) -> MsSqlConnectConfig {
        let mut options = Config::new();
        options.host(config.host.unwrap_or(LOCALHOST.to_string()));
        if let Some(port) = config.port {
            options.port(port);
        }
        let auth = match config.auth {
            MsSqlAuthConfig::SqlServer { user, password } => AuthMethod::sql_server(user, password),
            MsSqlAuthConfig::Integrated => AuthMethod::Integrated,
        };
        options.readonly(config.readonly);
        options.authentication(auth);
        options.database(config.database);
        options.application_name("Dataflare");
        options.encryption(EncryptionLevel::On);
        options.trust_cert();
        (options, config.initial)
    }

    pub(crate) async fn select(&self, sql: String) -> Result<Vec<Vec<Value>>> {
        let res = self.conn.lock().await.query(&sql).await?;
        Ok(res.rows)
    }

    pub(crate) async fn execute(&self, sql: String) -> Result<()> {
        self.conn.lock().await.execute(&sql).await?;
        Ok(())
    }

    pub(crate) async fn transaction(&self, sqls: Vec<String>) -> Result<()> {
        self.conn.lock().await.execute(&sqls.join("")).await?;
        Ok(())
    }

    pub(crate) async fn query(&self, sql: String) -> Result<Query> {
        let query = self.conn.lock().await.query(&sql).await?;
        Ok(query)
    }

    // TODO: Consider opening a new connection pool for faster batch insert
    pub(crate) async fn batch_insert(&self, insert: ChunkInsert) -> Result<()> {
        let config = { self.conn.lock().await.config.clone() };
        let mut client = Connection::client(config).await?;
        for sql in insert {
            client.execute(sql, &[]).await?;
        }
        Ok(())
    }
}

type MsSqlError = tiberius::error::Error;
type MsSqlConnectConfig = (Config, Option<String>); // config, initial_sql

#[derive(Debug)]
struct Connection {
    config: MsSqlConnectConfig,
    client: Client<Compat<TcpStream>>,
}

impl Connection {
    async fn connect(config: MsSqlConnectConfig) -> Result<Self, MsSqlError> {
        let client = Self::client(config.clone()).await?;
        Ok(Self { config, client })
    }

    async fn client(
        (config, initial): MsSqlConnectConfig,
    ) -> Result<Client<Compat<TcpStream>>, MsSqlError> {
        let stream = TcpStream::connect(config.get_addr()).await?;
        stream.set_nodelay(true)?;
        let mut client = Client::connect(config, stream.compat_write()).await?;
        if let Some(sql) = initial {
            client.execute(sql, &[]).await?;
        }
        Ok(client)
    }

    async fn to_query(now: Instant, mut query: QueryStream<'_>) -> Result<Query, MsSqlError> {
        let columns = query.columns().await?.unwrap_or_default();
        let columns: Vec<QueryColumn> = columns
            .iter()
            .map(|col| QueryColumn {
                name: col.name().to_string(),
                datatype: column_datatype(col.column_type()),
            })
            .collect::<Vec<_>>();
        let rows = query.into_first_result().await?;
        let duration = now.elapsed().as_millis() as u32;
        let mut rows_value = Vec::with_capacity(rows.len());
        for row in rows {
            let mut r = Vec::with_capacity(row.len());
            for (i, (_, cell)) in row.cells().enumerate() {
                r.push(decode_value(cell, &row, i));
            }
            rows_value.push(r);
        }
        Ok(Query {
            columns,
            rows: rows_value,
            // TODO: Query was called directly so affected rows count is unavailable; this should be fixable
            rows_affected: None,
            duration,
        })
    }

    async fn try_reconnect(&mut self, err: &MsSqlError) -> Result<(), MsSqlError> {
        if matches!(err, MsSqlError::Io { .. } | MsSqlError::Protocol { .. }) {
            self.client = Self::client(self.config.clone()).await?;
        }
        Ok(())
    }

    async fn inner_query(&mut self, sql: &str) -> Result<Query, MsSqlError> {
        let now = Instant::now();
        match self.client.simple_query(sql).await {
            Ok(query) => Self::to_query(now, query).await,
            Err(err) => Err(err),
        }
    }
    async fn query(&mut self, sql: &str) -> Result<Query, MsSqlError> {
        match self.inner_query(sql).await {
            Ok(data) => Ok(data),
            Err(err) => {
                self.try_reconnect(&err).await?;
                // self.inner_query(sql).await
                Err(err)
            }
        }
    }

    async fn inner_execute(&mut self, sql: &str) -> Result<(), MsSqlError> {
        // TODO: https://github.com/prisma/tiberius/issues/310
        if sql.to_uppercase().starts_with("CREATE SCHEMA") {
            self.client.simple_query(sql).await?;
        } else {
            self.client.execute(sql, &[]).await?;
        }
        Ok(())
    }
    async fn execute(&mut self, sql: &str) -> Result<(), MsSqlError> {
        match self.inner_execute(sql).await {
            Ok(_) => Ok(()),
            Err(err) => {
                self.try_reconnect(&err).await?;
                // self.inner_execute(sql).await
                Err(err)
            }
        }
    }
}

fn decode_value(cell: &ColumnData<'_>, row: &Row, i: usize) -> Value {
    match cell {
        ColumnData::U8(v) => v.map(Value::U8).unwrap_or_default(),
        ColumnData::I16(v) => v.map(Value::I16).unwrap_or_default(),
        ColumnData::I32(v) => v.map(Value::I32).unwrap_or_default(),
        ColumnData::I64(v) => v.map(Value::I64).unwrap_or_default(),
        ColumnData::F32(v) => v.map(Value::F32).unwrap_or_default(),
        ColumnData::F64(v) => v.map(Value::F64).unwrap_or_default(),
        ColumnData::Bit(v) => v.map(Value::Bool).unwrap_or_default(),
        ColumnData::String(v) => v
            .as_ref()
            .map(|v| Value::String(v.to_string()))
            .unwrap_or_default(),
        ColumnData::Guid(v) => v.map(|v| Value::String(v.to_string())).unwrap_or_default(),
        ColumnData::Binary(v) => v
            .as_ref()
            .map(|bytes| Value::from_bytes(bytes.to_vec()))
            .unwrap_or_default(),
        ColumnData::Numeric(v) => v.map(|v| Value::String(v.to_string())).unwrap_or_default(),
        ColumnData::Xml(v) => v
            .as_ref()
            .map(|v| Value::String(v.to_string()))
            .unwrap_or_default(),
        ColumnData::Time(_) => row
            .get::<Time, usize>(i)
            .map(|v| Value::String(v.to_string()))
            .unwrap_or_default(),
        ColumnData::Date(_) => row
            .get::<Date, usize>(i)
            .map(|v| Value::String(v.to_string()))
            .unwrap_or_default(),
        ColumnData::DateTime(_) | ColumnData::DateTime2(_) | ColumnData::SmallDateTime(_) => row
            .get::<PrimitiveDateTime, usize>(i)
            .map(|v| Value::String(v.to_string()))
            .unwrap_or_default(),
        ColumnData::DateTimeOffset(_) => row
            .get::<OffsetDateTime, usize>(i)
            .map(|v| Value::String(v.to_string()))
            .unwrap_or_default(),
    }
}

fn column_datatype(col: ColumnType) -> String {
    match col {
        ColumnType::Null => "null",
        ColumnType::Bit | ColumnType::Bitn => "bit",
        ColumnType::Intn => "int",
        ColumnType::Int1 => "int1",
        ColumnType::Int2 => "int2",
        ColumnType::Int4 => "int4",
        ColumnType::Int8 => "int8",
        ColumnType::Floatn => "float",
        ColumnType::Float4 => "float4",
        ColumnType::Float8 => "float8",
        ColumnType::Daten => "date",
        ColumnType::Timen => "time",
        ColumnType::Datetime | ColumnType::Datetimen => "datetime",
        ColumnType::Datetime2 => "datetime2",
        ColumnType::Datetime4 => "datetime4",
        ColumnType::DatetimeOffsetn => "datetime_offset",
        ColumnType::Money => "money",
        ColumnType::Money4 => "money4",
        ColumnType::Guid => "guid",
        ColumnType::Decimaln => "decimal",
        ColumnType::Numericn => "numeric",
        ColumnType::NChar | ColumnType::BigChar => "char",
        ColumnType::Xml => "xml",
        ColumnType::Udt => "udt",
        ColumnType::Text | ColumnType::NText => "text",
        ColumnType::Image => "image",
        ColumnType::BigBinary | ColumnType::BigVarBin => "binary",
        ColumnType::BigVarChar | ColumnType::NVarchar => "varchar",
        ColumnType::SSVariant => "variant",
    }
    .to_string()
}
