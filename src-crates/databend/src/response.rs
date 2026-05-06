use serde::Deserialize;
use std::fmt::Display;

/// Response from Databend's `/v1/query` endpoint and page/state/final endpoints.
///
/// Reference: https://github.com/databendlabs/databend/blob/main/src/query/service/src/servers/http/v1/http_query_handlers.rs
#[derive(Debug, Deserialize)]
pub struct QueryResponse {
    pub state: ExecuteState,
    pub error: Option<DatabendError>,
    pub schema: Option<Vec<ResponseSchema>>,
    pub data: Vec<Vec<Option<String>>>,
    pub stats: ResponseStats,
    pub next_uri: Option<String>,
    pub final_uri: Option<String>,
    pub session: Option<serde_json::Value>,
    pub affect: Option<QueryAffect>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
pub enum ExecuteState {
    Starting,
    Running,
    Succeeded,
    Failed,
}

#[derive(Debug, Deserialize)]
pub struct DatabendError {
    pub code: i32,
    pub message: String,
    pub detail: Option<String>,
}

impl Display for DatabendError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match &self.detail {
            Some(detail) if !detail.is_empty() => {
                write!(
                    f,
                    "Code: {}, Message: {}, Detail: {}",
                    self.code, self.message, detail
                )
            }
            _ => write!(f, "Code: {}, Message: {}", self.code, self.message),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct ResponseStats {
    /// Duration in milliseconds (f64 from the server, we truncate to u32)
    pub running_time_ms: f64,
}

#[derive(Debug, Deserialize)]
pub struct ResponseSchema {
    pub name: String,
    pub r#type: String,
}

/// Query affect information (rows modified, etc.)
#[derive(Debug, Clone, Deserialize)]
pub struct QueryAffect {
    pub count: Option<u64>,
}
