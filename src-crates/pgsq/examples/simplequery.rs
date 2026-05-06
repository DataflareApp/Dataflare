use pgsq::{Config, Connection};

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let mut config = Config::default();
    config.password = Some("password".into());

    let mut conn = Connection::connect(config).await.unwrap();
    let rst = conn
        .query(
            r#"
SELECT 1 as a,
'hello world' as b,
null as c,
true as d,
'\xff'::bytea;
"#,
        )
        .await
        .unwrap();
    dbg!(rst);
}
