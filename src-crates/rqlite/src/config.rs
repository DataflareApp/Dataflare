use proxy::ProxyConfig;
use url::Url;

#[derive(Debug)]
pub struct Config {
    pub protocol: Protocol,
    pub host: String,
    pub port: u16,
    pub auth: Option<Auth>,
    pub allow_invalid_certs: bool,
    pub proxy: Option<ProxyConfig>,
}

#[derive(Debug)]
pub enum Protocol {
    Https,
    Http,
}

#[derive(Debug)]
pub struct Auth {
    pub user: String,
    pub password: String,
}

#[derive(Debug)]
pub(crate) struct DatabaseUrl {
    pub(crate) select: Url,
    pub(crate) query: Url,
    pub(crate) execute: Url,
    pub(crate) transaction: Url,
    pub(crate) status: Url,
}

impl Config {
    pub(crate) fn url(&self) -> Result<DatabaseUrl, url::ParseError> {
        let protocol = match self.protocol {
            Protocol::Https => "https",
            Protocol::Http => "http",
        };
        let basic = format!("{}://{}:{}", protocol, convert_host(&self.host), self.port);
        let mut select = Url::parse(&format!("{basic}/db/query?blob_array"))?;
        let mut execute = Url::parse(&format!("{basic}/db/execute"))?;
        let mut transaction = Url::parse(&format!("{basic}/db/execute?transaction"))?;
        let mut query = Url::parse(&format!("{basic}/db/request?blob_array&timings"))?;
        let mut status = Url::parse(&format!("{basic}/status"))?;
        if let Some(auth) = &self.auth {
            for u in [
                &mut select,
                &mut execute,
                &mut transaction,
                &mut query,
                &mut status,
            ] {
                let _ = u.set_username(&auth.user);
                let _ = u.set_password(Some(&auth.password));
            }
        }
        Ok(DatabaseUrl {
            select,
            execute,
            transaction,
            query,
            status,
        })
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
