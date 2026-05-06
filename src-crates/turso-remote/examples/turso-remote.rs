use turso_remote::Client;

#[tokio::main]
async fn main() {
    let url = "";
    let auth_token = "";

    let client = Client::new(url, auth_token).unwrap();

    let query = client
        .query(
            r#"
        SELECT 
            1 as int,
            3.14 as float,
            'hello' as text,
            x'FF00FF' as blob,
            NULL as empty
        "#,
        )
        .await
        .unwrap();

    dbg!(query);
}
