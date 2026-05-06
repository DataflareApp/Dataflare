use crate::response::QueryError;
use reqwest::StatusCode;
use std::fmt::Display;

pub type Result<T, E = Error> = std::result::Result<T, E>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("HTTP: {message}", message = reqwest::format_http_error(.0))]
    Http(#[from] reqwest::Error),
    #[error("URL error: {0}")]
    Url(#[from] url::ParseError),
    #[error("Invalid header value: {0}")]
    InvalidHeaderValue(String),
    #[error("{0}")]
    Status(StatusError),
    #[error("Request failed after {retries} retries. Status: {status}")]
    Retry { retries: u32, status: StatusCode },
    #[error("{0}")]
    Query(QueryError),
    #[error("Base64 decode error: {0}")]
    Base64(#[from] base64::DecodeError),
}

#[derive(Debug)]
pub struct StatusError {
    pub code: StatusCode,
    pub body: String,
}

impl Display for StatusError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.body.is_empty() {
            write!(f, "HTTP Status: {}", self.code)
        } else {
            write!(f, "HTTP Status: {}, Body: {}", self.code, self.body)
        }
    }
}
