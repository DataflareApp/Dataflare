use workers_analytics_engine::Connection;

#[tokio::main]
async fn main() {
    let account_id = "";
    let api_token = "";

    let conn = Connection::new(account_id.into(), api_token.into()).unwrap();

    let sql = r#"SELECT 'Hello' as hello"#;

    let result = conn.query(sql.into()).await.unwrap();
    dbg!(result);
}
