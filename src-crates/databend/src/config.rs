use crate::Result;
use proxy::ProxyConfig;
use reqwest::Url;

#[derive(Debug)]
pub struct Config {
    pub https: bool,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub database: String,
    pub proxy: Option<ProxyConfig>,
}

impl Config {
    fn protocol(&self) -> &str {
        if self.https { "https" } else { "http" }
    }

    pub(crate) fn url(&self) -> Result<Url> {
        let host = convert_host(&self.host);
        let url = format!("{}://{}:{}", self.protocol(), host, self.port).parse()?;
        Ok(url)
    }

    pub(crate) fn query_url(&self) -> Result<Url> {
        let host = convert_host(&self.host);
        let url = format!("{}://{}:{}/v1/query", self.protocol(), host, self.port).parse()?;
        Ok(url)
    }
}

fn convert_host(host: &str) -> String {
    if host.starts_with('[') {
        return host.into();
    }
    if host.contains(':') {
        return format!("[{}]", host);
    }
    host.into()
}
