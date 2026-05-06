use databricks::Connection;
use databricks::config::Config;
use tokio::sync::{Mutex, MutexGuard, OnceCell};

fn config() -> Config {
    Config {
        https: true,
        host: "".into(),
        port: 443,
        http_path: "/sql/1.0/warehouses/xxx".into(),
        token: "".into(),
        catalog: None,
        schema: None,
        allow_invalid_certs: false,
        proxy: None,
    }
}

static SHARED_CONNECTION: OnceCell<Mutex<Connection>> = OnceCell::const_new();

#[allow(dead_code)]
pub async fn shared_connection() -> MutexGuard<'static, Connection> {
    SHARED_CONNECTION
        .get_or_init(|| async { Mutex::new(Connection::open_with(config()).await.unwrap()) })
        .await
        .lock()
        .await
}

#[allow(dead_code)]
pub async fn connection() -> Connection {
    Connection::open_with(config()).await.unwrap()
}

#[allow(dead_code)]
pub async fn connection_with_catalog_schema(
    catalog: Option<&str>,
    schema: Option<&str>,
) -> Connection {
    let mut cfg = config();
    cfg.catalog = catalog.map(|c| c.into());
    cfg.schema = schema.map(|s| s.into());
    Connection::open_with(cfg).await.unwrap()
}

#[allow(dead_code)]
pub fn unique_table_name(prefix: &str) -> String {
    format!(
        "__{prefix}_{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis()
    )
}
