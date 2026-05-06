mod decode;

use proxy::ProxyConfig;
use query::{Query, QueryColumn};
use reqwest::header::{CONTENT_TYPE, HeaderMap, HeaderValue, InvalidHeaderValue};
use reqwest::{Body, Client, ClientBuilder, Proxy, Response, Url};
use serde::Deserialize;
use serde_json::Value as JsonValue;
use uuid::Uuid;

// TODO:
// 1. Use RowBinaryWithNamesAndTypes format for better performance
// 2. Tinybird's ClickHouse does not support JSONCompactStrings, needs to be changed to JSONStrings; also does not support INFORMATION_SCHEMA.SCHEMATA, DATABASE() etc.

type Result<T, E = Error> = std::result::Result<T, E>;
const DEFAULT_SESSION_TIMEOUT_SECS: u32 = 60 * 10; // 10 minutes

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("HTTP: {message}", message = reqwest::format_http_error(.0))]
    Http(#[from] reqwest::Error),
    #[error("URL error: {0}")]
    Url(#[from] url::ParseError),
    #[error("Invalid Header Value")]
    InvalidHeaderValue(#[from] InvalidHeaderValue),
    #[error("Error: {0}")]
    Exception(String),
    #[error("HTTP response is missing 'Content-Type' header")]
    MissingContentType,
    #[error("Invalid 'Content-Type' header: {0}")]
    InvalidContentType(String),
}

pub struct Config {
    pub https: bool,
    pub host: String,
    pub port: u16,
    pub user: String,
    pub password: String,
    pub database: String,
    pub proxy: Option<ProxyConfig>,
}

#[derive(Debug)]
pub struct Connection {
    client: Client,
    url: Url,
    session: SessionState,
}

#[derive(Debug, Clone)]
struct SessionState {
    id: String,
    initial_database: Option<String>,
    initialized: bool,
    timeout_secs: u32,
}

impl Connection {
    pub fn open_with(
        Config {
            https,
            host,
            port,
            user,
            password,
            database,
            proxy,
        }: Config,
    ) -> Result<Self> {
        let schema = if https { "https" } else { "http" };
        let host = convert_host(&host);
        let url = format!("{schema}://{host}:{port}").parse::<Url>()?;
        let mut headers = HeaderMap::new();
        headers.insert("X-ClickHouse-User", HeaderValue::from_str(&user)?);
        headers.insert("X-ClickHouse-Key", HeaderValue::from_str(&password)?);
        headers.insert(
            "X-ClickHouse-Format",
            HeaderValue::from_static("JSONCompactStrings"),
        );
        let mut builder = ClientBuilder::new()
            .default_headers(headers)
            .user_agent("Dataflare");
        if let Some(proxy) = proxy {
            builder = builder.proxy(Proxy::all(proxy.into_http_connector())?);
        }
        let client = builder.build()?;
        Ok(Self {
            client,
            url,
            session: SessionState {
                id: Uuid::new_v4().to_string(),
                initial_database: normalize_database(database),
                initialized: false,
                timeout_secs: DEFAULT_SESSION_TIMEOUT_SECS,
            },
        })
    }

    pub fn snapshot(&self) -> Self {
        Self {
            client: self.client.clone(),
            url: self.url.clone(),
            session: self.session.clone(),
        }
    }

    pub async fn query(&mut self, sql: String) -> Result<Query> {
        let url = build_request_url(&self.url, &self.session);
        let res = self.client.post(url).body(Body::from(sql)).send().await?;
        if res.status().is_success() {
            self.session.initialized = true;
        }
        if !res.status().is_success() {
            let err = parse_exception(res).await?;
            return Err(Error::Exception(err));
        }
        let val = res
            .headers()
            .get(CONTENT_TYPE)
            .ok_or(Error::MissingContentType)?;

        // This is a query that returns results; success depends on whether the result contains an exception
        if val.as_bytes().starts_with(b"application/json") {
            let duration = parse_duration(&res);
            let query = res.json::<QueryResponse>().await?;
            if let Some(msg) = query.exception {
                return Err(Error::Exception(msg));
            }
            let columns = query
                .meta
                .into_iter()
                .map(|meta| QueryColumn {
                    name: meta.name,
                    datatype: meta.r#type.to_lowercase(),
                })
                .collect::<Vec<_>>();
            let rows = query
                .data
                .into_iter()
                .map(|row| {
                    row.into_iter()
                        .enumerate()
                        .map(|(i, val)| decode::decode_value(val, &columns[i].datatype))
                        .collect::<Vec<_>>()
                })
                .collect::<Vec<_>>();
            return Ok(Query {
                columns,
                rows,
                rows_affected: None,
                duration,
            });
        }

        // This is a statement that executed successfully but returned no results
        if val.as_bytes().starts_with(b"text/plain") {
            return Ok(Query {
                columns: vec![],
                rows: vec![],
                rows_affected: None,
                duration: parse_duration(&res),
            });
        }

        let t = val.to_str().unwrap_or_default().to_string();
        Err(Error::InvalidContentType(t))
    }
}

fn convert_host(host: &str) -> String {
    if host.starts_with('[') {
        return host.into();
    }
    if host.contains(':') {
        return format!("[{}]", host);
    }
    host.into()
}

fn normalize_database(database: String) -> Option<String> {
    if database.trim().is_empty() {
        None
    } else {
        Some(database)
    }
}

fn build_request_url(base_url: &Url, session: &SessionState) -> Url {
    let mut url = base_url.clone();
    let timeout = session.timeout_secs.to_string();
    {
        let mut query = url.query_pairs_mut();
        query.append_pair("session_id", &session.id);
        query.append_pair("session_timeout", &timeout);
        if !session.initialized {
            if let Some(database) = session.initial_database.as_deref() {
                query.append_pair("database", database);
            }
        }
    }
    url
}

#[derive(Debug, Deserialize)]
struct QueryResponse {
    meta: Vec<Meta>,
    data: Vec<Vec<String>>,
    exception: Option<String>,
}

#[derive(Debug, Deserialize)]
struct Meta {
    name: String,
    r#type: String,
}

async fn parse_exception(res: Response) -> Result<String> {
    #[derive(Deserialize)]
    struct ExceptionResponse {
        exception: String,
    }
    let status = res.status();
    let text = res.text().await?;
    if let Ok(ex) = serde_json::from_str::<ExceptionResponse>(&text) {
        return Ok(ex.exception);
    }
    if text.is_empty() {
        Ok(format!("HTTP Status: {}", status))
    } else {
        Ok(format!("HTTP Status: {}, Message: {text}", status))
    }
}

fn parse_duration(res: &Response) -> u32 {
    if let Some(val) = res.headers().get("x-clickhouse-summary") {
        if let Ok(val) = serde_json::from_slice::<JsonValue>(val.as_bytes()) {
            if let Some(val) = val.get("elapsed_ns") {
                if let Some(val) = val.as_str() {
                    if let Ok(val) = val.parse::<f64>() {
                        return (val / 1_000_000.).round() as u32;
                    }
                }
            }
        }
    }
    0
}

#[cfg(test)]
mod tests {
    use super::*;
    use query::Value;

    fn pairs(url: &Url) -> Vec<(String, String)> {
        url.query_pairs()
            .map(|(key, value)| (key.into_owned(), value.into_owned()))
            .collect()
    }

    fn connection() -> Connection {
        Connection::open_with(Config {
            https: false,
            host: "localhost".into(),
            port: 8123,
            user: "default".into(),
            password: "".into(),
            database: "".into(),
            proxy: None,
        })
        .unwrap()
    }

    fn connection_with_db(database: &str) -> Connection {
        Connection::open_with(Config {
            https: false,
            host: "localhost".into(),
            port: 8123,
            user: "default".into(),
            password: "".into(),
            database: database.into(),
            proxy: None,
        })
        .unwrap()
    }

    // ---- unit tests (no DB required) ----

    #[test]
    fn request_url_includes_session_and_database_before_initialization() {
        let url = Url::parse("http://localhost:8123").unwrap();
        let session = SessionState {
            id: "session-id".into(),
            initial_database: Some("analytics".into()),
            initialized: false,
            timeout_secs: DEFAULT_SESSION_TIMEOUT_SECS,
        };

        let pairs = pairs(&build_request_url(&url, &session));

        assert_eq!(
            pairs,
            vec![
                ("session_id".into(), "session-id".into()),
                (
                    "session_timeout".into(),
                    DEFAULT_SESSION_TIMEOUT_SECS.to_string(),
                ),
                ("database".into(), "analytics".into()),
            ]
        );
    }

    #[test]
    fn request_url_omits_database_after_initialization() {
        let url = Url::parse("http://localhost:8123").unwrap();
        let session = SessionState {
            id: "session-id".into(),
            initial_database: Some("analytics".into()),
            initialized: true,
            timeout_secs: DEFAULT_SESSION_TIMEOUT_SECS,
        };

        let pairs = pairs(&build_request_url(&url, &session));

        assert_eq!(
            pairs,
            vec![
                ("session_id".into(), "session-id".into()),
                (
                    "session_timeout".into(),
                    DEFAULT_SESSION_TIMEOUT_SECS.to_string(),
                ),
            ]
        );
    }

    #[test]
    fn open_with_initializes_session_state() {
        let conn = connection_with_db("analytics");
        assert!(!conn.session.id.is_empty());
        assert_eq!(conn.session.initial_database.as_deref(), Some("analytics"));
        assert!(!conn.session.initialized);
        assert_eq!(conn.session.timeout_secs, DEFAULT_SESSION_TIMEOUT_SECS);
    }

    #[test]
    fn open_with_normalizes_empty_database() {
        let conn = connection_with_db("   ");
        assert_eq!(conn.session.initial_database, None);
    }

    #[test]
    fn request_url_omits_database_when_initial_database_is_none() {
        let url = Url::parse("http://localhost:8123").unwrap();
        let session = SessionState {
            id: "session-id".into(),
            initial_database: None,
            initialized: false,
            timeout_secs: DEFAULT_SESSION_TIMEOUT_SECS,
        };

        let pairs = pairs(&build_request_url(&url, &session));

        assert_eq!(
            pairs,
            vec![
                ("session_id".into(), "session-id".into()),
                (
                    "session_timeout".into(),
                    DEFAULT_SESSION_TIMEOUT_SECS.to_string(),
                ),
            ]
        );
    }

    #[test]
    fn test_normalize_database() {
        assert_eq!(normalize_database("".into()), None);
        assert_eq!(normalize_database("   ".into()), None);
        assert_eq!(normalize_database("mydb".into()), Some("mydb".into()));
    }

    // ---- integration tests (requires a running ClickHouse instance) ----

    #[tokio::test]
    async fn query_select_literal() {
        let mut conn = connection();
        let result = conn
            .query("SELECT 1 AS id, 'hello' AS name".into())
            .await
            .unwrap();
        assert_eq!(result.columns.len(), 2);
        assert_eq!(result.columns[0].name, "id");
        assert_eq!(result.columns[1].name, "name");
        assert_eq!(result.rows.len(), 1);
        assert!(result.duration > 0);
    }

    #[tokio::test]
    async fn query_select_all_numeric_types() {
        let mut conn = connection();
        let result = conn
            .query(
                r#"SELECT
                    true                          AS bool_t,
                    false                         AS bool_f,
                    toInt8(127)                   AS i8_val,
                    toUInt8(255)                  AS u8_val,
                    toInt16(32767)                AS i16_val,
                    toUInt16(65535)               AS u16_val,
                    toInt32(2147483647)            AS i32_val,
                    toUInt32(4294967295)           AS u32_val,
                    toInt64(9223372036854775807)   AS i64_val,
                    toUInt64(18446744073709551615) AS u64_val,
                    toFloat32(1.5)                AS f32_val,
                    toFloat64(1.5)                AS f64_val,
                    'hello world'                 AS str_val
                "#
                .into(),
            )
            .await
            .unwrap();

        assert_eq!(result.rows.len(), 1);
        let row = &result.rows[0];
        assert_eq!(row[0], Value::Bool(true));
        assert_eq!(row[1], Value::Bool(false));
        assert_eq!(row[2], Value::I8(127));
        assert_eq!(row[3], Value::U8(255));
        assert_eq!(row[4], Value::I16(32767));
        assert_eq!(row[5], Value::U16(65535));
        assert_eq!(row[6], Value::I32(2147483647));
        assert_eq!(row[7], Value::U32(4294967295));
        assert_eq!(row[8], Value::I64(9223372036854775807));
        assert_eq!(row[9], Value::U64(18446744073709551615));
        assert_eq!(row[10], Value::F32(1.5));
        assert_eq!(row[11], Value::F64(1.5));
        assert_eq!(row[12], Value::String("hello world".into()));
    }

    #[tokio::test]
    async fn query_select_nullable_null() {
        let mut conn = connection();
        let result = conn
            .query(
                r#"SELECT
                    CAST(NULL AS Nullable(Int32))  AS null_int,
                    CAST(NULL AS Nullable(String)) AS null_str,
                    CAST(NULL AS Nullable(UInt8))  AS null_u8
                "#
                .into(),
            )
            .await
            .unwrap();

        assert_eq!(result.rows.len(), 1);
        let row = &result.rows[0];
        assert_eq!(row[0], Value::Null);
        assert_eq!(row[1], Value::Null);
        assert_eq!(row[2], Value::Null);
    }

    #[tokio::test]
    async fn query_select_nullable_non_null() {
        let mut conn = connection();
        let result = conn
            .query(
                r#"SELECT
                    CAST(42      AS Nullable(Int32))  AS val_int,
                    CAST('hello' AS Nullable(String)) AS val_str
                "#
                .into(),
            )
            .await
            .unwrap();

        assert_eq!(result.rows.len(), 1);
        let row = &result.rows[0];
        assert_eq!(row[0], Value::I32(42));
        assert_eq!(row[1], Value::String("hello".into()));
    }

    #[tokio::test]
    async fn query_column_types_are_lowercased() {
        let mut conn = connection();
        let result = conn
            .query(
                r#"SELECT
                    toInt32(1)                     AS a,
                    CAST(NULL AS Nullable(UInt64)) AS b
                "#
                .into(),
            )
            .await
            .unwrap();

        assert_eq!(result.columns[0].datatype, "int32");
        assert_eq!(result.columns[1].datatype, "nullable(uint64)");
    }

    #[tokio::test]
    async fn query_empty_result_set() {
        let mut conn = connection();
        let result = conn
            .query("SELECT 1 AS id WHERE 1 = 0".into())
            .await
            .unwrap();
        assert_eq!(result.columns.len(), 1);
        assert_eq!(result.rows.len(), 0);
    }

    #[tokio::test]
    async fn query_ddl_returns_empty_result() {
        let mut conn = connection();
        conn.query(
            "CREATE TABLE IF NOT EXISTS default.test_dataflare_tmp (id UInt32) ENGINE = Memory"
                .into(),
        )
        .await
        .unwrap();
        let result = conn
            .query("DROP TABLE IF EXISTS default.test_dataflare_tmp".into())
            .await
            .unwrap();
        assert_eq!(result.columns, vec![]);
        assert_eq!(result.rows, vec![] as Vec<Vec<Value>>);
        assert_eq!(result.rows_affected, None);
    }

    #[tokio::test]
    async fn query_invalid_sql_returns_error() {
        let mut conn = connection();
        let err = conn
            .query("SELECT * FROM nonexistent_table_xyz_dataflare".into())
            .await
            .unwrap_err();
        assert!(matches!(err, Error::Exception(_)));
    }

    #[tokio::test]
    async fn query_session_persists_across_requests() {
        let mut conn = connection();
        conn.query("USE system".into()).await.unwrap();
        let result = conn.query("SELECT currentDatabase()".into()).await.unwrap();
        assert_eq!(result.rows[0][0], Value::String("system".into()));
    }

    #[tokio::test]
    async fn query_initial_database_is_applied() {
        let mut conn = connection_with_db("system");
        let result = conn.query("SELECT currentDatabase()".into()).await.unwrap();
        assert_eq!(result.rows[0][0], Value::String("system".into()));
    }

    #[tokio::test]
    async fn query_retries_initial_database_after_failed_request() {
        let mut conn = connection_with_db("system");
        let _ = conn.query("SELECT * FROM nonexistent_xyz".into()).await;
        // After a failed query, initialized stays false, so the next request
        // still sends the database param and the session is correctly set.
        let result = conn.query("SELECT currentDatabase()".into()).await.unwrap();
        assert_eq!(result.rows[0][0], Value::String("system".into()));
    }
}
