use query::{Query, QueryColumn, QueryValueExt, Value};
use reqwest::Client;
use serde::Deserialize;
use serde_json::Value as JsonValue;
use std::time::Instant;
use url::Url;

type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("HTTP: {message}", message = reqwest::format_http_error(.0))]
    Http(#[from] reqwest::Error),
    #[error("URL error: {0}\n'{1}'")]
    Url(url::ParseError, String),
    #[error("Response: {0}")]
    Message(String),
}

#[derive(Debug, Clone)]
pub struct Connection {
    client: Client,
    url: Url,
    api_token: String,
}

impl Connection {
    pub fn new(account_id: String, api_token: String) -> Result<Self> {
        let url = format!(
            "https://api.cloudflare.com/client/v4/accounts/{account_id}/analytics_engine/sql"
        );
        let url = url
            .parse::<url::Url>()
            .map_err(|err| Error::Url(err, url))?;
        Ok(Self {
            client: Client::new(),
            url,
            api_token,
        })
    }

    pub async fn query(&self, sql: String) -> Result<Query> {
        let now = Instant::now();

        let res = self
            .client
            .post(self.url.clone())
            .bearer_auth(&self.api_token)
            .body(sql)
            .send()
            .await?;

        if !res.status().is_success() {
            let status = res.status();
            let text = res.text().await?;
            return Err(Error::Message(format!("HTTP Status: {}, {}", status, text)));
        }

        let response = res.json::<Response>().await?;
        let duration = now.elapsed().as_millis() as u32;

        let columns = response
            .meta
            .into_iter()
            .map(|meta| QueryColumn {
                name: meta.name,
                datatype: meta.r#type,
            })
            .collect::<Vec<_>>();

        let mut rows = Vec::with_capacity(response.data.len());
        for mut map in response.data {
            let mut row = Vec::with_capacity(columns.len());
            for col in &columns {
                let value = map
                    .remove(&col.name)
                    .ok_or_else(|| Error::Message(format!("Missing column: {}", col.name)))?;
                row.push(decode_value(value)?);
            }
            rows.push(row);
        }

        Ok(Query {
            columns,
            rows,
            rows_affected: None,
            duration,
        })
    }
}

#[derive(Deserialize, Debug)]
struct Response {
    meta: Vec<MetaColumn>,
    data: Vec<serde_json::Map<String, JsonValue>>,
}

#[derive(Deserialize, Debug)]
struct MetaColumn {
    name: String,
    r#type: String,
}

#[inline]
fn decode_value(v: JsonValue) -> Result<Value> {
    let value = match v {
        JsonValue::Null => Value::Null,
        JsonValue::Bool(v) => Value::Bool(v),
        JsonValue::String(v) => Value::String(v),
        JsonValue::Number(v) => Value::from_json_number(v),
        JsonValue::Array(_) => return Err(Error::Message("Unsupported 'array' value.".into())),
        JsonValue::Object(_) => return Err(Error::Message("Unsupported 'object' value.".into())),
    };
    Ok(value)
}
