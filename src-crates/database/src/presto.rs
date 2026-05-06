use crate::utils::{FirstCell, empty_if, unordered_tasks};
use crate::{ChunkInsert, Database, LOCALHOST, Result, Value};
use connection_config::{ConnectProtocol, PrestoAuth, PrestoConfig};
use futures_util::FutureExt;
use presto::{AuthConfig, Config, Connection};
use query::Query;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Clone)]
pub struct PrestoConnection {
    conn: Arc<Mutex<Connection>>,
}

impl PrestoConnection {
    pub(crate) async fn test(config: PrestoConfig) -> Result<Option<String>> {
        let mut conn = Self::make_conn(config).await?;
        conn.query(
            "SELECT concat('Presto version: ', node_version) FROM system.runtime.nodes LIMIT 1",
        )
        .await?
        .rows
        .first_cell_string()
        .map(Some)
    }

    pub(crate) async fn connect(config: PrestoConfig) -> Result<Database> {
        let conn = Self::make_conn(config).await?;
        Ok(Database::Presto(Self {
            conn: Arc::new(Mutex::new(conn)),
        }))
    }

    async fn make_conn(config: PrestoConfig) -> Result<Connection> {
        let port = match config.port {
            Some(port) => port,
            None => match config.protocol {
                ConnectProtocol::Http => 8080,
                ConnectProtocol::Https => 443,
            },
        };
        let config = Config {
            https: config.protocol == ConnectProtocol::Https,
            host: empty_if(config.host, LOCALHOST),
            port,
            user: config.user,
            auth: match config.auth {
                PrestoAuth::None => AuthConfig::None,
                PrestoAuth::Password { password } => AuthConfig::Password { password },
                PrestoAuth::Jwt { token } => AuthConfig::Jwt { token },
            },
            catalog: config.catalog,
            schema: config.schema,
            allow_invalid_certs: config.allow_invalid_certs,
            proxy: config.proxy,
        };
        let conn = Connection::open_with(config)?;
        Ok(conn)
    }

    pub(crate) async fn select(&self, sql: String) -> Result<Vec<Vec<Value>>> {
        let rows = self.conn.lock().await.query(sql).await?.rows;
        Ok(rows)
    }

    pub(crate) async fn execute(&self, sql: String) -> Result<()> {
        self.conn.lock().await.query(sql).await?;
        Ok(())
    }

    pub(crate) async fn transaction(&self, sqls: Vec<String>) -> Result<()> {
        self.execute("START TRANSACTION;".into()).await?;
        for sql in sqls {
            if let Err(err) = self.execute(sql).await {
                self.execute("ROLLBACK;".into()).await?;
                return Err(err);
            }
        }
        self.execute("COMMIT;".into()).await?;
        Ok(())
    }

    pub(crate) async fn query(&self, sql: String) -> Result<Query> {
        let query = self.conn.lock().await.query(sql).await?;
        Ok(query)
    }

    pub(crate) async fn batch_insert(&self, insert: ChunkInsert) -> Result<()> {
        let conn = { self.conn.lock().await.snapshot() };
        unordered_tasks(100, insert, |sql| {
            let mut conn = conn.snapshot();
            async move { conn.query(sql).await.map(|_| ()) }.boxed()
        })
        .await?;
        Ok(())
    }
}
