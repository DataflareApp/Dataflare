use mysql::{Compression, Connection, Flavor, Opts, OptsBuilder};

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let opts = OptsBuilder::default()
        .user(Some("root"))
        .pass(Some("password"))
        .ip_or_hostname("localhost")
        .tcp_port(3306)
        .db_name(Some("dataflare"))
        .compression(Compression::fast())
        .ssl_opts(None);
    let opts: Opts = opts.into();

    let mut conn = Connection::connect(opts, Flavor::MySql).await.unwrap();
    let res = conn
        .query(r#"select 1, true, null, 'hello world';"#)
        .await
        .unwrap();
    dbg!(res);
}
