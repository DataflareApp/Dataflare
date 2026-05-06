mod config;
mod decode;
mod error;
mod response;
mod urlencoded;

pub use config::{AuthConfig, Config};
pub use error::{Error, Result, StatusError};

use decode::decode_rows_values;
use query::{Query, QueryColumn, Value};
use reqwest::header::{CONTENT_TYPE, HeaderMap, HeaderValue};
use reqwest::{Client, ClientBuilder, Proxy, StatusCode, Url};
use response::{Column, QueryResponse};
use std::sync::Arc;
use std::time::Duration;

#[derive(Debug)]
pub struct Connection {
    client: Client,
    headers: HeaderMap,
    query_url: Url,
    auth: Option<Arc<Auth>>,
}

#[derive(Debug)]
enum Auth {
    Basic { user: String, password: String },
    Bearer { token: String },
}

#[derive(Debug)]
enum Kind {
    Statement { sql: String },
    NextUri { uri: String },
}

// Documents: https://trino.io/docs/current/develop/client-protocol.html

const USER: &str = "X-Trino-User";
const ORIGINAL_USER: &str = "X-Trino-Original-User";
const SOURCE: &str = "X-Trino-Source";
const TIME_ZONE: &str = "X-Trino-Time-Zone";
const CATALOG: &str = "X-Trino-Catalog";
const SET_CATALOG: &str = "X-Trino-Set-Catalog";
const SCHEMA: &str = "X-Trino-Schema";
const SET_SCHEMA: &str = "X-Trino-Set-Schema";
const TRANSACTION_ID: &str = "X-Trino-Transaction-Id";
const STARTED_TRANSACTION_ID: &str = "X-Trino-Started-Transaction-Id";
const CLEAR_TRANSACTION_ID: &str = "X-Trino-Clear-Transaction-Id";
const PATH: &str = "X-Trino-Path";
const SET_PATH: &str = "X-Trino-Set-Path";
const ROLE: &str = "X-Trino-Role";
const SET_ROLE: &str = "X-Trino-Set-Role";
const ORIGINAL_ROLES: &str = "X-Trino-Original-Roles";
const SET_ORIGINAL_ROLES: &str = "X-Trino-Set-Original-Roles";
const SET_AUTHORIZATION_USER: &str = "X-Trino-Set-Authorization-User";
const RESET_AUTHORIZATION_USER: &str = "X-Trino-Reset-Authorization-User";
const SESSION: &str = "X-Trino-Session";
const SET_SESSION: &str = "X-Trino-Set-Session";
const CLEAR_SESSION: &str = "X-Trino-Clear-Session";
const ADDED_PREPARE: &str = "X-Trino-Added-Prepare";
const PREPARED_STATEMENT: &str = "X-Trino-Prepared-Statement";
const DEALLOCATED_PREPARE: &str = "X-Trino-Deallocated-Prepare";

impl Connection {
    pub fn open_with(config: Config) -> Result<Self> {
        let query_url = config.query_url()?;
        let auth = match config.auth {
            AuthConfig::None => None,
            AuthConfig::Password { password } => Some(Auth::Basic {
                user: config.user.clone(),
                password,
            }),
            AuthConfig::Jwt { token } => Some(Auth::Bearer { token }),
        };
        let mut headers = HeaderMap::new();
        {
            Self::insert_header(&mut headers, USER, config.user)?;
            Self::insert_header(&mut headers, TRANSACTION_ID, "NONE".to_string())?;
            Self::insert_header(&mut headers, TIME_ZONE, "UTC".to_string())?;
            Self::insert_header(&mut headers, SOURCE, "Dataflare".to_string())?;
            if !config.catalog.is_empty() {
                Self::insert_header(&mut headers, CATALOG, config.catalog)?;
            }
            if !config.schema.is_empty() {
                Self::insert_header(&mut headers, SCHEMA, config.schema)?;
            }
        }
        let mut builder = ClientBuilder::new()
            .danger_accept_invalid_certs(config.allow_invalid_certs)
            .timeout(Duration::from_secs(60));
        if let Some(proxy) = config.proxy {
            builder = builder.proxy(Proxy::all(proxy.into_http_connector())?);
        }
        Ok(Self {
            client: builder.build()?,
            headers,
            query_url,
            auth: auth.map(Arc::new),
        })
    }

