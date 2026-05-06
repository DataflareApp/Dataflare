use crate::utils::unordered_tasks;
use crate::{ChunkInsert, CloudflareD1Config, Database, Result, Value};
use cloudflare_d1::Connection;
use futures_util::FutureExt;
use query::Query;

#[derive(Debug, Clone)]
pub struct D1Connection {
    conn: Connection,
}

impl D1Connection {
    pub(crate) async fn test(config: CloudflareD1Config) -> Result<Option<String>> {
        let conn = Self::make_connection(config)?;
        conn.query("SELECT 1".into()).await?;
        // D1 does not allow calling sqlite_version()
        Ok(None)
    }

    pub(crate) async fn connect(config: CloudflareD1Config) -> Result<Database> {
        let conn = Self::make_connection(config)?;
        Ok(Database::D1(Self { conn }))
    }

    fn make_connection(config: CloudflareD1Config) -> Result<Connection> {
        let conn = Connection::open(
            config.account_id,
            config.database_id,
            config.api_token,
            config.api_origin.as_deref(),
        )?;
        Ok(conn)
    }

    pub(crate) async fn select(&self, sql: String) -> Result<Vec<Vec<Value>>> {
        let rows = self.conn.select(sql).await?;
        Ok(rows)
    }

    pub(crate) async fn execute(&self, sql: String) -> Result<()> {
        self.conn.execute(sql).await?;
        Ok(())
    }

    // TODO: Transactions not supported
    pub(crate) async fn transaction(&self, sqls: Vec<String>) -> Result<()> {
        for sql in sqls {
            self.conn.execute(sql).await?;
        }
        Ok(())
    }

    pub(crate) async fn query(&self, sql: String) -> Result<Query> {
        let query = self.conn.query(sql).await?;
        Ok(query)
    }

    pub(crate) async fn batch_insert(&self, insert: ChunkInsert) -> Result<()> {
        unordered_tasks(20, insert, |sql| {
            let conn = self.conn.clone();
            async move { conn.execute(sql).await }.boxed()
        })
        .await?;
        Ok(())
    }
}
