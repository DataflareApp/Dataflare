pub type Result<T, E = Error> = std::result::Result<T, E>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Dylib(#[from] crate::Error),
    #[error("{0}")]
    Message(String),
    #[error("Mutex error")]
    Mutex,
}
