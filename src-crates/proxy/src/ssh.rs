use crate::Error;
use russh::client::{AuthResult, Config, Handler, Msg, connect};
use russh::keys::agent::client::AgentClient;
use russh::keys::{Algorithm, HashAlg, PrivateKeyWithHashAlg, PublicKey, decode_secret_key};
use russh::{ChannelStream, MethodSet};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SshProxyConfig {
    pub host: String,
    pub port: Option<u16>,
    pub user: String,
    pub auth: SshAuth,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "lowercase", content = "options")]
pub enum SshAuth {
    Password {
        password: String,
    },
    Key {
        key: String,
        password: Option<String>,
    },
    Agent {
        // macOS & Linux: Unix Domain Socket -> Default: $SSH_AUTH_SOCK
        // Windows: Named Pipe -> Default: WINDOWS_DEFAULT_AGENT_PATH
        agent_endpoint: Option<String>,
    },
}

#[cfg(target_os = "windows")]
const WINDOWS_DEFAULT_AGENT_PATH: &str = r"\\.\pipe\openssh-ssh-agent";

impl SshProxyConfig {
    pub async fn to_stream(
        &self,
        target_host: &str,
        target_port: u16,
        origin_host: &str,
        origin_port: u16,
    ) -> Result<ChannelStream<Msg>, Error> {
        let client = Client {};
        let config = Arc::new(Config::default());
        let port = self.port.unwrap_or(22);
        let mut session = connect(config, (self.host.clone(), port), client).await?;

        let rst = match &self.auth {
            SshAuth::Password { password } => {
                session.authenticate_password(&self.user, password).await?
            }
            SshAuth::Key { key, password } => {
                let key = decode_secret_key(key, password.as_deref())?;
                let hash = match key.algorithm() {
                    Algorithm::Rsa { .. } => session
                        .best_supported_rsa_hash()
                        .await
                        .unwrap_or(None)
                        .flatten(),
                    _ => None,
                };
                let key = PrivateKeyWithHashAlg::new(Arc::new(key), hash);
                session.authenticate_publickey(&self.user, key).await?
            }
            SshAuth::Agent { agent_endpoint } => {
                let mut agent = match agent_endpoint {
                    #[cfg(any(target_os = "macos", target_os = "linux"))]
                    Some(p) => AgentClient::connect_uds(p).await?,

                    #[cfg(any(target_os = "macos", target_os = "linux"))]
                    None => AgentClient::connect_env().await?,

                    #[cfg(target_os = "windows")]
                    Some(p) => AgentClient::connect_named_pipe(p).await?,

                    #[cfg(target_os = "windows")]
                    None => AgentClient::connect_named_pipe(WINDOWS_DEFAULT_AGENT_PATH).await?,
                };

                let identities = agent.request_identities().await?;
                let mut auth_rst = AuthResult::Failure {
                    remaining_methods: MethodSet::empty(),
                    partial_success: false,
                };
                let mut cache: Option<Option<HashAlg>> = None;
                for identity in identities {
                    let hash = match identity.algorithm() {
                        Algorithm::Rsa { .. } => match cache {
                            Some(cached) => cached,
                            None => {
                                let hash = session
                                    .best_supported_rsa_hash()
                                    .await
                                    .unwrap_or(None)
                                    .flatten();
                                cache = Some(hash);
                                hash
                            }
                        },
                        _ => None,
                    };
                    auth_rst = session
                        .authenticate_publickey_with(&self.user, identity, hash, &mut agent)
                        .await?;
                    if auth_rst.success() {
                        break;
                    }
                }
                auth_rst
            }
        };

        // TODO: Can provide more specific failure reason via AuthResult::Failure
        if !rst.success() {
            return Err(Error::AuthenticateFail);
        }

        let channel = session
            .channel_open_direct_tcpip(
                target_host,
                target_port as u32,
                origin_host,
                origin_port as u32,
            )
            .await?;

        Ok(channel.into_stream())
    }
}

struct Client {}

impl Handler for Client {
    type Error = Error;

    // TODO: This needs to be verified
    async fn check_server_key(&mut self, _: &PublicKey) -> Result<bool, Self::Error> {
        Ok(true)
    }
}
