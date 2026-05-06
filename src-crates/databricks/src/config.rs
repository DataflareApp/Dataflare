use proxy::ProxyConfig;

/// Databricks Thrift connection configuration.
#[derive(Debug)]
pub struct Config {
    /// Whether to use HTTPS (default: true).
    pub https: bool,
    /// Databricks workspace hostname.
    pub host: String,
    /// Port number (default: 443).
    pub port: u16,
    /// HTTP path for the Thrift endpoint (e.g., "/sql/1.0/warehouses/...").
    pub http_path: String,
    /// Personal access token for authentication.
    pub token: String,
    /// Initial catalog (optional).
    pub catalog: Option<String>,
    /// Initial schema (optional).
    pub schema: Option<String>,
    /// Whether to skip TLS certificate validation.
    pub allow_invalid_certs: bool,
    /// Optional proxy configuration (SSH tunnel).
    pub proxy: Option<ProxyConfig>,
}

impl Config {
    /// Extract warehouse ID from http_path.
    /// Example: "/sql/1.0/warehouses/abc123def456" -> Some("abc123def456")
    pub fn warehouse_id(&self) -> Option<&str> {
        self.http_path.split('/').last().filter(|s| !s.is_empty())
    }

    /// Build the full HTTPS/HTTP URL for the Thrift endpoint.
    pub fn endpoint_url(&self) -> String {
        let scheme = if self.https { "https" } else { "http" };
        let host = convert_host(&self.host);
        format!("{}://{}:{}{}", scheme, host, self.port, self.http_path)
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
