use crate::response::DatabendError;
use reqwest::StatusCode;
use std::fmt::Display;

pub type Result<T, E = Error> = std::result::Result<T, E>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("HTTP: {message}", message = reqwest::format_http_error(.0))]
    Http(#[from] reqwest::Error),
    #[error("URL error: {0}")]
    Url(#[from] url::ParseError),
    #[error("{0}")]
    Status(StatusError),
    #[error("{0}")]
    Databend(DatabendError),
    #[error("Parse int: {0}")]
    ParseInt(#[from] std::num::ParseIntError),
    #[error("Parse float: {0}")]
    ParseFloat(#[from] std::num::ParseFloatError),
    #[error("Parse bytes: {0}")]
    ParseBytes(#[from] hex::FromHexError),
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
