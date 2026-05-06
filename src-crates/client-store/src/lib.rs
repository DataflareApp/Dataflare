mod crypto;
mod error;
mod utils;
mod widget;

use dir::CLIENT_DATABASE_FILE;
pub use error::Error;
pub use utils::{Id, JsonArray, JsonMap};
pub use widget::{WidgetConfig, WidgetItem};

use connection_config::ConnectionConfig;
use crypto::{decrypt, encrypt};
use rusqlite::{Connection as SqliteConnection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::fs::read_to_string;
use tokio::sync::{Mutex, MutexGuard};
use utils::{ConnectionExt, gen_id, json_array, json_map, now};

type Result<T, E = Error> = std::result::Result<T, E>;

pub struct Client {
    conn: Arc<Mutex<SqliteConnection>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionItem {
    pub cid: String,
    pub name: String,
    pub config: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionItemResult {
    pub cid: String,
    pub name: String,
    pub config: ConnectionConfig,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryItem {
    pub qid: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryHistoryItem {
    pub hid: String,
    pub content: String,
    pub error: Option<String>,
    #[serde(rename(serialize = "createdAt"))]
    pub created_at: i64,
}

#[derive(Debug, Serialize)]
pub struct ProviderItem {
    pub id: i64,
    pub name: String,
    pub config: JsonMap,
    pub models: JsonArray,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatItem {
    pub id: i64,
    pub name: String,
    #[serde(rename(serialize = "lastMessageAt"))]
    pub last_message_at: i64,
    #[serde(rename(serialize = "lastAccessedAt"))]
    pub last_accessed_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentItem {
    pub id: i64,
    pub name: String,
    pub instructions: String,
}

impl Client {
    pub async fn connect(dir: &Path) -> Result<Self> {
        let path = dir.join(CLIENT_DATABASE_FILE);

        #[cfg(debug_assertions)]
        println!("Client Data: {:?}", path);

        let conn = SqliteConnection::open(path)?;
        // Init database
        conn.execute_batch(include_str!("../migrate.sql"))?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    #[inline]
    async fn get<'a>(&'a self) -> MutexGuard<'a, SqliteConnection> {
        self.conn.lock().await
    }

    pub async fn create_connection(&self, name: String, config: ConnectionConfig) -> Result<Id> {
        let config = encrypt(&config)?;
        let cid = gen_id();
        let sql = r#"INSERT INTO connection (cid, name, config, sort) VALUES (?1, ?2, ?3, (SELECT COALESCE(MAX(sort), 0) + 1 FROM connection))"#;
        self.get().await.execute(sql, (&cid, name, config))?;
        Ok(cid)
    }

    pub async fn update_connection(
        &self,
        cid: String,
        name: String,
        config: ConnectionConfig,
    ) -> Result<()> {
        let config = encrypt(&config)?;
        let sql = r#"UPDATE connection SET name = ?1, config = ?2 WHERE cid = ?3"#;
        self.get().await.execute(sql, (name, config, cid))?;
        Ok(())
    }

    /// Delete all data associated with a connection (history, queries, dashboard, chat, storage, and
    /// the connection row itself). Window-state cleanup is **not** performed here; the caller is
    /// responsible for that Tauri-specific step.
    pub async fn delete_connection(&self, cid: &str) -> Result<()> {
        let mut conn = self.get().await;
        let transaction = conn.transaction()?;
        transaction.execute(r#"DELETE FROM history WHERE cid = ?1"#, [cid])?;
        transaction.execute(r#"DELETE FROM query WHERE cid = ?1"#, [cid])?;
        transaction.execute(r#"DELETE FROM dashboard WHERE cid = ?1"#, [cid])?;
        transaction.execute(r#"DELETE FROM chat WHERE cid = ?1"#, [cid])?;
        transaction.execute(r#"DELETE FROM connection WHERE cid = ?1"#, [cid])?;
        transaction.execute(r#"DELETE FROM storage WHERE cid = ?1"#, [cid])?;
        transaction.commit()?;
        Ok(())
    }

    pub async fn connection_list(&self) -> Result<Vec<ConnectionItemResult>> {
        // TODO: If the database is tampered with, it will directly cause a blank screen in the App
        let sql = r#"SELECT cid, name, config FROM connection ORDER BY sort"#;
        let values = self.get().await.query_rows::<ConnectionItem>(sql, ())?;

        let mut result = Vec::with_capacity(values.len());
        for mut item in values {
            // We ignore config errors here because it may have been tampered with
            // It could also be deprecated data, e.g. old DuckDB entries
            // If the correct config cannot be obtained, temporarily hide this connection from the client
            if let Ok(config) = decrypt::<ConnectionConfig>(&mut item.config) {
                result.push(ConnectionItemResult {
                    cid: item.cid,
                    name: item.name,
                    config,
                });
            }
        }

        Ok(result)
    }

    pub async fn connection_sort(&self, cids: Vec<String>) -> Result<()> {
        let mut s = String::new();
        for (i, cid) in cids.into_iter().enumerate() {
            s.push_str(&format!("WHEN '{}' THEN {}\n", cid, i as u32 + 1));
        }
        let sql = format!(
            r#"
            UPDATE 'connection' SET sort = CASE cid
            {s}
            ELSE sort
            END;
        "#
        );
        self.get().await.execute(&sql, ())?;
        Ok(())
    }

    pub async fn query_list(&self, cid: String) -> Result<Vec<QueryItem>> {
        let sql = r#"SELECT qid, name FROM query WHERE cid = ?1 ORDER BY created_at DESC"#;
        let values = self.get().await.query_rows::<QueryItem>(sql, [cid])?;
        Ok(values)
    }

    pub async fn query_content(&self, qid: String) -> Result<String> {
        let sql = r#"SELECT content FROM query WHERE qid = ?1"#;
        let content = self.get().await.query_first_cell::<String>(sql, [qid])?;
        Ok(content)
    }

    pub async fn create_query(&self, cid: String, name: String, content: String) -> Result<Id> {
        let qid = gen_id();
        let sql = r#"INSERT INTO query (qid, cid, name, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5)"#;
        self.get()
            .await
            .execute(sql, (&qid, cid, name, content, now()))?;
        Ok(qid)
    }

    pub async fn import_query(&self, cid: String, path: String) -> Result<()> {
        let content = read_to_string(&path).await?;
        let name = PathBuf::from(path)
            .file_name()
            .map(|s| s.to_string_lossy().into())
            .unwrap_or_else(|| "Unknown file name".into());
        self.create_query(cid, name, content).await?;
        Ok(())
    }

    pub async fn update_query(&self, qid: String, content: String) -> Result<()> {
        let sql = r#"UPDATE query SET content = ?1 WHERE qid = ?2"#;
        self.get().await.execute(sql, (content, qid))?;
        Ok(())
    }

    pub async fn duplicate_query(&self, qid: String) -> Result<()> {
        let new_qid = gen_id();
        let sql = r#"
INSERT INTO query (qid, cid, name, content, created_at)
SELECT ?1, cid, CONCAT(name, ' Copy'), content, ?2 FROM query WHERE qid = ?3"#;
        self.get().await.execute(sql, (new_qid, now(), qid))?;
        Ok(())
    }

    pub async fn delete_query(&self, qid: String) -> Result<()> {
        {
            self.clear_query_history(qid.clone()).await?;
        }
        let sql = r#"DELETE FROM query WHERE qid = ?1"#;
        self.get().await.execute(sql, [qid])?;
        Ok(())
    }

    pub async fn rename_query(&self, qid: String, name: String) -> Result<()> {
        let sql = r#"UPDATE query SET name = ?1 WHERE qid = ?2"#;
        self.get().await.execute(sql, (name, qid))?;
        Ok(())
    }

    pub async fn export_query(&self, qid: String, path: String) -> Result<()> {
        let content = self.query_content(qid).await?;
        tokio::fs::write(path, content).await?;
        Ok(())
    }

    pub async fn query_history_list(
        &self,
        qid: String,
        page: i32,
        limit: i32,
    ) -> Result<Vec<QueryHistoryItem>> {
        let sql = r#"SELECT hid, content, error, created_at FROM history WHERE qid = ?1 ORDER BY created_at DESC LIMIT ?2 OFFSET ?3"#;
        let values = self
            .get()
            .await
            .query_rows::<QueryHistoryItem>(sql, (qid, limit, (page - 1) * limit))?;
        Ok(values)
    }

    pub async fn clear_query_history(&self, qid: String) -> Result<()> {
        let sql = r#"DELETE FROM history WHERE qid = ?1"#;
        self.get().await.execute(sql, [qid])?;
        Ok(())
    }

    pub async fn create_query_history(
        &self,
        cid: String,
        qid: String,
        content: String,
        error_content: Option<String>,
    ) -> Result<()> {
        let sql = r#"INSERT INTO history (hid, cid, qid, content, error, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"#;
        self.get()
            .await
            .execute(sql, (gen_id(), cid, qid, content, error_content, now()))?;
        Ok(())
    }

    pub async fn create_widget(
        &self,
        cid: String,
        width: u32,
        height: u32,
        x: u32,
        y: u32,
        config: WidgetConfig,
    ) -> Result<Id> {
        let wid = gen_id();
        let sql = r#"INSERT INTO dashboard (wid, cid, width, height, x, y, config) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"#;
        self.get()
            .await
            .execute(sql, (&wid, cid, width, height, x, y, config))?;
        Ok(wid)
    }

    pub async fn delete_widget(&self, wid: String) -> Result<()> {
        let sql = r#"DELETE FROM dashboard WHERE wid = ?1"#;
        self.get().await.execute(sql, [wid])?;
        Ok(())
    }

    pub async fn widget_list(&self, cid: String) -> Result<Vec<WidgetItem>> {
        let sql = r#"SELECT wid, width, height, x, y, config FROM dashboard WHERE cid = ?1 ORDER BY (x * x + y * y) ASC"#;
        let items = self.get().await.query_rows::<WidgetItem>(sql, [cid])?;
        Ok(items)
    }

    pub async fn update_widget_position(&self, wid: String, x: u32, y: u32) -> Result<()> {
        let sql = r#"UPDATE dashboard SET x = ?1, y = ?2 WHERE wid = ?3"#;
        self.get().await.execute(sql, (x, y, wid))?;
        Ok(())
    }

    pub async fn update_widget_size(&self, wid: String, width: u32, height: u32) -> Result<()> {
        let sql = r#"UPDATE dashboard SET width = ?1, height = ?2 WHERE wid = ?3"#;
        self.get().await.execute(sql, (width, height, wid))?;
        Ok(())
    }

    pub async fn update_widget_config(&self, wid: String, config: WidgetConfig) -> Result<()> {
        let sql = r#"UPDATE dashboard SET config = ?1 WHERE wid = ?2"#;
        self.get().await.execute(sql, (config, wid))?;
        Ok(())
    }

    pub async fn get_storage(&self, cid: String, key: String) -> Result<String> {
        let sql = r#"SELECT value FROM storage WHERE cid = ?1 AND key = ?2"#;
        let value = self
            .get()
            .await
            .query_first_cell::<String>(sql, (cid, key))
            .optional()?;
        Ok(value.unwrap_or_else(|| "null".into()))
    }

    pub async fn set_storage(&self, cid: String, key: String, value: String) -> Result<()> {
        let sql = r#"INSERT OR REPLACE INTO storage (cid, key, value) VALUES (?1, ?2, ?3)"#;
        self.get().await.execute(sql, (cid, key, value))?;
        Ok(())
    }

    pub async fn delete_storage(&self, cid: String, key: String) -> Result<()> {
        let sql = r#"DELETE FROM storage WHERE cid = ?1 AND key = ?2"#;
        self.get().await.execute(sql, (cid, key))?;
        Ok(())
    }

    pub async fn provider_list(&self) -> Result<Vec<ProviderItem>> {
        #[derive(Debug, Deserialize)]
        struct InnerProviderItem {
            id: i64,
            name: String,
            config: String,
            models: String,
        }
        let sql = r#"SELECT id, name, config, models FROM provider ORDER BY id"#;
        let ps = self.get().await.query_rows::<InnerProviderItem>(sql, ())?;
        let mut items = Vec::with_capacity(ps.len());
        for p in ps {
            items.push(ProviderItem {
                id: p.id,
                name: p.name,
                config: serde_json::from_str(&p.config)?,
                models: serde_json::from_str(&p.models)?,
            });
        }
        Ok(items)
    }

    pub async fn create_provider(
        &self,
        name: String,
        config: JsonMap,
        models: JsonArray,
    ) -> Result<i64> {
        let sql = r#"INSERT INTO provider (name, config, models) VALUES (?1, ?2, ?3) RETURNING id"#;
        let id = self
            .get()
            .await
            .query_first_cell::<i64>(sql, (name, json_map(config), json_array(models)))?;
        Ok(id)
    }

    pub async fn update_provider(
        &self,
        id: i64,
        name: String,
        config: JsonMap,
        models: JsonArray,
    ) -> Result<()> {
        let sql = r#"UPDATE provider SET name = ?1, config = ?2, models = ?3 WHERE id = ?4"#;
        self.get()
            .await
            .execute(sql, (name, json_map(config), json_array(models), id))?;
        Ok(())
    }

    pub async fn delete_provider(&self, id: i64) -> Result<()> {
        let sql = r#"DELETE FROM provider WHERE id = ?1"#;
        self.get().await.execute(sql, [id])?;
        Ok(())
    }

    pub async fn chat_list(&self, cid: String) -> Result<Vec<ChatItem>> {
        // TODO: For performance reasons, currently limited to loading 1000 records max since the UI tends to lag; can be optimized later
        let sql = r#"SELECT id, name, last_message_at, last_accessed_at FROM chat WHERE cid = ?1 ORDER BY id DESC LIMIT 1000"#;
        let items = self.get().await.query_rows::<ChatItem>(sql, [cid])?;
        Ok(items)
    }

    pub async fn create_chat(&self, cid: String) -> Result<i64> {
        let sql = r#"INSERT INTO chat (cid, name, config, messages) VALUES (?1, '', COALESCE((SELECT config FROM chat WHERE cid = ?1 ORDER BY last_accessed_at DESC LIMIT 1), '{}'), '[]') RETURNING id"#;
        let id = self.get().await.query_first_cell::<i64>(sql, [cid])?;
        Ok(id)
    }

    pub async fn delete_chat(&self, id: i64) -> Result<()> {
        let sql = r#"DELETE FROM chat WHERE id = ?1"#;
        self.get().await.execute(sql, [id])?;
        Ok(())
    }

    pub async fn delete_all_chats(&self, cid: String) -> Result<ChatItem> {
        let mut conn = self.get().await;

        let config = conn
            .query_first_cell::<String>(
                r#"SELECT config FROM chat WHERE cid = ?1 ORDER BY last_accessed_at DESC LIMIT 1"#,
                [&cid],
            )
            .optional()?;

        conn.execute(r#"DELETE FROM chat WHERE cid = ?1"#, [&cid])?;

        let sql = r#"INSERT INTO chat (cid, name, config, messages) VALUES (?1, '', COALESCE(?2, '{}'), '[]') RETURNING id, name, last_message_at, last_accessed_at"#;
        let mut items = conn.query_rows::<ChatItem>(sql, (&cid, config))?;

        Ok(items.remove(0))
    }

    pub async fn get_chat_detail(&self, id: i64) -> Result<JsonMap> {
        let mut conn = self.get().await;
        conn.execute(
            r#"UPDATE chat SET last_accessed_at = (unixepoch('subsec') * 1000) WHERE id = ?1"#,
            [id],
        )?;
        let config = conn.query_first_cell::<String>(
            r#"SELECT json_object('config', json(config), 'messages', json(messages)) FROM chat WHERE id = ?1"#,
            [id]
        )?;
        Ok(serde_json::from_str(&config)?)
    }

    pub async fn update_chat_name(&self, id: i64, name: String) -> Result<()> {
        let sql = r#"UPDATE chat SET name = ?1 WHERE id = ?2"#;
        self.get().await.execute(sql, (name, id))?;
        Ok(())
    }

    pub async fn update_chat_config(&self, id: i64, config: JsonMap) -> Result<()> {
        let sql = r#"UPDATE chat SET config = ?1 WHERE id = ?2"#;
        self.get().await.execute(sql, (json_map(config), id))?;
        Ok(())
    }

    pub async fn update_chat_messages(&self, id: i64, messages: JsonArray) -> Result<()> {
        let sql = r#"UPDATE chat SET messages = ?1, last_message_at = (unixepoch('subsec') * 1000) WHERE id = ?2"#;
        self.get().await.execute(sql, (json_array(messages), id))?;
        Ok(())
    }

    pub async fn agent_list(&self) -> Result<Vec<AgentItem>> {
        let sql = r#"SELECT id, name, instructions FROM agent ORDER BY id"#;
        let items = self.get().await.query_rows::<AgentItem>(sql, ())?;
        Ok(items)
    }

    pub async fn create_agent(&self, name: String, instructions: String) -> Result<i64> {
        let sql =
            r#"INSERT INTO agent (name, instructions, config) VALUES (?1, ?2, '{}') RETURNING id"#;
        let id = self
            .get()
            .await
            .query_first_cell::<i64>(sql, (name, instructions))?;
        Ok(id)
    }

    pub async fn update_agent(&self, id: i64, name: String, instructions: String) -> Result<()> {
        let sql = r#"UPDATE agent SET name = ?1, instructions = ?2 WHERE id = ?3"#;
        self.get().await.execute(sql, (name, instructions, id))?;
        Ok(())
    }

    pub async fn delete_agent(&self, id: i64) -> Result<()> {
        let sql = r#"DELETE FROM agent WHERE id = ?1"#;
        self.get().await.execute(sql, [id])?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use connection_config::{
        PostgresConfig, PostgresTlsConfig, PostgresTlsMode, SqliteConfig, TlsConfig,
    };
    use std::sync::atomic::{AtomicU32, Ordering};

    static TEST_COUNTER: AtomicU32 = AtomicU32::new(0);

    fn sqlite_config() -> ConnectionConfig {
        ConnectionConfig::SQLite(SqliteConfig {
            path: ":memory:".into(),
            readonly: false,
            initial: None,
        })
    }

    fn postgres_config() -> ConnectionConfig {
        ConnectionConfig::PostgreSQL(PostgresConfig {
            host: Some("localhost".into()),
            port: Some(5432),
            user: "user".into(),
            password: "password".into(),
            database: "test".into(),
            readonly: true,
            initial: None,
            tls: PostgresTlsConfig {
                mode: PostgresTlsMode::Disabled,
                config: TlsConfig {
                    key: None,
                    cert: None,
                    ca: None,
                },
            },
            proxy: None,
        })
    }

    async fn client() -> (Client, String, String) {
        let id = TEST_COUNTER.fetch_add(1, Ordering::SeqCst);
        let dir = std::env::temp_dir().join(format!("dataflare-client-store-test-{}", id));
        if dir.exists() {
            std::fs::remove_dir_all(&dir).unwrap();
        }
        std::fs::create_dir_all(&dir).unwrap();
        let client = Client::connect(&dir).await.unwrap();
        let cid1 = client
            .create_connection("Conn 1".into(), sqlite_config())
            .await
            .unwrap();
        let cid2 = client
            .create_connection("Conn 2".into(), postgres_config())
            .await
            .unwrap();
        (client, cid1, cid2)
    }

    #[tokio::test]
    async fn test_connection_operations() {
        let (client, cid1, cid2) = client().await;

        let conns = client.connection_list().await.unwrap();
        assert_eq!(conns.len(), 2);
        assert_eq!(conns[0].name, "Conn 1");
        assert_eq!(conns[1].name, "Conn 2");

        // Update
        client
            .update_connection(cid1.clone(), "Updated".into(), sqlite_config())
            .await
            .unwrap();
        assert_eq!(client.connection_list().await.unwrap()[0].name, "Updated");

        // Sort: swap order
        client
            .connection_sort(vec![cid2.clone(), cid1.clone()])
            .await
            .unwrap();
        let conns = client.connection_list().await.unwrap();
        assert_eq!(conns[0].cid, cid2);
        assert_eq!(conns[1].cid, cid1);

        // Seed related data under cid1 to verify cascade on delete
        client
            .create_query(cid1.clone(), "Q".into(), "SELECT 1".into())
            .await
            .unwrap();
        client.create_chat(cid1.clone()).await.unwrap();
        client
            .set_storage(cid1.clone(), "k".into(), "1".into())
            .await
            .unwrap();

        client.delete_connection(&cid1).await.unwrap();

        // Only cid2 remains
        let conns = client.connection_list().await.unwrap();
        assert_eq!(conns.len(), 1);
        assert_eq!(conns[0].cid, cid2);

        // All data associated with cid1 must be gone
        assert_eq!(client.query_list(cid1.clone()).await.unwrap().len(), 0);
        assert_eq!(client.chat_list(cid1.clone()).await.unwrap().len(), 0);
        assert_eq!(client.get_storage(cid1, "k".into()).await.unwrap(), "null");
    }

    #[tokio::test]
    async fn test_query_operations() {
        let (client, cid1, cid2) = client().await;

        let qid = client
            .create_query(cid1.clone(), "Query1".into(), "SELECT 1".into())
            .await
            .unwrap();

        assert_eq!(client.query_content(qid.clone()).await.unwrap(), "SELECT 1");

        let queries = client.query_list(cid1.clone()).await.unwrap();
        assert_eq!(queries.len(), 1);
        assert_eq!(queries[0].qid, qid);
        assert_eq!(queries[0].name, "Query1");

        // Queries are scoped to their connection
        assert_eq!(client.query_list(cid2).await.unwrap().len(), 0);

        // Update content
        client
            .update_query(qid.clone(), "SELECT 2".into())
            .await
            .unwrap();
        assert_eq!(client.query_content(qid.clone()).await.unwrap(), "SELECT 2");

        // Rename
        client
            .rename_query(qid.clone(), "Renamed".into())
            .await
            .unwrap();
        assert_eq!(
            client.query_list(cid1.clone()).await.unwrap()[0].name,
            "Renamed"
        );

        // Duplicate
        client.duplicate_query(qid.clone()).await.unwrap();
        let queries = client.query_list(cid1.clone()).await.unwrap();
        assert_eq!(queries.len(), 2);
        assert!(queries.iter().any(|q| q.name == "Renamed Copy"));

        // Delete original; only the copy remains
        client.delete_query(qid).await.unwrap();
        let queries = client.query_list(cid1).await.unwrap();
        assert_eq!(queries.len(), 1);
        assert_eq!(queries[0].name, "Renamed Copy");
    }

    #[tokio::test]
    async fn test_query_import_export() {
        let (client, cid, _) = client().await;

        let id = TEST_COUNTER.fetch_add(1, Ordering::SeqCst);
        let temp_dir = std::env::temp_dir().join(format!("dataflare-test-query-{}", id));
        std::fs::create_dir_all(&temp_dir).unwrap();
        let sql_file = temp_dir.join("test_query.sql");
        std::fs::write(&sql_file, "SELECT * FROM users").unwrap();

        client
            .import_query(cid.clone(), sql_file.to_string_lossy().into())
            .await
            .unwrap();

        let queries = client.query_list(cid.clone()).await.unwrap();
        assert_eq!(queries.len(), 1);
        // Name is taken from the filename
        assert_eq!(queries[0].name, "test_query.sql");
        // Content matches the file
        assert_eq!(
            client.query_content(queries[0].qid.clone()).await.unwrap(),
            "SELECT * FROM users"
        );

        // Export and verify round-trip
        let export_file = temp_dir.join("exported.sql");
        client
            .export_query(queries[0].qid.clone(), export_file.to_string_lossy().into())
            .await
            .unwrap();
        assert_eq!(
            std::fs::read_to_string(&export_file).unwrap(),
            "SELECT * FROM users"
        );

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[tokio::test]
    async fn test_query_history_operations() {
        let (client, cid, _) = client().await;

        let qid = client
            .create_query(cid.clone(), "Query".into(), "SELECT 1".into())
            .await
            .unwrap();

        // Insert two entries in order; history is returned DESC (most recent first)
        client
            .create_query_history(cid.clone(), qid.clone(), "SELECT 1".into(), None)
            .await
            .unwrap();
        client
            .create_query_history(cid, qid.clone(), "SELECT 2".into(), Some("Error".into()))
            .await
            .unwrap();

        let history = client.query_history_list(qid.clone(), 1, 10).await.unwrap();
        assert_eq!(history.len(), 2);
        assert_eq!(history[0].content, "SELECT 2");
        assert!(history[0].error.is_some());
        assert_eq!(history[1].content, "SELECT 1");
        assert!(history[1].error.is_none());

        client.clear_query_history(qid.clone()).await.unwrap();
        assert_eq!(
            client.query_history_list(qid, 1, 10).await.unwrap().len(),
            0
        );
    }

    #[tokio::test]
    async fn test_query_history_pagination() {
        let (client, cid, _) = client().await;

        let qid = client
            .create_query(cid.clone(), "Query".into(), "SELECT 1".into())
            .await
            .unwrap();

        for i in 0..15 {
            client
                .create_query_history(cid.clone(), qid.clone(), format!("SELECT {}", i), None)
                .await
                .unwrap();
        }

        let page1 = client.query_history_list(qid.clone(), 1, 5).await.unwrap();
        let page2 = client.query_history_list(qid.clone(), 2, 5).await.unwrap();
        let page3 = client.query_history_list(qid.clone(), 3, 5).await.unwrap();
        let page4 = client.query_history_list(qid, 4, 5).await.unwrap();

        assert_eq!(page1.len(), 5);
        assert_eq!(page2.len(), 5);
        assert_eq!(page3.len(), 5);
        assert_eq!(page4.len(), 0); // past the end

        // All pages must contain distinct records with no overlap
        let all_hids: std::collections::HashSet<_> = page1
            .iter()
            .chain(page2.iter())
            .chain(page3.iter())
            .map(|h| h.hid.as_str())
            .collect();
        assert_eq!(all_hids.len(), 15);
    }

    #[tokio::test]
    async fn test_widget_operations() {
        let (client, cid, _) = client().await;

        let widget_config = || {
            serde_json::from_str::<WidgetConfig>(
                r#"{"name":"w","source":"SELECT 1","interval":5000,"options":{"type":"table","config":{}}}"#,
            )
            .unwrap()
        };

        let wid = client
            .create_widget(cid.clone(), 100, 100, 10, 20, widget_config())
            .await
            .unwrap();
        assert_eq!(client.widget_list(cid.clone()).await.unwrap().len(), 1);

        // WidgetItem fields are private; inspect via serialization
        client
            .update_widget_position(wid.clone(), 30, 40)
            .await
            .unwrap();
        let w = serde_json::to_value(&client.widget_list(cid.clone()).await.unwrap()[0]).unwrap();
        assert_eq!(w["x"], 30);
        assert_eq!(w["y"], 40);

        client
            .update_widget_size(wid.clone(), 200, 150)
            .await
            .unwrap();
        let w = serde_json::to_value(&client.widget_list(cid.clone()).await.unwrap()[0]).unwrap();
        assert_eq!(w["width"], 200);
        assert_eq!(w["height"], 150);

        client
            .update_widget_config(wid.clone(), widget_config())
            .await
            .unwrap();

        client.delete_widget(wid).await.unwrap();
        assert_eq!(client.widget_list(cid).await.unwrap().len(), 0);
    }

    #[tokio::test]
    async fn test_storage_operations() {
        let (client, cid, _) = client().await;

        // Values must be valid JSON; test string, number, and object types
        client
            .set_storage(cid.clone(), "str".into(), r#""hello""#.into())
            .await
            .unwrap();
        assert_eq!(
            client.get_storage(cid.clone(), "str".into()).await.unwrap(),
            r#""hello""#
        );

        client
            .set_storage(cid.clone(), "num".into(), "42".into())
            .await
            .unwrap();
        assert_eq!(
            client.get_storage(cid.clone(), "num".into()).await.unwrap(),
            "42"
        );

        client
            .set_storage(cid.clone(), "obj".into(), r#"{"a":1}"#.into())
            .await
            .unwrap();
        assert_eq!(
            client.get_storage(cid.clone(), "obj".into()).await.unwrap(),
            r#"{"a":1}"#
        );

        // Missing key returns "null"
        assert_eq!(
            client
                .get_storage(cid.clone(), "missing".into())
                .await
                .unwrap(),
            "null"
        );

        // Overwrite
        client
            .set_storage(cid.clone(), "str".into(), r#""world""#.into())
            .await
            .unwrap();
        assert_eq!(
            client.get_storage(cid.clone(), "str".into()).await.unwrap(),
            r#""world""#
        );

        // Delete
        client
            .delete_storage(cid.clone(), "str".into())
            .await
            .unwrap();
        assert_eq!(client.get_storage(cid, "str".into()).await.unwrap(), "null");
    }

    #[tokio::test]
    async fn test_provider_operations() {
        let (client, _, _) = client().await;

        let config = serde_json::json!({"key": "value"})
            .as_object()
            .unwrap()
            .clone();
        let models = serde_json::json!([{"name": "gpt-4"}, {"name": "gpt-3.5"}])
            .as_array()
            .unwrap()
            .clone();

        let id = client
            .create_provider("OpenAI".into(), config.clone(), models.clone())
            .await
            .unwrap();

        let providers = client.provider_list().await.unwrap();
        assert_eq!(providers.len(), 1);
        assert_eq!(providers[0].id, id);
        assert_eq!(providers[0].name, "OpenAI");
        assert_eq!(providers[0].models.len(), 2);

        client
            .update_provider(id, "Updated OpenAI".into(), config, models)
            .await
            .unwrap();
        assert_eq!(
            client.provider_list().await.unwrap()[0].name,
            "Updated OpenAI"
        );

        client.delete_provider(id).await.unwrap();
        assert_eq!(client.provider_list().await.unwrap().len(), 0);
    }

    #[tokio::test]
    async fn test_chat_operations() {
        let (client, cid, _) = client().await;

        let id1 = client.create_chat(cid.clone()).await.unwrap();

        // Rename
        client.update_chat_name(id1, "Chat 1".into()).await.unwrap();
        assert_eq!(
            client.chat_list(cid.clone()).await.unwrap()[0].name,
            "Chat 1"
        );

        // Update config and verify it persists
        client
            .update_chat_config(
                id1,
                serde_json::json!({"theme": "dark"})
                    .as_object()
                    .unwrap()
                    .clone(),
            )
            .await
            .unwrap();
        assert_eq!(
            client.get_chat_detail(id1).await.unwrap()["config"]["theme"],
            "dark"
        );

        // Update messages and verify they persist; last_message_at is also bumped
        client
            .update_chat_messages(
                id1,
                serde_json::json!([{"role": "user", "content": "Hi"}])
                    .as_array()
                    .unwrap()
                    .clone(),
            )
            .await
            .unwrap();
        let detail = client.get_chat_detail(id1).await.unwrap();
        assert_eq!(detail["messages"].as_array().unwrap().len(), 1);
        assert!(client.chat_list(cid.clone()).await.unwrap()[0].last_message_at > 0);

        // Delete a single chat
        let _id2 = client.create_chat(cid.clone()).await.unwrap();
        let _id3 = client.create_chat(cid.clone()).await.unwrap();
        let count = client.chat_list(cid.clone()).await.unwrap().len();
        client.delete_chat(id1).await.unwrap();
        assert_eq!(
            client.chat_list(cid.clone()).await.unwrap().len(),
            count - 1
        );

        // delete_all_chats removes everything and returns a fresh blank chat that
        // inherits the config from the most recently accessed preceding chat
        let result = client.delete_all_chats(cid.clone()).await.unwrap();
        assert!(result.id > 0);
        let chats = client.chat_list(cid.clone()).await.unwrap();
        assert_eq!(chats.len(), 1);
        let detail = client.get_chat_detail(chats[0].id).await.unwrap();
        assert_eq!(detail["config"]["theme"], "dark"); // config inherited
        assert_eq!(detail["messages"].as_array().unwrap().len(), 0); // messages reset
    }

    #[tokio::test]
    async fn test_agent_operations() {
        let (client, _, _) = client().await;

        let id = client
            .create_agent("Agent1".into(), "Instructions".into())
            .await
            .unwrap();

        let agents = client.agent_list().await.unwrap();
        assert_eq!(agents.len(), 1);
        assert_eq!(agents[0].id, id);
        assert_eq!(agents[0].name, "Agent1");
        assert_eq!(agents[0].instructions, "Instructions");

        client
            .update_agent(id, "Updated Agent".into(), "New Instructions".into())
            .await
            .unwrap();
        let agents = client.agent_list().await.unwrap();
        assert_eq!(agents[0].name, "Updated Agent");
        assert_eq!(agents[0].instructions, "New Instructions");

        client.delete_agent(id).await.unwrap();
        assert_eq!(client.agent_list().await.unwrap().len(), 0);
    }
}
