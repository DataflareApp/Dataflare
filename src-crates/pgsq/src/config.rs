use crate::{Error, Result, socket::Stream};
use proxy::ProxyConfig;
use std::fmt::Debug;
use tokio::net::TcpStream;
use tokio_native_tls::native_tls::{Certificate, Identity};

#[derive(Clone)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: Option<String>,
    pub database: String,
    pub application_name: Option<String>,
    pub extra_float_digits: Option<String>,
    pub initial_sql: Option<String>,
    pub tls_mode: TlsMode,
    pub tls_root_cert: Option<Certificate>,
    pub tls_client_cert: Option<Identity>,
    pub proxy: Option<ProxyConfig>,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            host: "localhost".into(),
            port: 5432,
            username: "postgres".into(),
            password: None,
            database: "".into(),
            application_name: None,
            extra_float_digits: Some("2".into()),
            initial_sql: None,
            tls_mode: TlsMode::Preferred,
            tls_root_cert: None,
            tls_client_cert: None,
            proxy: None,
        }
    }
}

impl Debug for Config {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Config").finish()
    }
}

impl Config {
    pub(crate) async fn connect_stream(&self) -> Result<Stream> {
        if let Some(proxy) = &self.proxy {
            let stream = proxy.connect_stream(&self.host, self.port).await?;
            return Ok(Stream::Ssh(stream));
        }
        let stream = TcpStream::connect(self.addr()).await?;
        stream.set_nodelay(true)?;
        Ok(Stream::Tcp(stream))
    }

    fn addr(&self) -> String {
        // IPv6
        if self.host.contains(':') {
            if self.host.starts_with('[') {
                return format!("{}:{}", self.host, self.port);
            } else {
                return format!("[{}]:{}", self.host, self.port);
            }
        }
        // IPv4 or Domain
        format!("{}:{}", self.host, self.port)
    }
}

#[derive(Debug, Clone, Copy)]
pub enum TlsMode {
    Disabled,
    Allow,
    Preferred,
    Required,
    VerifyCa,
    VerifyFull,
}

pub fn load_root_cert(value: &str) -> Result<Certificate> {
    Certificate::from_pem(value.as_bytes())
        .map_err(|err| Error::tls("invalid root certificate", err))
}

pub fn load_client_cert(cert: &str, key: &str) -> Result<Identity> {
    Identity::from_pkcs8(cert.as_bytes(), key.as_bytes())
        .map_err(|err| Error::tls("invalid client certificate", err))
}
