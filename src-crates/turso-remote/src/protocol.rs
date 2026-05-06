use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub(crate) struct PipelineRequest {
    pub requests: Vec<RequestItem>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub(crate) enum RequestItem {
    Execute { stmt: Statement },
    Sequence { sql: String },
    Close,
}

impl RequestItem {
    pub fn execute<S: Into<String>>(sql: S) -> Self {
        Self::Execute {
            stmt: Statement { sql: sql.into() },
        }
    }

    pub fn close() -> Self {
        Self::Close
    }
}

#[derive(Debug, Serialize)]
pub(crate) struct Statement {
    pub sql: String,
}

#[derive(Debug, Deserialize)]
pub(crate) struct PipelineResponse {
    pub results: Vec<StreamResult>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub(crate) enum StreamResult {
    Ok { response: StreamResponse },
    Error { error: RemoteError },
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub(crate) enum StreamResponse {
    Execute { result: StatementResult },
    Sequence,
    Close,
}

#[derive(Debug, Clone, Deserialize)]
pub(crate) struct RemoteError {
    pub message: String,
    pub code: String,
}

#[derive(Debug, Clone, Deserialize)]
pub(crate) struct StatementResult {
    pub cols: Vec<Column>,
    pub rows: Vec<Vec<Value>>,
    pub affected_row_count: u64,
    #[serde(default)]
    pub query_duration_ms: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub(crate) struct Column {
    pub name: String,
    pub decltype: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub(crate) enum Value {
    Null,
    Integer { value: String },
    Float { value: f64 },
    Text { value: String },
    Blob { base64: String },
}
