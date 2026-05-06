use crate::command::{Command, CommandOutput};
use crate::{
    Cursor, GenericValue, Key, Keys, KvDatabase, KvDatabaseError, KvInput, KvOutput, NameSpace,
    RedisData, Result, async_trait,
};
use connection_config::RedisConfig;
use proxy::{Proxy, ProxyConfig, ProxyHandler};
use redis_rs::aio::ConnectionManagerConfig;
use redis_rs::io::tcp::TcpSettings;
use redis_rs::streams::StreamRangeReply;
use redis_rs::{
    Client, ConnectionAddr, ProtocolVersion, RedisConnectionInfo, Value, aio::ConnectionManager,
    cmd, pipe,
};
use redis_rs::{ClientTlsConfig, IntoConnectionInfo, TlsCertificates};
use serde::{Deserialize, Serialize};
use std::fmt::Debug;
use std::sync::Arc;
use std::time::Duration;

pub struct Redis {
    conn: ConnectionManager,
    _proxy_handler: Option<Arc<ProxyHandler>>,
}

impl Debug for Redis {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Redis")
            .field("conn", &"ConnectionManager")
            .finish()
    }
}

impl Redis {
    pub async fn new(config: RedisConfig) -> Result<Self> {
        let (host, port, proxy_handler) = Self::make_proxy(
            (config.host, "localhost"),
            (config.port, 6379),
            config.proxy,
        )
        .await?;

        let mut redis = RedisConnectionInfo::default()
            .set_db(0)
            .set_protocol(ProtocolVersion::RESP3)
            .set_skip_set_lib_name();
        if let Some(username) = &config.username {
            redis = redis.set_username(username);
        }
        if let Some(password) = &config.password {
            redis = redis.set_password(password);
        }

        let tcp = TcpSettings::default().set_nodelay(true);

        let client = match config.tls.enabled {
            false => {
                let info = ConnectionAddr::Tcp(host, port)
                    .into_connection_info()
                    // SAFE
                    .unwrap()
                    .set_redis_settings(redis)
                    .set_tcp_settings(tcp);
                Client::open(info)
            }
            true => {
                let info = ConnectionAddr::TcpTls {
                    host,
                    port,
                    insecure: config.tls.insecure,
                    tls_params: None,
                }
                .into_connection_info()
                // SAFE
                .unwrap()
                .set_redis_settings(redis)
                .set_tcp_settings(tcp);
                let client_tls = match (config.tls.config.cert, config.tls.config.key) {
                    (Some(cert), Some(key)) => Some(ClientTlsConfig {
                        client_cert: cert.into_bytes(),
                        client_key: key.into_bytes(),
                    }),
                    (None, None) => None,
                    _ => {
                        return Err(KvDatabaseError::Custom(
                            "TLS certificate and key must be provided at the same time".into(),
                        ));
                    }
                };
                Self::init_tls_provider()?;
                let certs = TlsCertificates {
                    client_tls,
                    root_cert: config.tls.config.ca.map(|v| v.into_bytes()),
                };
                Client::build_with_tls(info, certs)
            }
        }?;
        let config = ConnectionManagerConfig::new()
            .set_connection_timeout(Some(Duration::from_secs(30)))
            .set_number_of_retries(0);
        let mut conn = ConnectionManager::new_with_config(client, config).await?;

        cmd("CLIENT")
            .arg("SETNAME")
            .arg("Dataflare")
            .query_async::<()>(&mut conn)
            .await?;

        Ok(Self {
            conn,
            _proxy_handler: proxy_handler.map(Arc::new),
        })
    }

