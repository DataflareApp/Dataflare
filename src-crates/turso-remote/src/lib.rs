mod decode;
mod error;
mod protocol;

use crate::protocol::{
    PipelineRequest, PipelineResponse, RequestItem, StreamResponse, StreamResult,
};
pub use error::{Error, Result, StatusError};
use query::Query;
use reqwest::{Client as HttpClient, ClientBuilder, Url};
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct Client {
    client: HttpClient,
    url: Url,
    token: String,
}

impl Client {
    pub fn new<U, A>(url: U, auth_token: A) -> Result<Self>
    where
        U: AsRef<str>,
        A: Into<String>,
    {
        let original_url = url.as_ref().to_owned();
        let pipeline_url = normalize_pipeline_url(&original_url)?;
        let client = ClientBuilder::new()
            .timeout(Duration::from_secs(60))
            .user_agent("Dataflare")
            .build()?;
        Ok(Self {
            client,
            url: pipeline_url,
            token: auth_token.into(),
        })
    }

    async fn run_pipeline(&self, pipeline: PipelineRequest) -> Result<PipelineResponse> {
        let res = self
            .client
            .post(self.url.clone())
            .bearer_auth(&self.token)
            .json(&pipeline)
            .send()
            .await?;

        if !res.status().is_success() {
            return Err(Error::Status(StatusError {
                code: res.status(),
                body: res.text().await.unwrap_or_default(),
            }));
        }

        let body = res.json::<PipelineResponse>().await?;
        Ok(body)
    }

    pub async fn query<S>(&self, sql: S) -> Result<Query>
    where
        S: Into<String>,
    {
        let sql = sql.into();
        let mut body = self
            .run_pipeline(PipelineRequest {
                requests: vec![RequestItem::execute(&sql), RequestItem::close()],
            })
            .await?;

        if body.results.len() != 2 {
            return Err(Error::Protocol(format!(
                "Expected exactly 2 pipeline results, received {}",
                body.results.len()
            )));
        }

        for result in &body.results {
            if let StreamResult::Error { error } = result {
                return Err(Error::Execute {
                    code: error.code.clone(),
                    message: error.message.clone(),
                });
            }
        }

        let result = match body.results.remove(0) {
            StreamResult::Ok {
                response: StreamResponse::Execute { result },
            } => result,
            _ => unreachable!(),
        };

        decode::to_query(result)
    }

    pub async fn transaction<S: ToString>(&self, sqls: &[S]) -> Result<()> {
        let mut sql = Vec::with_capacity(sqls.len() + 2);

        sql.push("BEGIN;".to_string());
        for s in sqls {
            let mut s = s.to_string();
            if !s.trim_end().ends_with(';') {
                s.push(';');
            }
            sql.push(s);
        }
        sql.push("COMMIT;".to_string());

        let body = self
            .run_pipeline(PipelineRequest {
                requests: vec![
                    RequestItem::Sequence {
                        sql: sql.join("\n"),
                    },
                    RequestItem::close(),
                ],
            })
            .await?;

        if body.results.len() != 2 {
            return Err(Error::Protocol(format!(
                "Expected exactly 2 pipeline results, received {}",
                body.results.len()
            )));
        }

        for result in &body.results {
            if let StreamResult::Error { error } = result {
                return Err(Error::Execute {
                    code: error.code.clone(),
                    message: error.message.clone(),
                });
            }
        }

        Ok(())
    }
}

fn normalize_pipeline_url(input: &str) -> Result<Url> {
    let mut input = input.trim().to_string();
    // "libsql" schema is alias for "https"
    if input.starts_with("libsql://") {
        input = input.replacen("libsql://", "https://", 1);
    }
    if input.starts_with("turso://") {
        input = input.replacen("turso://", "https://", 1);
    }

    let mut url = input
        .parse::<Url>()
        .map_err(|err| Error::Url(err, input.to_owned()))?;

    if url.scheme() != "http" && url.scheme() != "https" {
        return Err(Error::Protocol(format!(
            "Unsupported URL scheme '{}'",
            url.scheme()
        )));
    }

    let mut path = url.path().trim_end_matches('/').to_string();
    path.push_str("/v2/pipeline");
    url.set_path(&path);

    Ok(url)
}

#[cfg(test)]
mod tests {
    use super::*;
    use query::Value;
    use std::time::SystemTime;

    fn conn() -> Client {
        let url = "";
        let token = "";
        let client = Client::new(url, token).unwrap();
        client
    }

    #[test]
    fn test_normalize_pipeline_url() {
        let url = "libsql://example.com";
        let normalized = normalize_pipeline_url(url).unwrap();
        assert_eq!(normalized.as_str(), "https://example.com/v2/pipeline");
    }

    #[test]
    fn test_normalize_pipeline_url_with_path() {
        let url = "libsql://example.com/some/path";
        let normalized = normalize_pipeline_url(url).unwrap();
        assert_eq!(
            normalized.as_str(),
            "https://example.com/some/path/v2/pipeline"
        );
    }

    #[test]
    fn test_normalize_pipeline_url_with_unsupported_scheme() {
        let url = "ftp://example.com";
        let err = normalize_pipeline_url(url).unwrap_err();
        match err {
            Error::Protocol(msg) => assert!(msg.contains("Unsupported URL scheme")),
            _ => panic!("Expected Protocol error"),
        }
    }

    #[test]
    fn test_normalize_pipeline_url_https() {
        let url = "https://example.com";
        let normalized = normalize_pipeline_url(url).unwrap();
        assert_eq!(normalized.as_str(), "https://example.com/v2/pipeline");
    }

