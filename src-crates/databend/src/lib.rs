mod config;
mod decode;
mod error;
mod response;

pub use config::Config;
pub use error::{Error, Result, StatusError};

use decode::{decode_columns, decode_rows};
use query::{Query, QueryColumn, Value};
use reqwest::{Client, ClientBuilder, Proxy, Url};
use response::{ExecuteState, QueryResponse};
use serde::Serialize;
use std::time::Duration;

// Documents: https://github.com/databendlabs/databend/blob/main/src/query/service/src/servers/http/v1/http_query_handlers.rs

#[derive(Debug)]
pub struct Connection {
    client: Client,
    auth: (String, String),
    url: Url,
    query_url: Url,
    session: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
struct QueryRequest<'a> {
    sql: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    session: Option<&'a serde_json::Value>,
    /// When true, all values in `data` are returned as strings (including nulls as JSON null).
    /// Without this, type information would be lost for some types.
    string_fields: bool,
    pagination: PaginationConf,
}

#[derive(Debug, Serialize)]
struct PaginationConf {
    wait_time_secs: u32,
}

impl Connection {
    pub fn open_with(config: Config) -> Result<Self> {
        let url = config.url()?;
        let query_url = config.query_url()?;
        let mut builder = ClientBuilder::new()
            // https://github.com/hyperium/hyper/issues/2136#issuecomment-589488526
            .http2_keep_alive_timeout(Duration::from_secs(15))
            .pool_max_idle_per_host(0)
            .user_agent("Dataflare");
        if let Some(proxy) = config.proxy {
            builder = builder.proxy(Proxy::all(proxy.into_http_connector())?);
        }
        let client = builder.build()?;

        let session = serde_json::json!({
            "database": config.database,
            "settings": { "format_null_as_str": "0" },
        });

        Ok(Self {
            client,
            url,
            query_url,
            auth: (config.username, config.password),
            session: Some(session),
        })
    }

    /// Create a snapshot of the current connection, inheriting all session state.
    /// Useful for concurrent operations like batch insert.
    pub fn snapshot(&self) -> Self {
        Self {
            client: self.client.clone(),
            auth: self.auth.clone(),
            url: self.url.clone(),
            query_url: self.query_url.clone(),
            session: self.session.clone(),
        }
    }

    /// POST to `/v1/query` to start a new query.
    async fn send_query(&self, sql: &str) -> Result<QueryResponse> {
        let req = QueryRequest {
            sql,
            session: self.session.as_ref(),
            string_fields: true,
            pagination: PaginationConf { wait_time_secs: 10 },
        };
        let res = self
            .client
            .post(self.query_url.clone())
            .basic_auth(&self.auth.0, Some(&self.auth.1))
            .json(&req)
            .send()
            .await?;
        if !res.status().is_success() {
            return Err(Error::Status(StatusError {
                code: res.status(),
                body: res.text().await?,
            }));
        }
        let res = res.json::<QueryResponse>().await?;
        Ok(res)
    }

    /// GET a page/state/final URI to continue fetching results.
    async fn fetch_page(&self, uri: &str) -> Result<QueryResponse> {
        let url = self.build_url(uri);
        let res = self
            .client
            .get(url)
            .basic_auth(&self.auth.0, Some(&self.auth.1))
            .send()
            .await?;
        if !res.status().is_success() {
            return Err(Error::Status(StatusError {
                code: res.status(),
                body: res.text().await?,
            }));
        }
        let res = res.json::<QueryResponse>().await?;
        Ok(res)
    }

    /// Build a full URL from a relative path like `/v1/query/{id}/page/{n}`.
    fn build_url(&self, path: &str) -> Url {
        let mut url = self.url.clone();
        url.set_path(path);
        url
    }

