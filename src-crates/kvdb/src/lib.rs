mod cloudflare_kv;
mod command;
mod redis;
mod s3;

pub use crate::command::CommandOutput;
pub(crate) use async_trait::async_trait;
use aws_sdk_s3::primitives::ByteStream;
pub use cloudflare_kv::*;
use connection_config::{CloudflareKvConfig, RedisConfig, S3Config};
pub use redis::*;
pub use s3::*;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap};
use std::fmt::Debug;

pub type Result<T, E = KvDatabaseError> = std::result::Result<T, E>;

#[derive(thiserror::Error, Debug)]
pub enum KvDatabaseError {
    #[error("Error: 'Cursor' should be a '{0}', NOTE: this error should not occur.")]
    Cursor(&'static str),
    #[error(
        "Error: Data type mismatch, expected '{0}' but received '{1}', NOTE: this error should not occur."
    )]
    DataType(&'static str, &'static str),
    #[error(
        "Error: 'get_content' is not supported by this database, NOTE: this error should not occur."
    )]
    NoSupportedGetContent,
    #[error(
        "Error: 'download_content' is not supported by this database, NOTE: this error should not occur."
    )]
    NoSupportedDownloadContent,
    #[error("Key does not exist")]
    KeyNotExist,
    #[error(transparent)]
    Command(#[from] command::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Error: {0}")]
    Redis(#[from] redis_rs::RedisError),
    #[error("HTTP: {message}", message = reqwest::format_http_error(.0))]
    Http(#[from] reqwest::Error),
    #[error("URL error: {0}")]
    Url(#[from] url::ParseError),
    #[error(transparent)]
    Proxy(#[from] proxy::Error),
    #[error("Error: {0}")]
    Custom(String),
    // translation.ts 'connectionReadonlyError'
    #[error("Error: The current connection is 'Read-only' mode")]
    ReadOnly,
}

#[async_trait]
pub trait KvDatabase: Sync + Send + Debug {
    async fn namespaces(&self) -> Result<Vec<NameSpace>> {
        Ok(vec![NameSpace {
            id: "Keys".to_string(),
            title: None,
        }])
    }

    async fn keys(
        &self,
        namespace: String,
        cursor: Option<Cursor>,
        limit: usize,
        search: Option<String>,
    ) -> Result<Keys>;

    async fn get(&self, namespace: String, key: Key) -> Result<KvOutput>;

    async fn get_content(&self, namespace: String, key: Key) -> Result<GenericValue>;

    async fn download_content(&self, namespace: String, key: Key, path: String) -> Result<()>;

    async fn set(&self, namespace: String, key: Key, value: KvInput) -> Result<()>;

    async fn delete(&self, namespace: String, key: Key) -> Result<()>;

    async fn run_command(
        &self,
        namespace: String,
        command: String,
        readonly: bool,
    ) -> Result<CommandOutput>;
}

#[derive(Debug, Deserialize, Serialize)]
pub struct NameSpace {
    pub id: String,
    pub title: Option<String>,
}

impl NameSpace {
    pub fn new(id: String, title: String) -> Self {
        Self {
            id,
            title: Some(title),
        }
    }

    pub fn from_id(id: String) -> Self {
        Self { id, title: None }
    }

    pub fn try_to_first<P>(vec: &mut Vec<Self>, predicate: P)
    where
        P: FnMut(&Self) -> bool,
    {
        if let Some(target_index) = vec.iter().position(predicate) {
            if target_index > 0 {
                let items = &mut vec[0..=target_index];
                items.rotate_right(1);
            }
        }
    }
}

#[derive(Debug, Serialize)]
pub struct Keys {
    pub keys: Vec<Key>,
    pub cursor: Option<Cursor>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase", content = "value")]
pub enum Cursor {
    Number(u64),
    String(String),
}

impl Cursor {
    pub fn number(self) -> Result<u64> {
        match self {
            Self::Number(n) => Ok(n),
            _ => Err(KvDatabaseError::Cursor("Number")),
        }
    }
    pub fn string(self) -> Result<String> {
        match self {
            Self::String(s) => Ok(s),
            _ => Err(KvDatabaseError::Cursor("String")),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase", content = "value")]
pub enum Key {
    String(String),
    Bytes(String),
}

impl Key {
    pub fn try_string(bytes: Vec<u8>) -> Self {
        match String::from_utf8(bytes) {
            Ok(s) => Self::String(s),
            Err(err) => Self::Bytes(format!("0x{}", hex::encode(err.into_bytes()))),
        }
    }

    pub fn into_bytes(self) -> Result<Vec<u8>> {
        match self {
            Self::String(v) => Ok(v.into_bytes()),
            Self::Bytes(v) => {
                let bytes = hex::decode(&v.as_bytes()[2..])
                    .map_err(|_| KvDatabaseError::DataType("Hex Bytes", "Invalid Hex String"))?;
                Ok(bytes)
            }
        }
    }

    pub fn into_string(self) -> Result<String> {
        match self {
            Self::Bytes(_) => Err(KvDatabaseError::DataType("String", "Bytes")),
            Self::String(v) => Ok(v),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KvOutput {
    pub value: Option<GenericValue>,
    pub cloudflare: Option<CloudflareData>,
    pub redis: Option<RedisData>,
    pub s3: Option<S3Data>,
}

impl KvOutput {
    pub fn empty() -> Self {
        Self {
            value: None,
            cloudflare: None,
            redis: None,
            s3: None,
        }
    }
    pub fn value(mut self, value: GenericValue) -> Self {
        self.value = Some(value);
        self
    }
    pub fn cloudflare(mut self, data: CloudflareData) -> Self {
        self.cloudflare = Some(data);
        self
    }
    pub fn redis(mut self, data: RedisData) -> Self {
        self.redis = Some(data);
        self
    }
    pub fn s3(mut self, data: S3Data) -> Self {
        self.s3 = Some(data);
        self
    }
}

// TODO: Inefficient when passing via JSON
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase", content = "value")]
pub enum GenericValue {
    String(String),
    Bytes(Vec<u8>),
    Redis(RedisValue),
}

impl GenericValue {
    pub fn try_string(bytes: Vec<u8>) -> Self {
        match String::from_utf8(bytes) {
            Ok(s) => Self::String(s),
            Err(err) => Self::Bytes(err.into_bytes()),
        }
    }

    pub fn into_bytes(self) -> Result<Vec<u8>> {
        match self {
            Self::Bytes(v) => Ok(v),
            Self::String(v) => Ok(v.into_bytes()),
            Self::Redis(_) => Err(KvDatabaseError::DataType("Bytes|String", "Redis Value")),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KvInput {
    pub value: InputValue,
    pub cloudflare: Option<CloudflareData>,
    pub redis: Option<RedisData>,
    pub s3: Option<S3Data>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase", content = "value")]
pub enum InputValue {
    Generic(GenericValue),
    Path(String),
}

impl InputValue {
    fn utf8_or_base64(bytes: Vec<u8>) -> (String, bool) {
        use base64::prelude::*;
        match String::from_utf8(bytes) {
            Ok(s) => (s, false),
            Err(err) => (
                base64::prelude::BASE64_STANDARD.encode(err.into_bytes()),
                true,
            ),
        }
    }

    pub async fn into_cloudflare_kv_value(self) -> Result<(String, bool)> {
        match self {
            Self::Generic(value) => match value {
                GenericValue::String(v) => Ok((v, false)),
                GenericValue::Bytes(v) => Ok(Self::utf8_or_base64(v)),
                GenericValue::Redis(_) => {
                    Err(KvDatabaseError::DataType("String|Bytes", "Redis Value"))
                }
            },
            Self::Path(path) => {
                let bytes = tokio::fs::read(path).await?;
                Ok(Self::utf8_or_base64(bytes))
            }
        }
    }

    pub async fn into_redis_value(self) -> Result<RedisValue> {
        match self {
            Self::Generic(value) => match value {
                GenericValue::String(_) => Err(KvDatabaseError::DataType("RedisValue", "String")),
                GenericValue::Bytes(_) => Err(KvDatabaseError::DataType("RedisValue", "Bytes")),
                GenericValue::Redis(v) => Ok(v),
            },
            Self::Path(path) => {
                let content = tokio::fs::read_to_string(path).await?;
                Ok(RedisValue::String(content))
            }
        }
    }

    pub async fn into_byte_stream(self) -> Result<ByteStream> {
        match self {
            Self::Generic(value) => value.into_bytes().map(ByteStream::from),
            Self::Path(path) => {
                let stream = ByteStream::from_path(path).await.map_err(|err| {
                    KvDatabaseError::Custom(format!("Read file failed: {}", err.to_string()))
                })?;
                Ok(stream)
            }
        }
    }

    pub fn mime(&self) -> String {
        match self {
            Self::Generic(v) => match v {
                GenericValue::String(_) => "text/plain",
                GenericValue::Bytes(_) => "application/octet-stream",
                GenericValue::Redis(_) => "application/octet-stream",
            }
            .to_string(),
            Self::Path(v) => mime_guess::from_path(v).first_or_octet_stream().to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CloudflareData {
    pub expiration: Option<u64>,
    pub metadata: Option<CloudflareKvMetadata>,
}

pub type CloudflareKvMetadata = serde_json::Map<String, serde_json::Value>;

#[derive(Debug, Serialize, Deserialize)]
pub struct RedisData {
    pub ttl: Option<i64>,
    pub r#type: String,
    pub memory_usage: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct S3Data {
    pub content_length: Option<i64>,
    pub content_type: Option<String>,
    pub metadata: HashMap<String, String>,
    pub raw: BTreeMap<String, Option<String>>,
}

#[derive(Debug)]
pub enum KvDatabaseConfig {
    CloudflareKv(CloudflareKvConfig),
    Redis(RedisConfig),
    S3(S3Config),
}

impl KvDatabaseConfig {
    pub async fn connect(self) -> Result<Box<dyn KvDatabase>> {
        match self {
            Self::CloudflareKv(config) => Ok(Box::new(CloudflareKv::new(config)?)),
            Self::Redis(config) => Ok(Box::new(Redis::new(config).await?)),
            Self::S3(config) => Ok(Box::new(S3::new(config).await?)),
        }
    }

    pub async fn test(self) -> Result<()> {
        let conn = self.connect().await?;
        let list = conn.namespaces().await?;
        if list.is_empty() {
            return Err(KvDatabaseError::Custom("No namespaces found".into()));
        }
        conn.keys(list[0].id.clone(), None, 10, None).await?;
        Ok(())
    }
}
