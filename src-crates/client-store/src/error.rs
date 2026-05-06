use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Local data IO: {0}")]
    Io(#[from] std::io::Error),
    #[error("Local data database: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Local data Deserialize: {0}")]
    Deserialize(#[from] serde_rusqlite::Error),
    #[error("Local data Deserialize JSON: {0}")]
    DeserializeJson(#[from] serde_json::Error),
    #[error("Local data Crypto: {0}")]
    Crypto(#[from] super::crypto::CryptoError),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
