use databricks::{Connection, config::Config};

#[tokio::main]
async fn main() {
    let config = Config {
        https: true,
        host: "".into(),
        port: 443,
        http_path: "/sql/1.0/warehouses/xxx".into(),
        token: "".into(),
        catalog: None,
        schema: None,
        allow_invalid_certs: false,
        proxy: None,
    };

    let mut conn = Connection::open_with(config).await.unwrap();

    let query = conn
        .query(
            r#"
            select
                1,
                true,
                null,
                'hello',
                to_binary('00ff00'),
                array(1, 2, 3)
        "#,
        )
        .await
        .unwrap();

    dbg!(query);
}
