use connection_config::CloudflareKvConfig;
use kvdb::{CloudflareKv, KvDatabase};

#[tokio::main]
async fn main() {
    let kv = CloudflareKv::new(CloudflareKvConfig {
        account_id: "".into(),
        api_token: "".into(),
        default_namespace: "demo".into(),
        readonly: false,
    })
    .unwrap();
    let namespaces = kv.namespaces().await.unwrap();
    dbg!(&namespaces);
    let keys = kv
        .keys(namespaces[0].id.clone(), None, 10, None)
        .await
        .unwrap();
    dbg!(&keys);
}