    async fn make_proxy(
        (host, default_host): (Option<String>, &'static str),
        (port, default_port): (Option<u16>, u16),
        proxy: Option<ProxyConfig>,
    ) -> Result<(String, u16, Option<ProxyHandler>)> {
        let host = host.unwrap_or(default_host.to_string());
        let port = port.unwrap_or(default_port);
        let rst = match proxy {
            Some(p) => {
                let (addr, handler) = Proxy::new(host, port, p).listen().await?;
                (addr.ip().to_string(), addr.port(), Some(handler))
            }
            None => (host, port, None),
        };
        Ok(rst)
    }

    fn init_tls_provider() -> Result<()> {
        if rustls::crypto::CryptoProvider::get_default().is_none() {
            rustls::crypto::aws_lc_rs::default_provider()
                .install_default()
                .map_err(|_| {
                    KvDatabaseError::Custom("Failed to install rustls crypto provider".into())
                })?;
        }
        Ok(())
    }
}

#[async_trait]
impl KvDatabase for Redis {
    async fn namespaces(&self) -> Result<Vec<NameSpace>> {
        let mut conn = self.conn.clone();
        let items = cmd("CONFIG")
            .arg("GET")
            .arg("databases")
            .query_async::<Vec<((), usize)>>(&mut conn)
            .await?;
        let count = match items.first() {
            Some((_, count)) => (*count).max(1),
            // For services like Redis Cloud, the CONFIG command may be disabled
            // If the database count cannot be retrieved, default to 16 databases
            None => 16,
        };
        let items = (0..count)
            .map(|n| NameSpace::from_id(n.to_string()))
            .collect::<Vec<_>>();
        Ok(items)
    }

    async fn keys(
        &self,
        namespace: String,
        cursor: Option<Cursor>,
        mut limit: usize,
        search: Option<String>,
    ) -> Result<Keys> {
        // When search has a value, limit must not be too small, otherwise results may not be found
        if search.is_some() {
            limit = limit.max(1000);
        }
        let mut conn = self.conn.clone();
        let cursor = cursor.map(|s| s.number()).transpose()?.unwrap_or(0);

        let mut pipe = pipe();
        pipe.cmd("SELECT")
            .arg(namespace)
            .cmd("SCAN")
            .arg(cursor)
            .arg("COUNT")
            .arg(limit);
        if let Some(search) = search {
            pipe.arg("MATCH").arg(search);
        }

        let (_, (cursor, list)) = pipe
            .query_async::<((), (u64, Vec<Vec<u8>>))>(&mut conn)
            .await?;
        let keys = list.into_iter().map(Key::try_string).collect::<Vec<_>>();
        Ok(Keys {
            keys,
            cursor: if cursor == 0 {
                None
            } else {
                Some(Cursor::Number(cursor))
            },
        })
    }

    async fn get(&self, namespace: String, key: Key) -> Result<KvOutput> {
        let mut conn = self.conn.clone();
        let key = key.into_bytes()?;

        let (_, type_, ttl, memory_usage): ((), String, i64, Option<i64>) = pipe()
            .cmd("SELECT")
            .arg(&namespace)
            .key_type(&key)
            .ttl(&key)
            .cmd("MEMORY")
            .arg("USAGE")
            .arg(&key)
            .query_async(&mut conn)
            .await?;

        if &type_ == "none" || ttl == -2 {
            return Err(KvDatabaseError::KeyNotExist);
        }

        let mut pipe = pipe();
        pipe.cmd("SELECT").arg(namespace);
        let val = match type_.as_str() {
            "string" => {
                pipe.get(&key);
                let (_, val) = pipe.query_async::<((), String)>(&mut conn).await?;
                RedisValue::String(val)
            }
            "list" => {
                pipe.lrange(&key, 0, -1);
                let (_, val) = pipe.query_async::<((), Vec<String>)>(&mut conn).await?;
                RedisValue::List(val)
            }
            "set" => {
                pipe.smembers(&key);
                let (_, val) = pipe.query_async::<((), Vec<String>)>(&mut conn).await?;
                RedisValue::Set(val)
            }
            "zset" => {
                pipe.zrange_withscores(&key, 0, -1);
                let (_, val) = pipe
                    .query_async::<((), Vec<(String, String)>)>(&mut conn)
                    .await?;
                let items = val
                    .into_iter()
                    .map(|(k, v)| RedisZsetEntry { key: k, score: v })
                    .collect::<Vec<_>>();
                RedisValue::Zset(items)
            }
            "hash" => {
                pipe.hgetall(&key);
                let (_, val) = pipe
                    .query_async::<((), Vec<(String, String)>)>(&mut conn)
                    .await?;
                let items = val.into_iter().map(RedisEntry::from).collect::<Vec<_>>();
                RedisValue::Hash(items)
            }
            "stream" => {
                pipe.xrange(&key, "-", "+");
                let (_, val) = pipe
                    .query_async::<((), StreamRangeReply)>(&mut conn)
                    .await?;
                let mut items = Vec::with_capacity(val.ids.len());
                for entry in val.ids {
                    let mut fields = Vec::with_capacity(entry.map.len());
                    for (k, v) in entry.map {
                        let e = RedisEntry::from((k, simple_value_to_string(RawValue::from(v))?));
                        fields.push(e);
                    }
                    items.push(RedisStream {
                        id: entry.id,
                        fields,
                    });
                }
                RedisValue::Stream(items)
            }
            "ReJSON-RL" => {
                pipe.cmd("JSON.GET")
                    .arg(&key)
                    .arg("INDENT")
                    .arg("\t")
                    .arg("NEWLINE")
                    .arg("\n")
                    .arg("SPACE")
                    .arg(" ")
                    .arg("$");
                let (_, val) = pipe.query_async::<((), String)>(&mut conn).await?;
                RedisValue::Json(val)
            }
            "vectorset" => {
                return Err(KvDatabaseError::Custom(
                    "Unimplemented vectorset type".into(),
                ));
            }
            t => return Err(KvDatabaseError::Custom(format!("Unknown type: {t}"))),
        };

        Ok(KvOutput::empty()
            .value(GenericValue::Redis(val))
            .redis(RedisData {
                ttl: if ttl == -1 { None } else { Some(ttl) },
                r#type: type_,
                memory_usage: memory_usage.unwrap_or(0) as usize,
            }))
    }

