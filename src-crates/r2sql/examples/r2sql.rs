use r2sql::Connection;

#[tokio::main]
async fn main() {
    let account_id = "".to_string();
    let bucket_name = "".to_string();
    let api_token = "".to_string();

    let conn = Connection::new(account_id, bucket_name, api_token).unwrap();

    let rst = conn
        .query("select * from default.users limit 3".into())
        .await
        .unwrap();
    dbg!(&rst);

    // let rst = conn.query("DESCRIBE default.users;".into()).await.unwrap();
    // dbg!(&rst);
}
