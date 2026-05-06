use proxy::{Proxy, ProxyConfig, SshAuth, SshProxyConfig};
use tokio::time::{Duration, sleep};

#[tokio::main]
async fn main() {
    let proxy = Proxy::new(
        "1.1.1.1".into(),
        80,
        ProxyConfig::Ssh(SshProxyConfig {
            host: "127.0.0.1".into(),
            port: Some(22),
            user: "root".into(),
            auth: SshAuth::Password {
                password: "123456".into(),
            },
        }),
    );

    let (addr, _handler) = proxy.listen().await.unwrap();
    dbg!(addr);
    sleep(Duration::from_secs(3)).await;
}
