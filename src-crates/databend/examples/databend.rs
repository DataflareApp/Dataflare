use databend::{Config, Connection};

#[tokio::main]
async fn main() {
    let config = Config {
        https: false,
        host: "localhost".into(),
        port: 8000,
        username: "root".into(),
        password: "".into(),
        database: "default".into(),
        proxy: None,
    };
    let mut conn = Connection::open_with(config).unwrap();
    let query = conn
        .query(
            r#"
        SELECT
            null,
            42,
            3.14,
            'Hello world'
    "#,
        )
        .await
        .unwrap();
    dbg!(query);
}
