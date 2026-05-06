use crate::utils::unordered_tasks;
use crate::{ChunkInsert, Database, LOCALHOST, Result, RqliteConfig, Value};
use futures_util::FutureExt;
use query::Query;
use rqlite::{Auth, Config, Connection, Protocol};

#[derive(Debug, Clone)]
pub struct RqliteConnection {
    conn: Connection,
}

impl RqliteConnection {
    pub(crate) async fn test(config: RqliteConfig) -> Result<Option<String>> {
        let config = Self::make_options(config);
        let conn = Connection::open_with(config)?;
        conn.query("SELECT 1").await?;
        let status = conn.status().await?;
        Ok(Some(format!(
            "rqlite: {}, SQLite: v{}",
            status.rqlite_version(),
            status.sqlite_version()
        )))
    }

    pub(crate) async fn connect(config: RqliteConfig) -> Result<Database> {
        let config = Self::make_options(config);
        Ok(Database::Rqlite(Self {
            conn: Connection::open_with(config)?,
        }))
    }

    fn make_options(config: RqliteConfig) -> Config {
        let mut auth = None;
        if config.user.is_some() || config.password.is_some() {
            auth = Some(Auth {
                user: config.user.unwrap_or_default(),
                password: config.password.unwrap_or_default(),
            });
        };
        Config {
            protocol: if config.https {
                Protocol::Https
            } else {
                Protocol::Http
            },
            host: config.host.unwrap_or_else(|| LOCALHOST.into()),
            port: config.port.unwrap_or(4001),
            auth,
            allow_invalid_certs: config.allow_invalid_certs,
            proxy: config.proxy,
        }
    }

    pub(crate) async fn select(&self, sql: String) -> Result<Vec<Vec<Value>>> {
        let rows = self.conn.select(&sql).await?;
        Ok(rows)
    }

    pub(crate) async fn execute(&self, sql: String) -> Result<()> {
        self.conn.execute(&sql).await?;
        Ok(())
    }

    pub(crate) async fn transaction(&self, sqls: Vec<String>) -> Result<()> {
        self.conn.transaction(sqls).await?;
        Ok(())
    }

    pub(crate) async fn query(&self, sql: String) -> Result<Query> {
        let query = self.conn.query(&sql).await?;
        Ok(query)
    }

    pub(crate) async fn batch_insert(&self, insert: ChunkInsert) -> Result<()> {
        unordered_tasks(100, insert, |sql| {
            let conn = self.conn.clone();
            async move { conn.execute(&sql).await.map(|_| ()) }.boxed()
        })
        .await?;
        Ok(())
    }
}
