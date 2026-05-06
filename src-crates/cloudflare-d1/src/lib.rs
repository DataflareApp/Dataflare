use query::{Query, QueryColumn, QueryValueExt, Value};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
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

// API: https://developers.cloudflare.com/api/operations/cloudflare-d1-raw-database-query

impl Connection {
    pub fn open(
        account_id: String,
        database_id: String,
        api_token: String,
        api_origin: Option<&str>,
    ) -> Result<Self> {
        let origin = api_origin.unwrap_or("https://api.cloudflare.com");
        let url = format!("{origin}/client/v4/accounts/{account_id}/d1/database/{database_id}/raw");
        let url = url
            .parse::<url::Url>()
            .map_err(|err| Error::Url(err, url))?;
        Ok(Self {
            client: Client::new(),
            url,
            api_token,
        })
    }

    async fn send(&self, sql: String) -> Result<QueryResult> {
        let body = Params { sql };
        let res = self
            .client
            .post(self.url.clone())
            .bearer_auth(&self.api_token)
            .json(&body)
            .send()
            .await?;

        // Request failed
        if !res.status().is_success() {
            let status = res.status();
            let mut res = res.json::<Failure>().await?;
            let msg = match res.errors.pop() {
                Some(err) => {
                    format!(
                        "HTTP Status: {}, Code: {}, Message: {}",
                        status, err.code, err.message
                    )
                }
                None => {
                    format!("HTTP Status: {}", status)
                }
            };
            return Err(Error::Message(msg));
        }

        // Query succeeded
        let mut rsts = res.json::<Data>().await?.result;
        match rsts.pop() {
            Some(rst) => Ok(rst),
            None => Err(Error::Message("No results".into())),
        }
    }

    pub async fn select(&self, sql: String) -> Result<Vec<Vec<Value>>> {
        let query = self.send(sql).await?;

        let mut rows_values = Vec::with_capacity(query.results.rows.len());
        for row in query.results.rows {
            let mut row_values = Vec::with_capacity(row.len());
            for v in row {
                row_values.push(decode_value(v)?);
            }
            rows_values.push(row_values);
        }

        Ok(rows_values)
    }

    pub async fn execute(&self, sql: String) -> Result<()> {
        self.send(sql).await?;
        Ok(())
    }

    pub async fn query(&self, sql: String) -> Result<Query> {
        let query = self.send(sql).await?;

        let columns = query
            .results
            .columns
            .into_iter()
            .map(|name| QueryColumn {
                name,
                // TODO: D1 does not yet support returning decltype
                datatype: String::default(),
            })
            .collect::<Vec<_>>();

        let mut rows_values = Vec::with_capacity(query.results.rows.len());
        for row in query.results.rows {
            let mut row_values = Vec::with_capacity(row.len());
            for v in row {
                row_values.push(decode_value(v)?);
            }
            rows_values.push(row_values);
        }

        Ok(Query {
            columns,
            rows: rows_values,
            rows_affected: Some(query.meta.changes),
            duration: query.meta.duration.round() as u32,
        })
    }
}

#[derive(Serialize, Debug)]
struct Params {
    sql: String,
}

#[derive(Deserialize, Debug)]
struct Data {
    result: Vec<QueryResult>,
}

#[derive(Deserialize, Debug)]
struct QueryResult {
    results: Results,
    meta: Meta,
}

#[derive(Deserialize, Debug)]
struct Results {
    columns: Vec<String>,
    rows: Vec<Vec<serde_json::Value>>,
}

#[derive(Deserialize, Debug)]
struct Meta {
    changes: u64,
    duration: f32,
}

#[derive(Debug, Deserialize)]
struct Failure {
    errors: Vec<Message>,
}

#[derive(Debug, Deserialize)]
struct Message {
    code: i32,
    message: String,
}

#[inline]
fn decode_value(v: JsonValue) -> Result<Value> {
    let value = match v {
        JsonValue::Null => Value::Null,
        JsonValue::Bool(v) => Value::Bool(v),
        JsonValue::String(v) => Value::String(v),
        JsonValue::Number(v) => Value::from_json_number(v),
        JsonValue::Array(v) => {
            Value::from_json_bytes(v).map_err(|_| Error::Message("Invalid blob value.".into()))?
        }
        JsonValue::Object(_) => return Err(Error::Message("Unsupported 'object' value.".into())),
    };
    Ok(value)
}
