use libsql_local::Connection;

#[tokio::main]
async fn main() {
    let conn = Connection::connect(":memory:", false).await.unwrap();

    let query = conn
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
        .unwrap();

    dbg!(query);
}