    /// Creating a snapshot connection will inherit all current header states.
    pub fn snapshot(&self) -> Self {
        Self {
            client: self.client.clone(),
            headers: self.headers.clone(),
            query_url: self.query_url.clone(),
            auth: self.auth.clone(),
        }
    }

    fn insert_header(headers: &mut HeaderMap, key: &'static str, value: String) -> Result<()> {
        let v = HeaderValue::from_str(&value).map_err(|_| Error::InvalidHeaderValue(value))?;
        headers.insert(key, v);
        Ok(())
    }

    pub async fn query<S: AsRef<str>>(&mut self, sql: S) -> Result<Query> {
        // Trino server only accepts a single SQL statement per request; semicolon-separated multiple statements are not supported
        // The grammar's singleStatement rule requires statement to be immediately followed by EOF
        let sql = sql.as_ref().trim().trim_end_matches(';').to_string();

        let mut res = self.send(Kind::Statement { sql }).await?;

        if let Some(err) = res.error {
            // TODO: Cancel query?
            return Err(Error::Query(err));
        }

        let mut columns: Option<Vec<Column>> = res.columns;
        let mut all_rows: Vec<Vec<Value>> = Vec::new();
        let mut update_count: Option<u64> = res.update_count;
        let mut duration: u32 = res.stats.elapsed_time_millis.unwrap_or(0) as u32;

        if let (Some(data), Some(cols)) = (res.data, &columns) {
            decode_rows_values(&mut all_rows, cols, data)?;
        }

        while let Some(next_uri) = res.next_uri {
            res = self.send(Kind::NextUri { uri: next_uri }).await?;

            if let Some(err) = res.error {
                return Err(Error::Query(err));
            }

            if columns.is_none() {
                columns = res.columns;
            }

            if update_count.is_none() {
                update_count = res.update_count;
            }

            if let (Some(data), Some(cols)) = (res.data, &columns) {
                decode_rows_values(&mut all_rows, cols, data)?;
            }

            if res.next_uri.is_none() {
                duration = res.stats.elapsed_time_millis.unwrap_or(0) as u32;
            }
        }

        let columns = columns
            .unwrap_or_default()
            .into_iter()
            .map(|col| QueryColumn {
                name: col.name,
                datatype: col.datatype.to_lowercase(),
            })
            .collect();

        Ok(Query {
            columns,
            rows: all_rows,
            rows_affected: update_count,
            duration,
        })
    }

    async fn send(&mut self, kind: Kind) -> Result<QueryResponse> {
        const MAX_RETRIES: u32 = 5;
        let mut retries = 0;
        loop {
            let mut request = match &kind {
                Kind::Statement { sql } => self
                    .client
                    .post(self.query_url.clone())
                    .headers(self.headers.clone())
                    .header(CONTENT_TYPE, "text/plain")
                    .body(sql.to_string()),
                Kind::NextUri { uri } => self.client.get(uri).headers(self.headers.clone()),
            };
            if let Some(auth) = self.auth.as_ref() {
                request = match auth.as_ref() {
                    Auth::Basic { user, password } => request.basic_auth(user, Some(password)),
                    Auth::Bearer { token } => request.bearer_auth(token),
                };
            }

            let res = request.send().await?;

            match res.status() {
                status if status.is_success() => {
                    self.update_headers_from_response(res.headers());
                    let response = res.json::<QueryResponse>().await?;
                    return Ok(response);
                }
                status @ StatusCode::TOO_MANY_REQUESTS => {
                    retries += 1;
                    if retries > MAX_RETRIES {
                        return Err(Error::Retry {
                            retries: retries - 1,
                            status,
                        });
                    }
                    let retry_after = res
                        .headers()
                        .get("Retry-After")
                        .and_then(|v| v.to_str().ok())
                        .and_then(|v| v.parse::<u64>().ok())
                        .unwrap_or(1);
                    tokio::time::sleep(Duration::from_secs(retry_after)).await;
                }
                status @ (StatusCode::BAD_GATEWAY
                | StatusCode::SERVICE_UNAVAILABLE
                | StatusCode::GATEWAY_TIMEOUT) => {
                    retries += 1;
                    if retries > MAX_RETRIES {
                        return Err(Error::Retry {
                            retries: retries - 1,
                            status,
                        });
                    }
                    // https://trino.io/docs/current/develop/client-protocol.html#overview-of-query-processing
                    tokio::time::sleep(Duration::from_millis(75)).await;
                }
                status => {
                    return Err(Error::Status(StatusError {
                        code: status,
                        body: res.text().await?,
                    }));
                }
            }
        }
    }

