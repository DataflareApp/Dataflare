mod error;
mod ssh;
pub use error::Error;
use futures_util::FutureExt;
use reqwest::{CustomProxyConnector, CustomProxyStream};
use russh::ChannelStream;
use russh::client::Msg;
use serde::{Deserialize, Serialize};
pub use ssh::{SshAuth, SshProxyConfig};
use std::net::Ipv4Addr;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::io::copy_bidirectional;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc::{Sender, channel};

#[derive(Debug, Clone)]
pub struct Proxy {
    host: String,
    port: u16,
    config: ProxyConfig,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "lowercase", content = "options")]
pub enum ProxyConfig {
    Ssh(SshProxyConfig),
}

impl Proxy {
    pub fn new(host: String, port: u16, config: ProxyConfig) -> Self {
        Self { host, port, config }
    }

    // Since MySQL and Redis do not yet support using a user-provided Stream, the proxy is set up as a TCP server
    // This method is also used for backups, which invoke command-line tools directly and cannot use Stream
    pub async fn listen(self) -> std::result::Result<(SocketAddr, ProxyHandler), Error> {
        // Check proxy connectivity before each start; if there's an error, it helps return a more specific error message
        self.check_proxy().await?;

        let listener = TcpListener::bind("127.0.0.1:0").await?;
        let addr = listener.local_addr()?;
        let (tx, mut rx) = channel::<()>(1);

        tokio::spawn(async move {
            loop {
                tokio::select! {
                    _ = rx.recv() => {
                        break;
                    }
                    Ok((from_stream, from_addr)) = listener.accept() => {
                        tokio::spawn(self.clone().handle(from_stream, from_addr));
                    }
                }
            }
        });

        Ok((addr, ProxyHandler { _sender: tx }))
    }

    async fn check_proxy(&self) -> std::result::Result<(), Error> {
        match &self.config {
            ProxyConfig::Ssh(config) => {
                config
                    .to_stream(&self.host, self.port, &Ipv4Addr::LOCALHOST.to_string(), 0)
                    .await?;
            }
        }
        Ok(())
    }

    async fn handle(self, mut from_stream: TcpStream, from_addr: SocketAddr) {
        match self.config {
            ProxyConfig::Ssh(config) => {
                let rst = config
                    .to_stream(
                        &self.host,
                        self.port,
                        &from_addr.ip().to_string(),
                        from_addr.port(),
                    )
                    .await;
                if let Ok(mut to_stream) = rst {
                    let _ = copy_bidirectional(&mut from_stream, &mut to_stream).await;
                }
            }
        }
    }
}

#[derive(Debug)]
pub struct ProxyHandler {
    _sender: Sender<()>,
}

pub type SshStream = ChannelStream<Msg>;

impl ProxyConfig {
    pub async fn connect_stream(&self, host: &str, port: u16) -> Result<SshStream, Error> {
        match self {
            ProxyConfig::Ssh(config) => {
                config
                    .to_stream(host, port, &Ipv4Addr::LOCALHOST.to_string(), 0)
                    .await
            }
        }
    }

    pub fn into_http_connector(self) -> CustomProxyConnector {
        match self {
            ProxyConfig::Ssh(config) => {
                let config = Arc::new(config);
                CustomProxyConnector::new(move |uri| {
                    let config = config.clone();
                    async move {
                        let host = uri.host().ok_or("no host in URL")?;
                        let port = match (uri.scheme_str(), uri.port_u16()) {
                            (_, Some(p)) => Ok(p),
                            (Some("http"), None) => Ok(80),
                            (Some("https"), None) => Ok(443),
                            _ => Err("scheme is unknown and port is empty"),
                        }?;
                        let stream = config
                            .to_stream(host, port, &Ipv4Addr::LOCALHOST.to_string(), 0)
                            .await?;
                        Ok(Box::new(stream) as Box<dyn CustomProxyStream>)
                    }
                    .boxed()
                })
            }
        }
    }
}
