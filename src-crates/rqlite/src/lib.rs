use query::{Query, QueryColumn, QueryValueExt, Value};
use reqwest::{Client, ClientBuilder, Proxy, Response};
use serde::{Deserialize, de::DeserializeOwned};
use std::sync::Arc;
mod config;
pub use config::{Auth, Config, Protocol};
use serde_json::Value as JsonValue;

type Result<T, E = Error> = std::result::Result<T, E>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("HTTP: {message}", message = reqwest::format_http_error(.0))]
    Http(#[from] reqwest::Error),
    #[error("URL error: {0}")]
    Url(#[from] url::ParseError),
    #[error("Response: {0}")]
    Message(String),
}

#[derive(Clone, Debug)]
pub struct Connection {
    url: Arc<config::DatabaseUrl>,
    client: Client,
}

impl Connection {
    pub fn open_with(config: Config) -> Result<Self> {
        let url = Arc::new(config.url()?);
        let mut builder = ClientBuilder::new()
            .danger_accept_invalid_certs(config.allow_invalid_certs)
            .user_agent("Dataflare");
        if let Some(proxy) = config.proxy {
            builder = builder.proxy(Proxy::all(proxy.into_http_connector())?);
        }
        let client = builder.build()?;
        Ok(Self { url, client })
    }

    async fn de<T: DeserializeOwned>(res: Response) -> Result<T> {
        if !res.status().is_success() {
            let status = res.status();
            let text = res.text().await?;
            let msg = if text.is_empty() {
                format!("HTTP Status: {}", status)
            } else {
                format!("HTTP Status: {}, Message: {text}", status)
            };
            return Err(Error::Message(msg));
        }
        Ok(res.json::<T>().await?)
    }

    pub async fn select(&self, sql: &str) -> Result<Vec<Vec<Value>>> {
        let res = self
            .client
            .post(self.url.select.clone())
            .json(&[sql])
            .send()
            .await?;
        let result = Self::de::<RqliteBody>(res).await?.ok_result()?;
        let result = result.values.unwrap_or_default();
        let mut rows = Vec::with_capacity(result.len());
        for row in result {
            let mut r = Vec::with_capacity(row.len());
            for val in row {
                r.push(decode_value(val)?);
            }
            rows.push(r);
        }
        Ok(rows)
    }

    pub async fn execute(&self, sql: &str) -> Result<()> {
        let res = self
            .client
            .post(self.url.execute.clone())
            .json(&[sql])
            .send()
            .await?;
        Self::de::<RqliteBody>(res).await?.ok_result()?;
        Ok(())
    }

    pub async fn transaction(&self, sqls: Vec<String>) -> Result<()> {
        let res = self
            .client
            .post(self.url.transaction.clone())
            .json(&sqls)
            .send()
            .await?;
        let body = Self::de::<RqliteBody>(res).await?;
        for r in body.results {
            if let Some(msg) = r.error {
                return Err(Error::Message(msg));
            }
        }
        Ok(())
    }

    pub async fn query(&self, sql: &str) -> Result<Query> {
        let res = self
            .client
            .post(self.url.query.clone())
            .json(&[sql])
            .send()
            .await?;
        let result = Self::de::<RqliteBody>(res).await?.ok_result()?;
        let c = result.columns.unwrap_or_default();
        let t = result.types.unwrap_or_default();
        let v = result.values.unwrap_or_default();

        let columns = c
            .into_iter()
            .zip(t)
            .map(|(name, datatype)| QueryColumn { name, datatype })
            .collect::<Vec<_>>();

        let mut rows = Vec::with_capacity(v.len());
        for row in v {
            let mut r = Vec::with_capacity(row.len());
            for val in row {
                r.push(decode_value(val)?);
            }
            rows.push(r);
        }

        Ok(Query {
            columns,
            rows,
            rows_affected: result.rows_affected,
            duration: (result.time.unwrap_or(0.) * 1000.) as u32,
        })
    }

    pub async fn status(&self) -> Result<RqliteStatus> {
        let res = self.client.get(self.url.status.clone()).send().await?;
        let status = Self::de::<RqliteStatus>(res).await?;
        Ok(status)
    }
}

#[derive(Debug, Deserialize)]
struct RqliteBody {
    results: Vec<RqliteResult>,
}

impl RqliteBody {
    // Get the single successful result (there must be exactly one result)
    fn ok_result(mut self) -> Result<RqliteResult> {
        let rst = self
            .results
            .pop()
            .ok_or_else(|| Error::Message("No results".into()))?;
        if let Some(err) = &rst.error {
            return Err(Error::Message(err.clone()));
        }
        Ok(rst)
    }
}

#[derive(Debug, Deserialize)]
pub struct RqliteResult {
    // Error
    error: Option<String>,
    // Select
    columns: Option<Vec<String>>,
    types: Option<Vec<String>>,
    values: Option<Vec<Vec<serde_json::Value>>>,
    // Execute
    rows_affected: Option<u64>,
    // Time
    time: Option<f32>,
}

#[inline]
fn decode_value(v: JsonValue) -> Result<Value> {
    let value = match v {
        JsonValue::Null => Value::Null,
        JsonValue::Bool(v) => Value::Bool(v),
        JsonValue::String(v) => Value::String(v),
        JsonValue::Number(v) => Value::from_json_number(v),
        JsonValue::Array(v) => {
            Value::from_json_bytes(v).map_err(|_| Error::Message("Invalid 'blob' value.".into()))?
        }
        JsonValue::Object(_) => return Err(Error::Message("Unsupported 'object' value.".into())),
    };
    Ok(value)
}

#[derive(Debug, Deserialize)]
pub struct RqliteStatus {
    build: Build,
    store: Store,
}
#[derive(Debug, Deserialize)]
pub struct Build {
    version: String,
}
#[derive(Debug, Deserialize)]
pub struct Store {
    sqlite3: Sqlite3,
}

#[derive(Debug, Deserialize)]
pub struct Sqlite3 {
    version: String,
}

impl RqliteStatus {
    pub fn rqlite_version(&self) -> &str {
        &self.build.version
    }
    pub fn sqlite_version(&self) -> &str {
        &self.store.sqlite3.version
    }
}
