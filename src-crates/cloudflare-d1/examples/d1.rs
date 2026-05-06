use cloudflare_d1::Connection;

#[tokio::main]
async fn main() {
    let account_id = "";
    let database_id = "";
    let api_key = "";

    let conn =
        Connection::open(account_id.into(), database_id.into(), api_key.into(), None).unwrap();

    // Select
    let sql = r#"SELECT 'hello' as a, 123 as b, 1.234 as c, X'ffa1d2' as d;"#;
    let rst = conn.select(sql.into()).await.unwrap();
    dbg!(rst);

    // Query
    let sql = r#"SELECT * from types limit 2;"#;
    let rst = conn.query(sql.into()).await.unwrap();
    dbg!(rst);

    let sql = r#"INSERT INTO types (t, b, r) VALUES ('text', X'ff', 1.123);"#;
    let rst = conn.query(sql.into()).await.unwrap();
    dbg!(rst);

    // Execute
    let sql = r#"INSERT INTO types (t, b, r) VALUES ('text', X'ff', 1.123)"#;
    conn.execute(sql.into()).await.unwrap();
}