    // Documents: https://trino.io/docs/current/develop/client-protocol.html#client-response-headers
    fn update_headers_from_response(&mut self, response_headers: &HeaderMap) {
        if let Some(v) = response_headers.get(SET_CATALOG) {
            self.headers.insert(CATALOG, v.clone());
        }
        if let Some(v) = response_headers.get(SET_SCHEMA) {
            self.headers.insert(SCHEMA, v.clone());
        }
        if let Some(v) = response_headers.get(SET_PATH) {
            self.headers.insert(PATH, v.clone());
        }
        if let Some(v) = response_headers.get(SET_AUTHORIZATION_USER) {
            if let Some(original) = self.headers.remove(USER) {
                self.headers.insert(ORIGINAL_USER, original);
            }
            self.headers.insert(USER, v.clone());
        }
        if response_headers.get(RESET_AUTHORIZATION_USER).is_some() {
            if let Some(original) = self.headers.remove(ORIGINAL_USER) {
                self.headers.insert(USER, original);
            }
            self.headers.remove(ORIGINAL_ROLES);
        }
        if let Some(v) = response_headers.get(STARTED_TRANSACTION_ID) {
            self.headers.insert(TRANSACTION_ID, v.clone());
        }
        if response_headers.get(CLEAR_TRANSACTION_ID).is_some() {
            self.headers
                .insert(TRANSACTION_ID, HeaderValue::from_static("NONE"));
        }
        self.append_to_header(
            ORIGINAL_ROLES,
            response_headers.get_all(SET_ORIGINAL_ROLES).iter(),
        );
        self.merge_kv_headers(SESSION, response_headers.get_all(SET_SESSION).iter());
        self.merge_kv_headers(ROLE, response_headers.get_all(SET_ROLE).iter());
        self.merge_kv_headers(
            PREPARED_STATEMENT,
            response_headers.get_all(ADDED_PREPARE).iter(),
        );
        let clear_keys: Vec<String> = response_headers
            .get_all(CLEAR_SESSION)
            .iter()
            .filter_map(|v| v.to_str().ok())
            .map(|s| s.trim().to_string())
            .collect();
        self.remove_kv_header_by_keys(SESSION, &clear_keys);
        let dealloc_keys: Vec<String> = response_headers
            .get_all(DEALLOCATED_PREPARE)
            .iter()
            .filter_map(|v| v.to_str().ok())
            .map(urlencoded::url_decode)
            .collect();
        self.remove_kv_header_by_keys(PREPARED_STATEMENT, &dealloc_keys);
    }

