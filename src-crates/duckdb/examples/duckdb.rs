use duckdb::Connection;

#[tokio::main]
async fn main() {
    let conn = Connection::connect("", false).await.unwrap();

    conn.execute(r"create table if not exists test (id uuid, age uint32)")
        .unwrap();
    conn.execute("insert into test (id, age) values (gen_random_uuid(), 12)")
        .unwrap();
    conn.execute("insert into test (id, age) values (gen_random_uuid(), 26)")
        .unwrap();
    conn.execute("insert into test default values").unwrap();

    // SELECT * FROM 'https://duckdb.org/data/records.json';
    let query = conn.query(r#"select * from test"#).unwrap();
    dbg!(query);
}
