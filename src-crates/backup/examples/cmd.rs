#[tokio::main]
async fn main() {
    let mut cmd = backup::Cmd::new("echo");
    cmd.arg("Hello, World!");

    let output = env!("CARGO_MANIFEST_DIR").to_string() + "/output.txt";
    println!("Output: {output}");

    let (mut rx, _killer) = cmd.run(output).await.unwrap();

    loop {
        match rx.recv().await {
            Some(msg) => {
                dbg!(msg);
            }
            None => break,
        }
    }
}
