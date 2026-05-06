use clickhouse::{Config, Connection};

#[tokio::main]
async fn main() {
    let mut conn = Connection::open_with(Config {
        https: false,
        host: "localhost".into(),
        port: 8123,
        user: "default".into(),
        password: "".into(),
        database: "".into(),
        proxy: None,
    })
    .unwrap();

    let query = conn
        .query(r#"select 1, null, false, 3.14, 'hello';"#.into())
        // .query(r#"INSERT INTO "default"."types" ("id") VALUES (7);"#.into())
        .await
        .unwrap();
    dbg!(query);
}