    #[test]
    fn test_normalize_pipeline_url_with_port() {
        let url = "libsql://example.com:8080";
        let normalized = normalize_pipeline_url(url).unwrap();
        assert_eq!(normalized.as_str(), "https://example.com:8080/v2/pipeline");
    }

    #[tokio::test]
    async fn test_query_select() {
        let client = conn();
        let query = client
            .query("SELECT 1 as number_1, 2 as NUMBER_2")
            .await
            .unwrap();
        assert_eq!(query.columns.len(), 2);
        assert_eq!(query.columns[0].name, "number_1");
        assert_eq!(query.columns[1].name, "NUMBER_2");
        assert!(!query.rows.is_empty());
    }

    #[tokio::test]
    async fn test_query_result_structure() {
        let client = conn();
        let query = client
            .query("SELECT 42 as answer, 'hello' as greeting")
            .await
            .unwrap();
        assert_eq!(query.columns.len(), 2);
        assert_eq!(query.columns[0].name, "answer");
        assert_eq!(query.columns[1].name, "greeting");
        assert_eq!(query.rows.len(), 1);
    }

    #[tokio::test]
    async fn test_query_null_value() {
        let client = conn();
        let query = client.query("SELECT NULL as null_col").await.unwrap();
        assert_eq!(query.columns.len(), 1);
        assert_eq!(query.columns[0].name, "null_col");
    }

    #[tokio::test]
    async fn test_query_values() {
        let client = conn();
        let query = client
            .query("SELECT 1, 3.1415926, 'Hello WORLD ', X'FF00FF'")
            .await
            .unwrap();
        assert_eq!(query.columns.len(), 4);
        assert_eq!(query.columns[0].name, "1");
        assert_eq!(query.rows[0][0], Value::I64(1));
        assert_eq!(query.columns[1].name, "3.1415926");
        assert_eq!(query.rows[0][1], Value::F64(3.1415926));
        assert_eq!(query.columns[2].name, "'Hello WORLD '");
        assert_eq!(query.rows[0][2], Value::String("Hello WORLD ".to_string()));
        assert_eq!(query.columns[3].name, "X'FF00FF'");
        assert_eq!(
            query.rows[0][3],
            Value::from_bytes([0xFF, 0x00, 0xFF].to_vec())
        );
    }

    #[tokio::test]
    async fn test_query_blob() {
        let client = conn();
        let query = client
            .query("SELECT x'FF', X'FF', X'FF00FF', x'00'")
            .await
            .unwrap();
        assert_eq!(query.columns.len(), 4);
        assert_eq!(query.rows[0][0], Value::from_bytes([0xFF].to_vec()));
        assert_eq!(query.rows[0][1], Value::from_bytes([0xFF].to_vec()));
        assert_eq!(
            query.rows[0][2],
            Value::from_bytes([0xFF, 0x00, 0xFF].to_vec())
        );
        assert_eq!(query.rows[0][3], Value::from_bytes([0x00].to_vec()));
    }

    #[tokio::test]
    async fn test_query_multiple_rows() {
        let client = conn();
        let query = client
            .query("SELECT 1 as id UNION ALL SELECT 2 UNION ALL SELECT 3")
            .await
            .unwrap();
        assert_eq!(query.rows.len(), 3);
    }

    #[tokio::test]
    async fn test_query_empty_result() {
        let client = conn();
        let query = client.query("SELECT 1 as col WHERE 0").await.unwrap();
        assert_eq!(query.rows.len(), 0);
    }

    #[tokio::test]
    async fn test_drop_table() {
        let client = conn();
        let query = client
            .query("DROP TABLE IF EXISTS test_table")
            .await
            .unwrap();
        assert_eq!(query.columns.len(), 0);
        assert_eq!(query.rows.len(), 0);
        assert_eq!(query.rows_affected, Some(0));
    }

    #[tokio::test]
    async fn test_error_sql() {
        let client = conn();
        let err = client.query("ERROR SQL").await.err().unwrap().to_string();
        assert!(err.contains("SQL_PARSE_ERROR"));
    }

    #[tokio::test]
    async fn test_transaction_select() {
        let client = conn();
        client
            .transaction(&["SELECT 1;", "SELECT 2"])
            .await
            .unwrap();
    }

    #[tokio::test]
    async fn test_transaction_delete() {
        let client = conn();
        let id = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_millis();
        client
            .query(&format!("CREATE TABLE _temp_{} (id INTEGER)", id))
            .await
            .unwrap();
        client
            .query(&format!("INSERT INTO _temp_{} (id) VALUES (1), (2)", id))
            .await
            .unwrap();
        let query = client
            .query(&format!("SELECT COUNT(*) FROM _temp_{}", id))
            .await
            .unwrap();
        assert_eq!(query.rows[0][0], Value::I64(2));

        client
            .transaction(&[&format!("DELETE FROM _temp_{} WHERE id = 1", id)])
            .await
            .unwrap();
        let query = client
            .query(&format!("SELECT COUNT(*) FROM _temp_{}", id))
            .await
            .unwrap();
        assert_eq!(query.rows[0][0], Value::I64(1));

        let err = client
            .transaction(&[
                format!("INSERT INTO _temp_{} (id) VALUES (3)", id),
                format!("DELETE FROM _temp_{} WHERE id = 2", id),
                "ERROR SQL".into(),
            ])
            .await
            .err()
            .unwrap();
        assert!(err.to_string().contains("syntax error at"));
        let query = client
            .query(&format!("SELECT COUNT(*) FROM _temp_{}", id))
            .await
            .unwrap();
        assert_eq!(query.rows[0][0], Value::I64(1));

        client
            .query(&format!("DROP TABLE _temp_{}", id))
            .await
            .unwrap();
    }
}
