use hmac::digest::InvalidLength;
use pgwire::error::PgWireError;
use pgwire::messages::{PgWireBackendMessage, response::ErrorResponse};
use std::{fmt::Display, string::FromUtf8Error};

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("TLS error: {0}")]
    Tls(String),
    #[error("{0}")]
    Proxy(#[from] proxy::Error),
    #[error("pgwire error: {0}")]
    PgWire(#[from] PgWireError),
    #[error("Message error: {0}")]
    Protocol(String),
    #[error("{0}")]
    ErrorResponse(String),
    #[error("Base64 error: {0}")]
    Base64(&'static str, base64::DecodeError),
    #[error("UTF-8 error: '{0}' {1}")]
    Utf8(&'static str, FromUtf8Error),
    #[error("Hmac::<Sha256> error: invalid length")]
    HmacSha256(#[from] InvalidLength),
    #[error("saslprep error: {0}")]
    Saslprep(#[from] stringprep::Error),
}

impl Error {
    pub fn protocol(expect: &str, msg: PgWireBackendMessage) -> Self {
        Error::Protocol(format!("expected '{expect}' but received '{:?}'", msg))
    }

    pub fn tls(msg: &str, err: impl Display) -> Self {
        Error::Tls(format!("{msg}, {err}"))
    }

    pub fn error_response(err: ErrorResponse) -> Self {
        let msg = err
            .fields
            .into_iter()
            .filter_map(|(code, value)| {
                //  https://www.postgresql.org/docs/current/protocol-error-fields.html
                let code = match code {
                    b'S' => "Severity",
                    // V is identical to S but without localization; filter it out here
                    b'V' => return None,
                    b'C' => "Code",
                    b'M' => "Message",
                    b'D' => "Detail",
                    b'H' => "Hint",
                    b'P' => "Position",
                    b'p' => "InternalPosition",
                    b'q' => "InternalQuery",
                    b'W' => "Where",
                    b's' => "Schema",
                    b't' => "Table",
                    b'c' => "Column",
                    b'd' => "Data type",
                    b'n' => "Constraint",
                    b'F' => "File",
                    b'L' => "Line",
                    b'R' => "Routine",
                    _ => "Unknown",
                };
                Some(format!("{}: {}", code, value))
            })
            .collect::<Vec<_>>()
            .join(", ");
        Self::ErrorResponse(msg)
    }
}
