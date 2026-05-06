use backup::{BackupConfig, SqliteBackupConfig};

#[tokio::main]
async fn main() {
    let config = BackupConfig::SQLite(SqliteBackupConfig {
        sqlite3_path: "sqlite3".into(),
        database_path: "".into(),
        tables: vec![],
    });
    let path = format!("{}/{}", env!("CARGO_MANIFEST_DIR"), "output.sql");

    println!("Command: {}", config.command_string().unwrap());
    println!("Output: {}", path);
    println!();

    let (mut rx, _killer) = config.command().unwrap().run(path).await.unwrap();
    loop {
        match rx.recv().await {
            Some(msg) => {
                dbg!(msg);
            }
            None => break,
        }
    }
}
