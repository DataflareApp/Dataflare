use rqlite::*;

#[tokio::main]
async fn main() {
    let config = Config {
        protocol: Protocol::Http,
        host: "localhost".into(),
        port: 4001,
        auth: None,
        allow_invalid_certs: true,
        proxy: None,
    };
    let conn = Connection::open_with(config).unwrap();
    let status = conn.status().await.unwrap();
    dbg!(status);
    let rst = conn.query("SELECT random()").await.unwrap();
    dbg!(rst);
}
