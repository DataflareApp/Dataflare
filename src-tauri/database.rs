use crate::ipc::to_response;
use database::{BatchInsertOptions, ChunkInsert, ConnectionConfig, Database, SingleInsert};
use kvdb::{CommandOutput, Cursor, GenericValue, Key, Keys, KvInput, KvOutput, NameSpace};
use serde::{Serialize, Serializer};
use std::collections::HashMap;
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use tauri::async_runtime::Mutex;
use tauri::ipc::Response;
use tauri::{State, Window, command};
use tokio::fs::OpenOptions;
use tokio::io::{AsyncWriteExt, BufWriter};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Database not connected")]
    DatabaseNotConnected,
    #[error("Database connection has been cancelled")]
    ConnectionCanceled,
    #[error(transparent)]
    Database(#[from] database::Error),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Fbon(#[from] fbon::SerError),
}

type Result<T, E = Error> = std::result::Result<T, E>;

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

#[command]
pub async fn test(config: ConnectionConfig) -> Result<Option<String>> {
    let version = Database::test(config).await?;
    Ok(version)
}

#[command]
pub async fn connect(
    store: State<'_, ConnectionStore>,
    window: Window,
    config: ConnectionConfig,
) -> Result<()> {
    store.connect(window.label().into(), config).await
}

#[command]
pub async fn close(store: State<'_, ConnectionStore>, window: Window) -> Result<()> {
    store.close(window.label()).await;
    Ok(())
}

#[command]
pub async fn sql_select(
    store: State<'_, ConnectionStore>,
    window: Window,
    sql: String,
) -> Result<Response> {
    let rows = store.db(window.label()).await?.sql_select(sql).await?;
    let res = to_response(&rows)?;
    Ok(res)
}

#[command]
pub async fn sql_query(
    store: State<'_, ConnectionStore>,
    window: Window,
    sql: String,
) -> Result<Response> {
    let query = store.db(window.label()).await?.sql_query(sql).await?;
    let res = to_response(&query)?;
    Ok(res)
}

#[command]
pub async fn sql_execute(
    store: State<'_, ConnectionStore>,
    window: Window,
    sql: String,
) -> Result<()> {
    store.db(window.label()).await?.sql_execute(sql).await?;
    Ok(())
}

#[command]
pub async fn sql_transaction(
    store: State<'_, ConnectionStore>,
    window: Window,
    sqls: Vec<String>,
) -> Result<()> {
    store
        .db(window.label())
        .await?
        .sql_transaction(sqls)
        .await?;
    Ok(())
}

#[command]
pub async fn sql_batch_insert(
    store: State<'_, ConnectionStore>,
    window: Window,
    options: BatchInsertOptions,
) -> Result<()> {
    let db = store.db(window.label()).await?;
    // Insert 100 rows at a time
    db.sql_batch_insert(ChunkInsert::new(options, 100)).await?;
    Ok(())
}

// TODO: Consider truncating Value, otherwise the frontend will be very slow when content is too large
#[command]
pub fn sql_batch_insert_preview(mut options: BatchInsertOptions) -> String {
    // Show at most 10 rows
    options.count = options.count.min(10);
    let sql = ChunkInsert::new(options, 10).next().unwrap_or_default();
    format!("-- Example\n{sql}")
}

#[command]
pub async fn sql_export_batch_insert(path: &str, options: BatchInsertOptions) -> Result<(), Error> {
    let file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(path)
        .await?;
    let mut writer = BufWriter::with_capacity(32 * 1024, file);
    let insert = SingleInsert::new(options);
    writer.write_all(insert.header().as_bytes()).await?;
    for sql in insert {
        writer.write_all(sql.as_bytes()).await?;
    }
    writer.flush().await?;
    Ok(())
}

#[command]
pub async fn kv_namespaces(
    store: State<'_, ConnectionStore>,
    window: Window,
) -> Result<Vec<NameSpace>> {
    let namespaces = store.db(window.label()).await?.kv_namespaces().await?;
    Ok(namespaces)
}