    fn append_to_header<'a>(
        &mut self,
        header_name: &'static str,
        headers: impl Iterator<Item = &'a HeaderValue>,
    ) {
        let items = headers
            .into_iter()
            .filter_map(|s| s.to_str().ok())
            .collect::<Vec<&str>>();
        if items.is_empty() {
            return;
        }
        match self.headers.get(header_name) {
            None => {
                if let Ok(hv) = HeaderValue::from_str(&items.join(",")) {
                    self.headers.insert(header_name, hv);
                }
            }
            Some(origin) => {
                if let Ok(existing) = origin.to_str() {
                    if let Ok(hv) =
                        HeaderValue::from_str(&format!("{},{}", existing, items.join(",")))
                    {
                        self.headers.insert(header_name, hv);
                    }
                }
            }
        }
    }

    fn merge_kv_headers<'a>(
        &mut self,
        header_name: &'static str,
        headers: impl Iterator<Item = &'a HeaderValue>,
    ) {
        let entries: Vec<(String, String)> = headers
            .filter_map(urlencoded::decode_kv_from_header)
            .collect();
        if entries.is_empty() {
            return;
        }
        let mut seen_keys: Vec<&str> = Vec::new();
        let mut deduped: Vec<String> = Vec::new();
        for (k, v) in entries.iter().rev() {
            if !seen_keys.iter().any(|s| *s == k) {
                seen_keys.push(k);
                deduped.push(urlencoded::encode_kv(k, v));
            }
        }
        deduped.reverse();
        let result = match self.headers.get(header_name) {
            Some(existing) if existing.to_str().is_ok() => {
                let existing_str = existing.to_str().unwrap();
                let mut parts: Vec<String> = existing_str
                    .split(',')
                    .filter(|entry| {
                        urlencoded::decode_key(entry)
                            .map(|k| !seen_keys.iter().any(|s| *s == k))
                            .unwrap_or(false)
                    })
                    .map(|s| s.to_string())
                    .collect();
                parts.extend(deduped);
                parts.join(",")
            }
            _ => deduped.join(","),
        };
        if let Ok(hv) = HeaderValue::from_str(&result) {
            self.headers.insert(header_name, hv);
        }
    }

    fn remove_kv_header_by_keys(&mut self, header_name: &'static str, keys: &[String]) {
        if keys.is_empty() {
            return;
        }
        let Some(existing) = self.headers.get(header_name) else {
            return;
        };
        let Ok(existing_str) = existing.to_str() else {
            return;
        };
        let filtered: Vec<&str> = existing_str
            .split(',')
            .filter(|entry| {
                urlencoded::decode_key(entry)
                    .map(|k| !keys.iter().any(|key| key == &k))
                    .unwrap_or(true)
            })
            .collect();
        if filtered.is_empty() {
            self.headers.remove(header_name);
        } else if let Ok(hv) = HeaderValue::from_str(&filtered.join(",")) {
            self.headers.insert(header_name, hv);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use query::Value;

    fn connection_with(catalog: &str, schema: &str) -> Connection {
        Connection::open_with(Config {
            https: false,
            host: "localhost".into(),
            port: 8080,
            user: "root".into(),
            auth: AuthConfig::None,
            catalog: catalog.into(),
            schema: schema.into(),
            allow_invalid_certs: false,
            proxy: None,
        })
        .unwrap()
    }

    fn connection() -> Connection {
        connection_with("system", "")
    }

    #[tokio::test]
    async fn test_headers_set() {
        // init
        let mut conn = connection_with("system", "runtime");
        let result = conn
            .query("SELECT current_catalog, current_schema")
            .await
            .unwrap();
        assert_eq!(result.rows[0][0], Value::String("system".into()));
        assert_eq!(result.rows[0][1], Value::String("runtime".into()));
        // changed
        conn.query("USE memory.default").await.unwrap();
        let result = conn
            .query("SELECT current_catalog, current_schema")
            .await
            .unwrap();
        assert_eq!(result.rows[0][0], Value::String("memory".into()));
    }

    #[tokio::test]
    async fn test_headers_set_round_trip() {
        let mut conn = connection_with("system", "information_schema");
        conn.query("USE memory.default").await.unwrap();
        conn.query("USE system.runtime").await.unwrap();
        let result = conn
            .query("SELECT current_catalog, current_schema")
            .await
            .unwrap();
        assert_eq!(result.rows[0][0], Value::String("system".into()));
        assert_eq!(result.rows[0][1], Value::String("runtime".into()));
    }

    #[tokio::test]
    async fn test_headers_set_schema_update() {
        let mut conn = connection_with("system", "runtime");
        conn.query("USE information_schema").await.unwrap();
        let result = conn
            .query("SELECT current_catalog, current_schema")
            .await
            .unwrap();
        assert_eq!(result.rows[0][0], Value::String("system".into()));
        assert_eq!(
            result.rows[0][1],
            Value::String("information_schema".into())
        );
    }

    #[tokio::test]
    async fn test_columns_names_types_and_ordering() {
        let mut conn = connection();
        let result = conn
            .query(
                "SELECT
                    CAST(1 AS BIGINT) AS id,
                    CAST('test' AS VARCHAR) AS name,
                    true AS active,
                    CAST(3.14 AS DOUBLE) AS score,
                    DATE '2024-01-15' AS created",
            )
            .await
            .unwrap();

        assert_eq!(result.columns.len(), 5);
        assert_eq!(result.columns[0].name, "id");
        assert_eq!(result.columns[0].datatype, "bigint");
        assert_eq!(result.columns[1].name, "name");
        assert!(result.columns[1].datatype.starts_with("varchar"));
        assert_eq!(result.columns[2].name, "active");
        assert_eq!(result.columns[2].datatype, "boolean");
        assert_eq!(result.columns[3].name, "score");
        assert_eq!(result.columns[3].datatype, "double");
        assert_eq!(result.columns[4].name, "created");
        assert_eq!(result.columns[4].datatype, "date");
    }

    #[tokio::test]
    async fn test_columns_with_duplicate_names() {
        let mut conn = connection();
        let result = conn
            .query("SELECT 1 AS col, 2 AS col, 3 AS col")
            .await
            .unwrap();
        assert_eq!(result.columns.len(), 3);
        assert_eq!(result.columns[0].name, "col");
        assert_eq!(result.columns[1].name, "col");
        assert_eq!(result.columns[2].name, "col");
        assert_eq!(result.rows[0][0], Value::I64(1));
        assert_eq!(result.rows[0][1], Value::I64(2));
        assert_eq!(result.rows[0][2], Value::I64(3));
    }

    #[tokio::test]
    async fn test_columns_with_special_characters() {
        let mut conn = connection();
        let result = conn
            .query(
                r#"SELECT
                    1 AS "My Column!",
                    2 AS "column-with-dash",
                    3 AS "Column.With.Dots""#,
            )
            .await
            .unwrap();
        assert_eq!(result.columns[0].name, "My Column!");
        assert_eq!(result.columns[1].name, "column-with-dash");
        assert_eq!(result.columns[2].name, "Column.With.Dots");
    }

    #[tokio::test]
    async fn test_query() {
        let mut conn = connection();
        let result = conn
            .query(
                r#"SELECT
                    CAST(NULL AS VARCHAR) AS "null",
                    true AS bool_t,
                    false AS bool_f,
                    CAST(127 AS TINYINT) AS tinyint,
                    CAST(32767 AS SMALLINT) AS smallint,
                    CAST(2147483647 AS INTEGER) AS "int",
                    CAST(9223372036854775807 AS BIGINT) AS bigint,
                    CAST(3.14 AS REAL) AS "real",
                    CAST(3.141592653589793 AS DOUBLE) AS "double",
                    CAST(123.456 AS DECIMAL(10, 3)) AS "decimal",
                    'hello' AS "varchar",
                    CAST('world' AS CHAR(10)) AS "char",
                    X'00FF00FF' AS varbinary,
                    TIME '12:13:14.123' AS "time",
                    DATE '2021-01-02' AS "date",
                    TIMESTAMP '2021-01-02 12:13:14.123' AS "timestamp",
                    ARRAY[1, 2, 3] AS "array",
                    MAP(ARRAY['a', 'b'], ARRAY[1, 2]) AS "map",
                    ROW(1, 'hello') AS "row""#,
            )
            .await
            .unwrap();

        assert_eq!(result.rows.len(), 1);
        let cols = &result.columns;
        let row = &result.rows[0];

        assert_eq!(cols[0].name, "null");
        assert_eq!(cols[0].datatype, "varchar");
        assert_eq!(row[0], Value::Null);

        assert_eq!(cols[1].name, "bool_t");
        assert_eq!(cols[1].datatype, "boolean");
        assert_eq!(row[1], Value::Bool(true));

        assert_eq!(cols[2].name, "bool_f");
        assert_eq!(cols[2].datatype, "boolean");
        assert_eq!(row[2], Value::Bool(false));

        assert_eq!(cols[3].name, "tinyint");
        assert_eq!(cols[3].datatype, "tinyint");
        assert_eq!(row[3], Value::I64(127));

        assert_eq!(cols[4].name, "smallint");
        assert_eq!(cols[4].datatype, "smallint");
        assert_eq!(row[4], Value::I64(32767));

        assert_eq!(cols[5].name, "int");
        assert_eq!(cols[5].datatype, "integer");
        assert_eq!(row[5], Value::I64(2147483647));

        assert_eq!(cols[6].name, "bigint");
        assert_eq!(cols[6].datatype, "bigint");
        assert_eq!(row[6], Value::I64(9223372036854775807));

        assert_eq!(cols[7].name, "real");
        assert_eq!(cols[7].datatype, "real");
        assert_eq!(row[7], Value::F64(3.14));

        assert_eq!(cols[8].name, "double");
        assert_eq!(cols[8].datatype, "double");
        assert_eq!(row[8], Value::F64(3.141592653589793));

        assert_eq!(cols[9].name, "decimal");
        assert_eq!(cols[9].datatype, "decimal(10, 3)");
        assert_eq!(row[9], Value::String("123.456".into()));

        assert_eq!(cols[10].name, "varchar");
        assert!(cols[10].datatype.starts_with("varchar"));
        assert_eq!(row[10], Value::String("hello".into()));

        assert_eq!(cols[11].name, "char");
        assert_eq!(cols[11].datatype, "char(10)");
        assert_eq!(row[11], Value::String("world     ".into()));

        assert_eq!(cols[12].name, "varbinary");
        assert_eq!(cols[12].datatype, "varbinary");
        assert_eq!(row[12], Value::from_bytes(vec![0x00, 0xFF, 0x00, 0xFF]));

        assert_eq!(cols[13].name, "time");
        assert_eq!(cols[13].datatype, "time");
        assert_eq!(row[13], Value::String("12:13:14.123".into()));

        assert_eq!(cols[14].name, "date");
        assert_eq!(cols[14].datatype, "date");
        assert_eq!(row[14], Value::String("2021-01-02".into()));

        assert_eq!(cols[15].name, "timestamp");
        assert_eq!(cols[15].datatype, "timestamp");
        assert_eq!(row[15], Value::String("2021-01-02 12:13:14.123".into()));

        assert_eq!(cols[16].name, "array");
        assert_eq!(cols[16].datatype, "array(integer)");
        assert!(matches!(row[16], Value::String(_)));

        assert_eq!(cols[17].name, "map");
        assert!(cols[17].datatype.starts_with("map(varchar"));
        assert!(matches!(row[17], Value::String(_)));

        assert_eq!(cols[18].name, "row");
        assert!(cols[18].datatype.starts_with("row("));
        assert!(matches!(row[18], Value::String(_)));
    }

    #[tokio::test]
    async fn test_integer_edge_cases() {
        let mut conn = connection();
        let result = conn
            .query(
                "SELECT
                    CAST(-128 AS TINYINT) AS tinyint_min,
                    CAST(127 AS TINYINT) AS tinyint_max,
                    CAST(-32768 AS SMALLINT) AS smallint_min,
                    CAST(32767 AS SMALLINT) AS smallint_max,
                    CAST(-2147483648 AS INTEGER) AS int_min,
                    CAST(2147483647 AS INTEGER) AS int_max,
                    CAST(-9223372036854775808 AS BIGINT) AS bigint_min,
                    CAST(9223372036854775807 AS BIGINT) AS bigint_max",
            )
            .await
            .unwrap();

        assert_eq!(result.rows[0][0], Value::I64(-128));
        assert_eq!(result.rows[0][1], Value::I64(127));
        assert_eq!(result.rows[0][2], Value::I64(-32768));
        assert_eq!(result.rows[0][3], Value::I64(32767));
        assert_eq!(result.rows[0][4], Value::I64(-2147483648));
        assert_eq!(result.rows[0][5], Value::I64(2147483647));
        assert_eq!(result.rows[0][6], Value::I64(-9223372036854775808));
        assert_eq!(result.rows[0][7], Value::I64(9223372036854775807));
    }

    #[tokio::test]
    async fn test_float_special_values() {
        let mut conn = connection();
        let result = conn
            .query(
                "SELECT
                    nan() AS nan,
                    infinity() AS pos_inf,
                    -infinity() AS neg_inf,
                    CAST(0.0 AS REAL) AS zero",
            )
            .await
            .unwrap();

        match &result.rows[0][0] {
            Value::F64(v) => assert!(v.is_nan()),
            Value::String(s) if s == "NaN" => {}
            other => panic!("Expected F64 or NaN string, got {:?}", other),
        }
        match &result.rows[0][1] {
            Value::F64(v) => assert!(v.is_infinite() && v.is_sign_positive()),
            Value::String(s) if s == "Infinity" => {}
            other => panic!("Expected F64 or Infinity string, got {:?}", other),
        }
        match &result.rows[0][2] {
            Value::F64(v) => assert!(v.is_infinite() && v.is_sign_negative()),
            Value::String(s) if s == "-Infinity" => {}
            other => panic!("Expected F64 or -Infinity string, got {:?}", other),
        }
    }

    #[tokio::test]
    async fn test_decimal_precision() {
        let mut conn = connection();
        let result = conn
            .query(
                "SELECT
                    CAST(0.1 AS DECIMAL(1, 1)) AS small,
                    CAST(123456.789 AS DECIMAL(9, 3)) AS medium,
                    CAST(9999999999999999999999999999999999.99 AS DECIMAL(38, 2)) AS max_precision",
            )
            .await
            .unwrap();

        assert_eq!(result.rows[0][0], Value::String("0.1".into()));
        assert_eq!(result.rows[0][1], Value::String("123456.789".into()));
        assert_eq!(
            result.rows[0][2],
            Value::String("9999999999999999999999999999999999.99".into())
        );
    }

    #[tokio::test]
    async fn test_varbinary_edge_cases() {
        let mut conn = connection();
        let result = conn
            .query(
                "SELECT
                    X'' AS empty,
                    X'00' AS single_null,
                    X'FF' AS single_max,
                    X'0123456789ABCDEF' AS hex_sequence",
            )
            .await
            .unwrap();

        assert_eq!(result.rows[0][0], Value::from_bytes(vec![]));
        assert_eq!(result.rows[0][1], Value::from_bytes(vec![0x00]));
        assert_eq!(result.rows[0][2], Value::from_bytes(vec![0xFF]));
        assert_eq!(
            result.rows[0][3],
            Value::from_bytes(vec![0x01, 0x23, 0x45, 0x67, 0x89, 0xAB, 0xCD, 0xEF])
        );
    }

    #[tokio::test]
    async fn test_large_result_set() {
        let mut conn = connection();
        let result = conn
            .query(
                "SELECT seq AS id,
                        'row_' || CAST(seq AS VARCHAR) AS name,
                        seq % 2 = 0 AS is_even,
                        seq * 1.5 AS score
                 FROM UNNEST(SEQUENCE(1, 10000)) AS t(seq)",
            )
            .await
            .unwrap();

        assert_eq!(result.rows.len(), 10000);
        assert_eq!(result.columns.len(), 4);

        assert_eq!(result.rows[0][0], Value::I64(1));
        assert_eq!(result.rows[0][1], Value::String("row_1".into()));

        assert_eq!(result.rows[9999][0], Value::I64(10000));
        assert_eq!(result.rows[9999][1], Value::String("row_10000".into()));

        assert!(result.duration > 0);
    }

    #[tokio::test]
    async fn test_multiple_pages() {
        let mut conn = connection();
        let result = conn
            .query(
                "SELECT seq, seq * 2, seq * 3, seq * 4, seq * 5
                 FROM UNNEST(SEQUENCE(1, 10000)) AS t(seq)",
            )
            .await
            .unwrap();

        assert_eq!(result.rows.len(), 10000);
        assert_eq!(result.columns.len(), 5);
        assert_eq!(result.rows[0][0], Value::I64(1));
        assert_eq!(result.rows[9999][0], Value::I64(10000));
        assert_eq!(result.rows[9999][4], Value::I64(50000));
    }

    #[tokio::test]
    async fn test_empty_result() {
        let mut conn = connection();
        let result = conn
            .query("SELECT 1 AS id, 'test' AS name WHERE 1 = 0")
            .await
            .unwrap();
        assert_eq!(result.rows.len(), 0);
        assert_eq!(result.columns.len(), 2);
        assert_eq!(result.columns[0].name, "id");
        assert_eq!(result.columns[1].name, "name");
    }

    #[tokio::test]
    async fn test_empty_result_with_limit_zero() {
        let mut conn = connection();
        let result = conn
            .query("SELECT * FROM system.runtime.nodes LIMIT 0")
            .await
            .unwrap();
        assert_eq!(result.rows.len(), 0);
        assert!(result.columns.len() > 0);
    }

    #[tokio::test]
    async fn test_syntax_error() {
        let mut conn = connection();
        let err = conn.query("SELECTT * FROM invalid").await.unwrap_err();
        match err {
            Error::Query(trino_err) => {
                assert!(!trino_err.message.is_empty());
                assert!(trino_err.error_code != 0);
            }
            _ => panic!("Expected Trino error"),
        }
    }

    #[tokio::test]
    async fn test_query_duration() {
        let mut conn = connection();
        let result = conn
            .query("SELECT * FROM system.runtime.nodes")
            .await
            .unwrap();
        assert!(result.duration > 0, "Duration should be populated");
    }

    #[tokio::test]
    async fn test_sql_trailing_semicolon_stripped() {
        let mut conn = connection();
        let result = conn.query("SELECT 1;").await.unwrap();
        assert_eq!(result.rows[0][0], Value::I64(1));

        let result = conn.query("SELECT 2;;").await.unwrap();
        assert_eq!(result.rows[0][0], Value::I64(2));
    }

    #[tokio::test]
    async fn test_transaction_headers() {
        let mut conn = connection();

        let tx_id = conn.headers.get(TRANSACTION_ID).unwrap();
        assert_eq!(tx_id, "NONE");

        conn.query("START TRANSACTION").await.unwrap();
        let tx_id = conn.headers.get(TRANSACTION_ID).unwrap();
        assert_ne!(tx_id, "NONE");

        conn.query("COMMIT").await.unwrap();
        let tx_id = conn.headers.get(TRANSACTION_ID).unwrap();
        assert_eq!(tx_id, "NONE");

        conn.query("START TRANSACTION").await.unwrap();
        let tx_id = conn.headers.get(TRANSACTION_ID).unwrap();
        assert_ne!(tx_id, "NONE");

        conn.query("select 1").await.unwrap();
        let tx_id = conn.headers.get(TRANSACTION_ID).unwrap();
        assert_ne!(tx_id, "NONE");

        conn.query("ROLLBACK").await.unwrap();
        let tx_id = conn.headers.get(TRANSACTION_ID).unwrap();
        assert_eq!(tx_id, "NONE");
    }

    #[tokio::test]
    async fn test_prepared_statements() {
        let mut conn = connection();

        conn.query("PREPARE my_query FROM SELECT 1").await.unwrap();

        let prepared = conn.headers.get(PREPARED_STATEMENT).unwrap();
        assert!(prepared.to_str().unwrap().contains("my_query="));

        conn.query("PREPARE another_query FROM SELECT 2")
            .await
            .unwrap();

        let prepared = conn.headers.get(PREPARED_STATEMENT).unwrap();
        assert!(prepared.to_str().unwrap().contains("my_query="));
        assert!(prepared.to_str().unwrap().contains("another_query="));

        conn.query("DEALLOCATE PREPARE my_query").await.unwrap();

        let prepared = conn.headers.get(PREPARED_STATEMENT).unwrap();
        assert!(!prepared.to_str().unwrap().contains("my_query="));
        assert!(prepared.to_str().unwrap().contains("another_query="));
    }
}
