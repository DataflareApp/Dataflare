use crate::utils::{FirstCell, unordered_tasks};
use crate::{ChunkInsert, Database, Result, TursoConfig, TursoDatabaseConfig, Value};
use connection_config::TursoEncryptionConfig;
use futures_util::FutureExt;
use libsql_local::Connection as LibSql;
use query::Query;
use std::fmt;
use std::sync::Arc;
use turso_local::{Connection as Turso, EncryptionConfig};
use turso_remote::Client as Remote;

#[derive(Clone)]
pub enum TursoConnection {
    LibSql(Arc<LibSql>),
    Turso(Arc<Turso>),
    Remote(Remote),
}

impl fmt::Debug for TursoConnection {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("TursoConnection").finish()
    }
}

impl TursoConnection {
    pub(crate) async fn test(config: TursoConfig) -> Result<Option<String>> {
        match Self::make_conn(config).await? {
            Self::LibSql(conn) => {
                conn.select("SELECT * FROM sqlite_master LIMIT 0;")?;
                Ok(None)
            }
            Self::Turso(conn) => {
                // Ensure it's a valid database
                conn.select("SELECT * FROM sqlite_master LIMIT 0;")?;
                conn.select("SELECT concat('Turso version: ', turso_version());")?
                    .first_cell_string()
                    .map(Some)
            }
            Self::Remote(client) => {
                client.query("SELECT * FROM sqlite_master LIMIT 0;").await?;
                Ok(None)
            }
        }
    }

    pub(crate) async fn connect(config: TursoConfig) -> Result<Database> {
        let conn = Self::make_conn(config).await?;
        Ok(Database::Turso(conn))
    }

    async fn make_conn(config: TursoConfig) -> Result<Self> {
        match config.database {
            TursoDatabaseConfig::LibSQL { path } => {
                let conn = LibSql::connect(&path, config.readonly).await?;
                if let Some(sql) = config.initial {
                    conn.execute_batch(&sql)?;
                }
                Ok(Self::LibSql(Arc::new(conn)))
            }
            TursoDatabaseConfig::Turso { path, encryption } => {
                let enc = match encryption {
                    None => None,
                    Some(TursoEncryptionConfig { cipher, key }) => {
                        Some(EncryptionConfig { cipher, key })
                    }
                };
                let conn = Turso::connect(&path, enc).await?;
                if let Some(sql) = config.initial {
                    conn.execute_batch(&sql)?;
                }
                Ok(Self::Turso(Arc::new(conn)))
            }
            // TODO: Since a new connection is created each time, initial sql is meaningless; resolve this later if possible
            TursoDatabaseConfig::Remote { url, token } => {
                let client = Remote::new(url, token)?;
                Ok(Self::Remote(client))
            }
        }
    }

    pub(crate) async fn select(&self, sql: String) -> Result<Vec<Vec<Value>>> {
        let rows = match self {
            Self::LibSql(conn) => conn.select(&sql)?,
            Self::Turso(conn) => conn.select(&sql)?,
            Self::Remote(client) => client.query(sql).await?.rows,
        };
        Ok(rows)
    }

    pub(crate) async fn execute(&self, sql: String) -> Result<()> {
        match self {
            Self::LibSql(conn) => conn.execute(&sql)?,
            Self::Turso(conn) => conn.execute(&sql)?,
            Self::Remote(client) => {
                client.query(sql).await?;
            }
        }
        Ok(())
    }

    pub(crate) async fn transaction(&self, sqls: Vec<String>) -> Result<()> {
        match self {
            Self::LibSql(conn) => conn.transaction(&sqls)?,
            Self::Turso(conn) => conn.transaction(&sqls)?,
            Self::Remote(client) => client.transaction(&sqls).await?,
        }
        Ok(())
    }

    pub(crate) async fn query(&self, sql: String) -> Result<Query> {
        match self {
            Self::LibSql(conn) => Ok(conn.query(&sql)?),
            Self::Turso(conn) => Ok(conn.query(&sql)?),
            Self::Remote(client) => Ok(client.query(sql).await?),
        }
    }

    pub(crate) async fn batch_insert(&self, insert: ChunkInsert) -> Result<()> {
        match self {
            Self::LibSql(conn) => {
                for sql in insert {
                    conn.execute(&sql)?;
                }
            }
            Self::Turso(conn) => {
                for sql in insert {
                    conn.execute(&sql)?;
                }
            }
            Self::Remote(client) => {
                unordered_tasks(100, insert, |sql| {
                    let client = client.clone();
                    async move { client.query(sql).await.map(|_| ()) }.boxed()
                })
                .await?;
            }
        }
        Ok(())
    }
}
