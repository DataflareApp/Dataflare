use reqwest::StatusCode;
use std::fmt::{self, Display};

pub type Result<T, E = Error> = std::result::Result<T, E>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("HTTP: {message}", message = reqwest::format_http_error(.0))]
    Http(#[from] reqwest::Error),
    #[error("URL error: {0}\n'{1}'")]
    Url(url::ParseError, String),
    #[error("{0}")]
    Status(StatusError),
    #[error("{0}")]
    Protocol(String),
    #[error("Code: {code}, Message: {message}")]
    Execute { code: String, message: String },
}

#[derive(Debug)]
pub struct StatusError {
    pub code: StatusCode,
    pub body: String,
}

impl Display for StatusError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.body.is_empty() {
            write!(f, "HTTP Status: {}", self.code)
        } else {
            write!(f, "HTTP Status: {}, Body: {}", self.code, self.body)
        }
    }
}