    async fn get_content(&self, _namespace: String, _key: Key) -> Result<GenericValue> {
        Err(KvDatabaseError::NoSupportedGetContent)
    }

    async fn download_content(&self, _namespace: String, _key: Key, _path: String) -> Result<()> {
        Err(KvDatabaseError::NoSupportedDownloadContent)
    }

    async fn set(&self, _namespace: String, _key: Key, _value: KvInput) -> Result<()> {
        // let key = key.into_bytes()?;
        // let mut conn = self.conn.clone();
        // let mut exp_opts = SetOptions::default().get(false);
        // if let Some(redis) = value.redis {
        //     if let Some(ttl) = redis.ttl {
        //         if ttl > -1 {
        //             exp_opts = exp_opts.with_expiration(SetExpiry::EX(ttl as u64));
        //         }
        //     }
        // }
        // let mut pipe = pipe();
        // pipe.cmd("SELECT").arg(namespace);
        // let value = value.value.into_redis_value().await?;
        // match value {
        //     RedisValue::String(v) => {
        //         pipe.cmd("SET").arg(&key).arg(v).arg(exp_opts);
        //     }
        //     RedisValue::List(v) => todo!(),
        //     RedisValue::Set(v) => todo!(),
        //     RedisValue::Zset(v) => todo!(),
        //     RedisValue::Hash(v) => todo!(),
        //     RedisValue::Stream(v) => todo!(),
        //     RedisValue::Json(v) => {
        //         pipe.cmd("JSON.SET").arg(&key).arg("$").arg(v);
        //     },
        // }
        // let _: () = pipe.query_async(&mut conn).await?;
        // Ok(())
        todo!()
    }

    async fn delete(&self, namespace: String, key: Key) -> Result<()> {
        let mut conn = self.conn.clone();
        let mut pipe = pipe();
        pipe.cmd("SELECT").arg(namespace).del(key.into_bytes()?);
        let _: () = pipe.query_async(&mut conn).await?;
        Ok(())
    }

