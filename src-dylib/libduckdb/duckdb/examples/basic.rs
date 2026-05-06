use duckdb::{AccessMode, Config, Database};

fn main() {
    let mut config = Config::new();
    config.access_mode(AccessMode::Automatic).unwrap();
    let db = Database::open_with_memory(config).unwrap();
    let conn = db.connect().unwrap();

    let query = conn.query("select version()").unwrap();
    let version = &query.rows[0][0];
    dbg!(version);

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
