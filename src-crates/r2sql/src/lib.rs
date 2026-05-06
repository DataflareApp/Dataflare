use base64::{Engine, engine::general_purpose::STANDARD as BASE64};
use query::{Query, QueryColumn, QueryValueExt, Value};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::{fmt::Display, time::Instant};
use url::Url;

type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("HTTP: {message}", message = reqwest::format_http_error(.0))]
    Http(#[from] reqwest::Error),
    #[error("URL error: {0}\n'{1}'")]
    Url(url::ParseError, String),
    #[error("{0}")]
    Message(String),
}

#[derive(Debug, Clone)]
pub struct Connection {
    client: Client,
    url: Url,
    api_token: String,
}

impl Connection {
    pub fn new(account_id: String, bucket_name: String, api_token: String) -> Result<Self> {
        let url = format!(
            "https://api.sql.cloudflarestorage.com/api/v1/accounts/{account_id}/r2-sql/query/{bucket_name}"
        );
        let url = url.parse::<Url>().map_err(|err| Error::Url(err, url))?;
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
            .json(&RequestBody { query: &sql })
            .send()
            .await?;

        if !res.status().is_success() {
            let status = res.status();
            let text = res.text().await?;
            let msg = match serde_json::from_str::<ErrorResponse>(&text) {
                Ok(err) => format!("{status}:\n{err}"),
                Err(_) => format!("{status}: {text}"),
            };
            return Err(Error::Message(msg));
        }

        let response = res.json::<ApiResponse>().await?;
        let duration = now.elapsed().as_millis() as u32;

        let result = response.result;

        let columns = result
            .schema
            .iter()
            .map(|f| QueryColumn::new(&f.name, &f.descriptor.datatype.name))
            .collect::<Vec<_>>();

        let mut rows = Vec::with_capacity(result.rows.len());
        for mut map in result.rows {
            let mut row = Vec::with_capacity(columns.len());
            for (i, col) in columns.iter().enumerate() {
                let value = map
                    .remove(&col.name)
                    .ok_or_else(|| Error::Message(format!("Missing column: {}", col.name)))?;
                row.push(decode_value(
                    value,
                    &result.schema[i].descriptor.datatype.name,
                ));
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

#[derive(Serialize)]
struct RequestBody<'a> {
    query: &'a str,
}

#[derive(Deserialize)]
struct ApiResponse {
    result: ApiResult,
}

#[derive(Deserialize)]
struct ErrorResponse {
    errors: Vec<ErrorInfo>,
}

impl Display for ErrorResponse {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        for error in &self.errors {
            writeln!(f, "Code: {}, Message: `{}`", error.code, error.message)?;
        }
        Ok(())
    }
}

#[derive(Deserialize)]
struct ApiResult {
    schema: Vec<SchemaField>,
    rows: Vec<serde_json::Map<String, JsonValue>>,
}

#[derive(Deserialize)]
struct SchemaField {
    name: String,
    descriptor: Descriptor,
}

#[derive(Deserialize)]
struct Descriptor {
    #[serde(rename = "type")]
    datatype: DataType,
}

#[derive(Deserialize)]
struct DataType {
    name: String,
}

#[derive(Deserialize)]
struct ErrorInfo {
    code: i32,
    message: String,
}

fn decode_value(v: JsonValue, datatype: &str) -> Value {
    match v {
        JsonValue::Null => Value::Null,
        JsonValue::Bool(v) => Value::Bool(v),
        JsonValue::String(v) => match datatype {
            "bytes" => match BASE64.decode(&v) {
                Ok(bytes) => Value::from_bytes(bytes),
                Err(_) => Value::String(v),
            },
            _ => Value::String(v),
        },
        JsonValue::Number(v) => Value::from_json_number(v),
        JsonValue::Array(_) | JsonValue::Object(_) => Value::pretty_json(v),
    }
}
