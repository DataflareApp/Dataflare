use sqlcipher::Connection;

#[tokio::main]
async fn main() {
    let conn = Connection::connect("", false, "password").await.unwrap();
    let query = conn.query("SELECT random() as rand").unwrap();
    dbg!(query);
    conn.execute(r#"CREATE TABLE data ("id" INTEGER NOT NULL, PRIMARY KEY ("id"));"#)
        .unwrap();
    for i in 0..3 {
        conn.execute(&format!("INSERT INTO data (id) VALUES ({})", i))
            .unwrap();
    }
    let data = conn.query("SELECT * FROM data").unwrap();
    dbg!(data);
}
