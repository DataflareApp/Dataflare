#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Proxy IO error: {0}")]
    IO(#[from] std::io::Error),
    #[error("SSH proxy error: {0}")]
    Russh(#[from] russh::Error),
    #[error("SSH proxy key error: {0}")]
    RusshKeys(#[from] russh::keys::Error),
    #[error("SSH Agent auth error: {0}")]
    RusshAgent(#[from] russh::AgentAuthError),
    #[error("SSH proxy error: Authenticate failed")]
    AuthenticateFail,
}
