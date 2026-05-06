use serde::Deserialize;
use std::fmt::Display;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryResponse {
    pub next_uri: Option<String>,
    pub columns: Option<Vec<Column>>,
    pub data: Option<Vec<Vec<serde_json::Value>>>,
    pub stats: QueryStats,
    pub error: Option<QueryError>,
    pub update_count: Option<u64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Column {
    pub name: String,
    #[serde(rename = "type")]
    pub datatype: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryStats {
    pub elapsed_time_millis: Option<u64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryError {
    pub error_code: i32,
    pub error_name: String,
    pub error_type: String,
    pub message: String,
    pub failure_info: Option<FailureInfo>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FailureInfo {
    #[serde(rename = "type")]
    pub failure_type: String,
    pub message: Option<String>,
}

impl Display for QueryError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}: {} ({})",
            self.error_name, self.message, self.error_type
        )
    }
}