    // TODO: ReadOnly
    async fn run_command(
        &self,
        namespace: String,
        command: String,
        _readonly: bool,
    ) -> Result<CommandOutput> {
        let mut conn = self.conn.clone();
        let items = Command::parse_raw(&command)?;

        // Prevent users from using the SELECT command
        if &items[0].to_uppercase() == "SELECT" {
            return Err(KvDatabaseError::Custom(
                "The 'SELECT' command has been disabled, please select directly from the database list.".into(),
            ));
        }

        let mut pipe = pipe();
        pipe.cmd("SELECT").arg(namespace);
        pipe.cmd(&items[0]);
        for item in &items[1..] {
            pipe.arg(item);
        }
        let (_, val): ((), Value) = pipe.query_async(&mut conn).await?;
        Ok(command_output_from_value(val)?)
    }
}

// TODO: Bytes ??? into_redis_value also needs to change
// TODO: Stream internally uses a HashMap causing inconsistent ordering
// TODO: Zset should not sort by score
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase", content = "value")]
pub enum RedisValue {
    String(String),
    List(Vec<String>),
    Set(Vec<String>),
    Zset(Vec<RedisZsetEntry>),
    Hash(Vec<RedisEntry>),
    Stream(Vec<RedisStream>),
    Json(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisZsetEntry {
    pub key: String,
    pub score: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisStream {
    pub id: String,
    pub fields: Vec<RedisEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisEntry {
    pub key: String,
    pub value: String,
}

impl<K: ToString, V: ToString> From<(K, V)> for RedisEntry {
    fn from((key, value): (K, V)) -> Self {
        Self {
            key: key.to_string(),
            value: value.to_string(),
        }
    }
}

fn command_output_from_value(value: Value) -> Result<CommandOutput> {
    match value {
        Value::Okay => Ok(CommandOutput::Done),
        value => {
            let raw = RawValue::from(value);
            let debug = raw.to_debug_string();
            let response = RedisResponse::from_value(raw)?;
            Ok(CommandOutput::RedisResponse { response, debug })
        }
    }
}

fn simple_value_to_string(value: RawValue) -> Result<String> {
    let s = match value {
        RawValue::Int(v) => v.to_string(),
        RawValue::String(v) => v,
        RawValue::Double(v) => v.to_string(),
        RawValue::Boolean(v) => v.to_string(),
        RawValue::BigNumber(v) => v,
        RawValue::Nil
        | RawValue::Ok
        | RawValue::List(..)
        | RawValue::Map(..)
        | RawValue::Set(..)
        | RawValue::Attribute { .. }
        | RawValue::VerbatimString { .. }
        | RawValue::Push { .. }
        | RawValue::ServerError(..) => {
            let msg = format!("ERROR: Invalid subtype: \n{}", value.to_debug_string());
            return Err(KvDatabaseError::Custom(msg));
        }
    };
    Ok(s)
}

fn possible_array_value_to_string(array: &mut Vec<String>, value: RawValue) -> Result<()> {
    match value {
        RawValue::Int(v) => array.push(v.to_string()),
        RawValue::String(v) => array.push(v),
        RawValue::Double(v) => array.push(v.to_string()),
        RawValue::Boolean(v) => array.push(v.to_string()),
        RawValue::BigNumber(v) => array.push(v),
        RawValue::List(v) => {
            for item in v {
                possible_array_value_to_string(array, item)?;
            }
        }
        RawValue::Map(v) => {
            for (key, value) in v {
                possible_array_value_to_string(array, key)?;
                possible_array_value_to_string(array, value)?;
            }
        }
        RawValue::Nil
        | RawValue::Ok
        | RawValue::Set(..)
        | RawValue::Attribute { .. }
        | RawValue::VerbatimString { .. }
        | RawValue::Push { .. }
        | RawValue::ServerError(..) => {
            let msg = format!("ERROR: Invalid subtype: \n{}", value.to_debug_string());
            return Err(KvDatabaseError::Custom(msg));
        }
    }
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase", content = "value")]
pub enum RedisResponse {
    String(String),
    List(Vec<String>),
    Map(Vec<RedisEntry>),
}

impl RedisResponse {
    fn string<S: ToString>(value: S) -> Self {
        RedisResponse::String(value.to_string())
    }

    fn from_value(value: RawValue) -> Result<Self> {
        let table = match value {
            RawValue::Ok => Self::string("(Ok)"),
            RawValue::Nil => Self::string("(NIL)"),
            RawValue::Int(v) => Self::string(v),
            RawValue::String(v) => Self::String(v),
            RawValue::Double(v) => Self::string(v),
            RawValue::Boolean(v) => Self::string(v),
            RawValue::List(v) => {
                if v.is_empty() {
                    Self::string("(EMPTY ARRAY)")
                } else {
                    let mut items = Vec::with_capacity(v.len());
                    for item in v {
                        possible_array_value_to_string(&mut items, item)?;
                    }
                    Self::List(items)
                }
            }
            RawValue::Set(v) => {
                if v.is_empty() {
                    Self::string("(EMPTY SET)")
                } else {
                    let mut items = Vec::with_capacity(v.len());
                    for item in v {
                        items.push(simple_value_to_string(item)?);
                    }
                    Self::List(items)
                }
            }
            RawValue::Map(v) => {
                if v.is_empty() {
                    Self::string("(EMPTY MAP)")
                } else {
                    let mut items = Vec::with_capacity(v.len());
                    for (key, value) in v {
                        let key = simple_value_to_string(key)?;
                        let mut values = Vec::new();
                        possible_array_value_to_string(&mut values, value)?;
                        items.push(RedisEntry {
                            key,
                            value: values.join("\n"),
                        });
                    }
                    Self::Map(items)
                }
            }
            RawValue::Attribute { data, attributes } => {
                let mut items = Vec::with_capacity(attributes.len() + 1);
                items.push(RedisEntry::from((simple_value_to_string(*data)?, "")));
                if attributes.is_empty() {
                    items.push(RedisEntry::from(("(EMPTY ATTRIBUTES)", "")));
                } else {
                    for (key, value) in attributes {
                        let key = simple_value_to_string(key)?;
                        let value = simple_value_to_string(value)?;
                        items.push(RedisEntry { key, value });
                    }
                }
                Self::Map(items)
            }
            RawValue::VerbatimString { format, text } => Self::List(vec![format, text]),
            RawValue::BigNumber(v) => Self::string(v),
            RawValue::Push { kind, data } => {
                let mut items = Vec::with_capacity(data.len() + 1);
                items.push(kind);
                if data.is_empty() {
                    items.push("(EMPTY PUSH)".to_string());
                } else {
                    for item in data {
                        items.push(simple_value_to_string(item)?);
                    }
                }
                Self::List(items)
            }
            RawValue::ServerError(err) => {
                return Err(KvDatabaseError::Custom(err));
            }
        };
        Ok(table)
    }
}

#[derive(Serialize)]
enum RawValue {
    Ok,
    Nil,
    Int(i64),
    String(String),
    Double(f64),
    Boolean(bool),
    List(Vec<Self>),
    Set(Vec<Self>),
    Map(Vec<(Self, Self)>),
    Attribute {
        data: Box<Self>,
        attributes: Vec<(Self, Self)>,
    },
    VerbatimString {
        format: String,
        text: String,
    },
    BigNumber(String),
    Push {
        kind: String,
        data: Vec<Self>,
    },
    ServerError(String),
}

impl From<Value> for RawValue {
    fn from(value: Value) -> Self {
        match value {
            Value::Okay => Self::Ok,
            Value::Nil => Self::Nil,
            Value::Int(v) => Self::Int(v),
            Value::BulkString(v) => {
                let s = match String::from_utf8(v) {
                    Ok(s) => s,
                    Err(err) => String::from_utf8_lossy(&err.into_bytes()).to_string(),
                };
                Self::String(s)
            }
            Value::SimpleString(s) => Self::String(s),
            Value::Double(v) => Self::Double(v),
            Value::Boolean(v) => Self::Boolean(v),
            Value::Array(v) => Self::List(v.into_iter().map(Self::from).collect()),
            Value::Set(v) => Self::Set(v.into_iter().map(Self::from).collect()),
            Value::Map(v) => Self::Map(
                v.into_iter()
                    .map(|(k, v)| (Self::from(k), Self::from(v)))
                    .collect(),
            ),
            Value::Attribute { data, attributes } => Self::Attribute {
                data: Box::new(Self::from(*data)),
                attributes: attributes
                    .into_iter()
                    .map(|(k, v)| (Self::from(k), Self::from(v)))
                    .collect(),
            },
            Value::VerbatimString { format, text } => Self::VerbatimString {
                format: format.to_string(),
                text,
            },
            Value::BigNumber(v) => Self::BigNumber(v.to_string()),
            Value::Push { kind, data } => Self::Push {
                kind: kind.to_string(),
                data: data.into_iter().map(Self::from).collect(),
            },
            Value::ServerError(err) => Self::ServerError(format!("Error: {:?}", err)),
            v => Self::ServerError(format!("Unsupported Redis Value {:?}", v)),
        }
    }
}

impl RawValue {
    fn to_debug_string(&self) -> String {
        use ron::ser::{PrettyConfig, to_string_pretty};
        let pretty = PrettyConfig::new()
            .separate_tuple_members(true)
            .enumerate_arrays(true);
        to_string_pretty(&self, pretty)
            .unwrap_or_else(|err| return format!("Failed to serialize RawValue: {err:#?}"))
    }
}