    pub async fn query<S: AsRef<str>>(&mut self, sql: S) -> Result<Query> {
        let mut res = self.send_query(sql.as_ref()).await?;

        // Always update session before checking errors.
        // The server returns updated session state (e.g. cleared transaction context)
        // even in error responses. Without this, a transaction timeout would leave
        // stale transaction state in self.session, causing all subsequent queries to fail.
        if let Some(session) = res.session.take() {
            self.session = Some(session);
        }

        if let Some(err) = res.error {
            return Err(Error::Databend(err));
        }

        let mut columns: Option<Vec<QueryColumn>> = res.schema.take().map(decode_columns);
        let mut all_rows: Vec<Vec<Value>> = Vec::new();
        let mut duration: u32 = res.stats.running_time_ms as u32;
        let mut rows_affected: Option<u64> = res.affect.as_ref().and_then(|a| a.count);

        // Decode initial page data
        if let Some(cols) = &columns {
            if !res.data.is_empty() {
                decode_rows(&mut all_rows, std::mem::take(&mut res.data), cols)?
            }
        }

        // Follow pagination: next_uri can point to page, state, or final endpoints
        while let Some(next_uri) = res.next_uri.take() {
            // If next_uri is the final endpoint, GET it to close the query and break
            if res.final_uri.as_deref() == Some(next_uri.as_str()) {
                let final_res = self.fetch_page(&next_uri).await?;
                if let Some(session) = final_res.session {
                    self.session = Some(session);
                }
                duration = final_res.stats.running_time_ms as u32;
                break;
            }

            res = self.fetch_page(&next_uri).await?;

            // Always update session before checking errors
            if let Some(session) = res.session.take() {
                self.session = Some(session);
            }

            if let Some(err) = res.error {
                return Err(Error::Databend(err));
            }

            // Capture columns if not yet available (possible on first page of Running state)
            if columns.is_none() {
                columns = res.schema.take().map(decode_columns);
            }

            // Capture rows_affected
            if rows_affected.is_none() {
                rows_affected = res.affect.as_ref().and_then(|a| a.count);
            }

            // Decode data from this page
            if let Some(cols) = &columns {
                if !res.data.is_empty() {
                    decode_rows(&mut all_rows, std::mem::take(&mut res.data), cols)?;
                }
            }

            // Take duration from the last response before final
            match res.state {
                ExecuteState::Succeeded | ExecuteState::Failed => {
                    duration = res.stats.running_time_ms as u32;
                }
                _ => {}
            }
        }

        Ok(Query {
            columns: columns.unwrap_or_default(),
            rows: all_rows,
            rows_affected,
            duration,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use query::Value;

    fn connection() -> Connection {
        Connection::open_with(Config {
            https: false,
            host: "localhost".into(),
            port: 8000,
            username: "root".into(),
            password: "".into(),
            database: "default".into(),
            proxy: None,
        })
        .unwrap()
    }

    #[tokio::test]
    async fn test_select_literal() {
        let mut conn = connection();
        let result = conn.query("SELECT 1 AS id, 'hello' AS name").await.unwrap();
        assert_eq!(result.columns.len(), 2);
        assert_eq!(result.columns[0].name, "id");
        assert_eq!(result.columns[1].name, "name");
        assert_eq!(result.rows.len(), 1);
    }

    #[tokio::test]
    async fn test_select_types() {
        let mut conn = connection();
        let result = conn
            .query(
                r#"SELECT
                    CAST(NULL AS VARCHAR) AS "null",
                    true AS bool_t,
                    false AS bool_f,
                    CAST(127 AS INT8) AS i8_val,
                    CAST(32767 AS INT16) AS i16_val,
                    CAST(2147483647 AS INT32) AS i32_val,
                    CAST(9223372036854775807 AS INT64) AS i64_val,
                    CAST(3.14 AS FLOAT32) AS f32_val,
                    CAST(3.141592653589793 AS FLOAT64) AS f64_val,
                    'hello world' AS str_val,
                    from_hex('00ff00ff') AS bin_val
                "#,
            )
            .await
            .unwrap();

        let row = &result.rows[0];
        assert_eq!(row[0], Value::Null);
        assert_eq!(row[3], Value::I8(127));
        assert_eq!(row[4], Value::I16(32767));
        assert_eq!(row[5], Value::I32(2147483647));
        assert_eq!(row[6], Value::I64(9223372036854775807));
        assert_eq!(row[9], Value::String("hello world".into()));
        assert_eq!(row[10], Value::from_bytes(vec![0x00, 0xff, 0x00, 0xff]));
    }

    #[tokio::test]
    async fn test_empty_result() {
        let mut conn = connection();
        let result = conn.query("SELECT 1 AS id WHERE 1 = 0").await.unwrap();
        assert_eq!(result.rows.len(), 0);
        assert_eq!(result.columns.len(), 1);
    }

    #[tokio::test]
    async fn test_large_result_set() {
        let mut conn = connection();
        let result = conn
            .query(
                "SELECT number AS id, CONCAT('row_', CAST(number AS VARCHAR)) AS name
                 FROM numbers(10000)",
            )
            .await
            .unwrap();
        assert_eq!(result.rows.len(), 10000);
        assert_eq!(result.columns.len(), 2);
        assert!(result.duration > 0);
    }

    #[tokio::test]
    async fn test_use_database() {
        let mut conn = connection();

        let result = conn.query("SELECT currentDatabase()").await.unwrap();
        assert_eq!(result.rows[0][0], Value::String("default".into()));

        conn.query("CREATE DATABASE IF NOT EXISTS test_db_switch")
            .await
            .unwrap();
        conn.query("USE test_db_switch").await.unwrap();

        let result = conn.query("SELECT currentDatabase()").await.unwrap();
        assert_eq!(result.rows[0][0], Value::String("test_db_switch".into()));

        // Cleanup
        conn.query("USE default").await.unwrap();
        conn.query("DROP DATABASE IF EXISTS test_db_switch")
            .await
            .unwrap();
    }

    #[tokio::test]
    async fn test_query_duration() {
        let mut conn = connection();
        let result = conn.query("SELECT 1").await.unwrap();
        assert!(result.duration > 0, "Duration should be populated");
    }

    #[tokio::test]
    async fn test_null_values() {
        let mut conn = connection();
        let result = conn
            .query(r#"SELECT null, CAST(NULL AS INT32) AS null_int, 'null', 'NULL'"#)
            .await
            .unwrap();
        assert_eq!(result.rows[0][0], Value::Null);
        assert_eq!(result.rows[0][1], Value::Null);
        assert_eq!(result.rows[0][2], Value::String("null".into()));
        assert_eq!(result.rows[0][3], Value::String("NULL".into()));
    }

    #[tokio::test]
    async fn test_float_special_values() {
        let mut conn = connection();
        let result = conn
            .query(
                r#"SELECT
                    CAST('inf' AS FLOAT64) AS pos_inf,
                    CAST('-inf' AS FLOAT64) AS neg_inf,
                    CAST('nan' AS FLOAT64) AS nan_val,
                    CAST(0.0 AS FLOAT64) AS zero,
                    CAST(-0.0 AS FLOAT64) AS neg_zero
                "#,
            )
            .await
            .unwrap();
        let row = &result.rows[0];
        assert_eq!(row[0], Value::F64(f64::INFINITY));
        assert_eq!(row[1], Value::F64(f64::NEG_INFINITY));
        match &row[2] {
            Value::F64(v) => assert!(v.is_nan()),
            other => panic!("Expected F64 NaN, got {:?}", other),
        }
        assert_eq!(row[3], Value::F64(0.0));
    }

    #[tokio::test]
    async fn test_syntax_error() {
        let mut conn = connection();
        let err = conn.query("SELECTT * FROM invalid").await.unwrap_err();
        match err {
            Error::Databend(e) => {
                assert!(!e.message.is_empty());
                assert!(e.code != 0);
            }
            _ => panic!("Expected Databend error, got {:?}", err),
        }
    }

    #[tokio::test]
    async fn test_zero_row_ddl() {
        let mut conn = connection();
        conn.query("CREATE TABLE IF NOT EXISTS _test_edge_ddl (id INT32)")
            .await
            .unwrap();
        let result = conn
            .query("DROP TABLE IF EXISTS _test_edge_ddl")
            .await
            .unwrap();
        assert_eq!(result.rows.len(), 0);
    }

    #[tokio::test]
    async fn test_insert_and_count_rows_affected() {
        let mut conn = connection();
        conn.query("CREATE TABLE IF NOT EXISTS _test_edge_insert (id INT32, name VARCHAR)")
            .await
            .unwrap();

        conn.query("INSERT INTO _test_edge_insert VALUES (1, 'a'), (2, 'b'), (3, 'c')")
            .await
            .unwrap();

        let result = conn
            .query("SELECT COUNT(*) FROM _test_edge_insert")
            .await
            .unwrap();
        let count = &result.rows[0][0];
        match count {
            Value::U64(n) => assert!(*n >= 3),
            other => panic!("Expected U64 count, got {:?}", other),
        }

        conn.query("DROP TABLE IF EXISTS _test_edge_insert")
            .await
            .unwrap();
    }

    #[tokio::test]
    async fn test_duplicate_column_names() {
        let mut conn = connection();
        let result = conn.query("SELECT 1 AS x, 2 AS x, 3 AS x").await.unwrap();
        assert_eq!(result.columns.len(), 3);
        assert_eq!(result.rows[0].len(), 3);
    }

    #[tokio::test]
    async fn test_comment_only_query() {
        let mut conn = connection();
        let res = conn.query("-- this is just a comment").await;
        assert!(res.is_err());
    }

    #[tokio::test]
    async fn test_tuple_type_as_string() {
        let mut conn = connection();
        let result = conn.query("SELECT (1, 'a', true)").await.unwrap();
        assert_eq!(result.rows[0][0], Value::String("(1,'a',1)".into()));
    }

    #[tokio::test]
    async fn test_transaction_commit() {
        let mut conn = connection();
        conn.query("CREATE TABLE IF NOT EXISTS _test_transaction (id INT32, value VARCHAR)")
            .await
            .unwrap();

        conn.query("BEGIN").await.unwrap();
        conn.query("INSERT INTO _test_transaction VALUES (1, 'test')")
            .await
            .unwrap();
        conn.query("COMMIT").await.unwrap();

        let result = conn
            .query("SELECT COUNT(*) FROM _test_transaction")
            .await
            .unwrap();
        assert_eq!(result.rows[0][0], Value::U64(1));

        conn.query("DROP TABLE IF EXISTS _test_transaction")
            .await
            .unwrap();
    }

    #[tokio::test]
    async fn test_transaction_rollback() {
        let mut conn = connection();
        conn.query(
            "CREATE TABLE IF NOT EXISTS _test_transaction_rollback (id INT32, value VARCHAR)",
        )
        .await
        .unwrap();

        conn.query("BEGIN").await.unwrap();
        conn.query("INSERT INTO _test_transaction_rollback VALUES (1, 'test')")
            .await
            .unwrap();
        conn.query("ROLLBACK").await.unwrap();

        let result = conn
            .query("SELECT COUNT(*) FROM _test_transaction_rollback")
            .await
            .unwrap();
        assert_eq!(result.rows[0][0], Value::U64(0));

        conn.query("DROP TABLE IF EXISTS _test_transaction_rollback")
            .await
            .unwrap();
    }
}
