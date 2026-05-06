use turso_local::Connection;

#[tokio::main]
async fn main() {
    let conn = Connection::connect("", None).await.unwrap();

    let query = conn
        .query("SELECT 123, 3.1415926, 'hello', X'FF00FF', TRUE, NULL, random()")
        .unwrap();

    dbg!(query);
}
