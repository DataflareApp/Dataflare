use trino::{AuthConfig, Config, Connection};

#[tokio::main]
async fn main() {
    let config = Config {
        https: false,
        host: "localhost".into(),
        port: 8080,
        user: "root".into(),
        auth: AuthConfig::None,
        catalog: "system".into(),
        schema: "".into(),
        allow_invalid_certs: false,
        proxy: None,
    };
    let mut conn = Connection::open_with(config).unwrap();
    let query = conn
        .query(
            r#"
        SELECT
            null,
            random(),
            123,
            'Hello world'
    "#,
        )
        .await
        .unwrap();
    dbg!(query);
}