#[command]
pub async fn kv_keys(
    store: State<'_, ConnectionStore>,
    window: Window,
    namespace: String,
    cursor: Option<Cursor>,
    search: Option<String>,
) -> Result<Keys> {
    let keys = store
        .db(window.label())
        .await?
        .kv_keys(namespace, cursor, search)
        .await?;
    Ok(keys)
}

#[command]
pub async fn kv_get(
    store: State<'_, ConnectionStore>,
    window: Window,
    namespace: String,
    key: Key,
) -> Result<KvOutput> {
    let value = store
        .db(window.label())
        .await?
        .kv_get(namespace, key)
        .await?;
    Ok(value)
}

#[command]
pub async fn kv_get_content(
    store: State<'_, ConnectionStore>,
    window: Window,
    namespace: String,
    key: Key,
) -> Result<GenericValue> {
    let content = store
        .db(window.label())
        .await?
        .kv_get_content(namespace, key)
        .await?;
    Ok(content)
}

#[command]
pub async fn kv_download_content(
    store: State<'_, ConnectionStore>,
    window: Window,
    namespace: String,
    key: Key,
    path: String,
) -> Result<()> {
    store
        .db(window.label())
        .await?
        .kv_download_content(namespace, key, path)
        .await?;
    Ok(())
}

#[command]
pub async fn kv_set(
    store: State<'_, ConnectionStore>,
    window: Window,
    namespace: String,
    key: Key,
    value: KvInput,
) -> Result<()> {
    store
        .db(window.label())
        .await?
        .kv_set(namespace, key, value)
        .await?;
    Ok(())
}

#[command]
pub async fn kv_delete(
    store: State<'_, ConnectionStore>,
    window: Window,
    namespace: String,
    key: Key,
) -> Result<()> {
    store
        .db(window.label())
        .await?
        .kv_delete(namespace, key)
        .await?;
    Ok(())
}

#[command]
pub async fn kv_run_command(
    store: State<'_, ConnectionStore>,
    window: Window,
    namespace: String,
    command: String,
    readonly: bool,
) -> Result<CommandOutput> {
    let output = store
        .db(window.label())
        .await?
        .kv_run_command(namespace, command, readonly)
        .await?;
    Ok(output)
}

#[derive(Debug)]
pub struct ConnectionStore {
    map: Arc<Mutex<HashMap<String, Instance>>>,
    counter: Arc<AtomicUsize>,
}

#[derive(Debug)]
pub enum Instance {
    Connected(Database),
    Connecting(usize),
}

impl ConnectionStore {
    pub fn new() -> Self {
        Self {
            map: Arc::new(Mutex::new(HashMap::new())),
            counter: Arc::new(AtomicUsize::new(1)),
        }
    }

    async fn connect(&self, label: String, config: ConnectionConfig) -> Result<(), Error> {
        let current = self.counter.fetch_add(1, Ordering::Relaxed);

        {
            self.map
                .lock()
                .await
                .insert(label.clone(), Instance::Connecting(current));
        }

        let rst = Database::connect(config).await;

        let mut map = self.map.lock().await;
        let instance = map.get_mut(&label).ok_or(Error::ConnectionCanceled)?;
        if let Instance::Connecting(i) = instance {
            if i == &current {
                return match rst {
                    Ok(db) => {
                        *instance = Instance::Connected(db);
                        Ok(())
                    }
                    Err(err) => {
                        map.remove(&label);
                        Err(Error::Database(err))
                    }
                };
            }
        }

        Err(Error::ConnectionCanceled)
    }

    // NOTE: This must be within an async context because russh channel has an Async Drop inside
    // If not in an async context, it will cause the process to exit abnormally
    // https://github.com/Eugeny/russh/blob/70ea7373c6d0694e9f6b2615f290a5049aa52692/russh/src/channels/io/mod.rs#L37
    pub async fn close(&self, label: &str) {
        self.map.lock().await.remove(label);
        #[cfg(debug_assertions)]
        {
            let map = self.map.lock().await;
            println!("Current Connections: {:?}", map.keys());
        }
    }

    async fn db(&self, label: &str) -> Result<Database, Error> {
        match self.map.lock().await.get(label) {
            Some(Instance::Connected(db)) => Ok(db.clone()),
            _ => Err(Error::DatabaseNotConnected),
        }
    }
}
