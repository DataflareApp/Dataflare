use thrift::Error as ThriftError;

pub type Result<T, E = Error> = std::result::Result<T, E>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Thrift protocol error: {0}")]
    Thrift(String),

    #[error("HTTP error: {}", reqwest::format_http_error(.0))]
    Http(#[from] reqwest::Error),

    #[error("HTTP error: {0}")]
    HttpStatus(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Status error: {code} {message}")]
    Status { code: i32, message: String },

    #[error("Unsupported result format: {0}")]
    UnsupportedResultFormat(String),

    #[error("Invalid session state: {0}")]
    InvalidSessionState(String),

    #[error("Operation failed: {0}")]
    OperationFailed(String),

    #[error("Schema mismatch: expected {expected}, got {got}")]
    SchemaMismatch { expected: String, got: String },

    #[error("Serialization error: {0}")]
    Serialization(String),
}

impl From<ThriftError> for Error {
    fn from(e: ThriftError) -> Self {
        Error::Thrift(e.to_string())
    }
}
