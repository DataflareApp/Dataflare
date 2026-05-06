use crate::utils::FirstCell;
use crate::{ChunkInsert, Database, DuckDbConfig, Error, Result, Value};
use duckdb::Connection;
use dylib::driver::Error as DuckDbError;
use query::Query;
use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct DuckDbConnection {
    conn: Arc<Connection>,
}

impl DuckDbConnection {
    async fn conn(config: DuckDbConfig) -> Result<Connection> {
        let conn = Connection::connect(&config.path, config.readonly).await?;
        if let Some(sql) = config.initial {
            conn.execute(&sql)?;
        }
        Ok(conn)
    }

    pub(crate) async fn test(config: DuckDbConfig) -> Result<Option<String>> {
        Self::conn(config)
            .await?
            .query("SELECT concat('DuckDB version: ', version());")?
            .rows
            .first_cell_string()
            .map(Some)
    }

    pub(crate) async fn connect(config: DuckDbConfig) -> Result<Database> {
        Ok(Database::DuckDb(Self {
            conn: Arc::new(Self::conn(config).await?),
        }))
    }

    pub(crate) async fn select(&self, sql: String) -> Result<Vec<Vec<Value>>> {
        let query = self.conn.query(&sql)?;
        Ok(query.rows)
    }

    pub(crate) async fn execute(&self, sql: String) -> Result<()> {
        self.conn.execute(&sql)?;
        Ok(())
    }

    pub(crate) async fn transaction(&self, sqls: Vec<String>) -> Result<()> {
        self.conn.execute("BEGIN TRANSACTION;")?;
        for sql in sqls {
            if let Err(err) = self.conn.execute(&sql) {
                self.conn.execute("ROLLBACK;")?;
                return Err(Error::from(err));
            }
        }
        self.conn.execute("COMMIT;")?;
        Ok(())
    }

    pub(crate) async fn query(&self, sql: String) -> Result<Query> {
        let query = self.conn.query(&sql)?;
        Ok(query)
    }

    pub(crate) async fn batch_insert(&self, insert: ChunkInsert) -> Result<()> {
        let conn = self.conn.try_clone()?;
        tokio::task::spawn_blocking(move || {
            for sql in insert {
                conn.execute(&sql)?;
            }
            Ok::<(), DuckDbError>(())
        })
        .await??;
        Ok(())
    }
}
