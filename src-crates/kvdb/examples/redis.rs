use connection_config::{RedisConfig, RedisTlsConfig, TlsConfig};
use kvdb::KvDatabaseConfig;

#[tokio::main]
async fn main() {
    let config = KvDatabaseConfig::Redis(RedisConfig {
        host: Some("localhost".into()),
        port: Some(6379),
        username: None,
        password: None,
        readonly: false,
        tls: RedisTlsConfig {
            enabled: false,
            insecure: false,
            config: TlsConfig {
                cert: None,
                key: None,
                ca: None,
            },
        },
        proxy: None,
    });
    let db = config.connect().await.unwrap();

    let keys = db.keys("0".into(), None, 10, None).await.unwrap();
    dbg!(keys);

    // db.get_content("".into(), Key::String("()".into()))
    //     .await
    //     .unwrap();
}
