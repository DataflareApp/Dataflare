use crate::{ChunkInsert, Database, Result, Value, WorkersAnalyticsEngineConfig};
use query::Query;
use workers_analytics_engine::{Connection, Error};

#[derive(Debug, Clone)]
pub struct WorkersAnalyticsEngineConnection {
    conn: Connection,
}

impl WorkersAnalyticsEngineConnection {
    pub(crate) async fn test(config: WorkersAnalyticsEngineConfig) -> Result<Option<String>> {
        let conn = Connection::new(config.account_id, config.api_token)?;
        conn.query("SELECT now() as _;".into()).await?;
        Ok(None)
    }

    pub(crate) async fn connect(config: WorkersAnalyticsEngineConfig) -> Result<Database> {
        let conn = Connection::new(config.account_id, config.api_token)?;
        Ok(Database::WorkersAnalyticsEngine(Self { conn }))
    }

    pub(crate) async fn query(&self, sql: String) -> Result<Query> {
        let query = self.conn.query(sql).await?;
        Ok(query)
    }

    pub(crate) async fn select(&self, sql: String) -> Result<Vec<Vec<Value>>> {
        let rows = self.conn.query(sql).await?.rows;
        Ok(rows)
    }

    fn readonly_error() -> Result<()> {
        Err(Error::Message("Workers Analytics Engine is read-only.".into()).into())
    }

    pub(crate) async fn execute(&self, _: String) -> Result<()> {
        Self::readonly_error()
    }

    pub(crate) async fn transaction(&self, _: Vec<String>) -> Result<()> {
        Self::readonly_error()
    }

    pub(crate) async fn batch_insert(&self, _: ChunkInsert) -> Result<()> {
        Self::readonly_error()
    }
}
