use crate::{ChunkInsert, Database, R2SqlConfig, Result, Value};
use query::Query;
use r2sql::{Connection, Error};

#[derive(Debug, Clone)]
pub struct R2SqlConnection {
    conn: Connection,
}

impl R2SqlConnection {
    pub(crate) async fn test(config: R2SqlConfig) -> Result<Option<String>> {
        let conn = Connection::new(config.account_id, config.bucket_name, config.api_token)?;
        conn.query("SHOW NAMESPACES;".into()).await?;
        Ok(None)
    }

    pub(crate) async fn connect(config: R2SqlConfig) -> Result<Database> {
        let conn = Connection::new(config.account_id, config.bucket_name, config.api_token)?;
        Ok(Database::R2Sql(Self { conn }))
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
        Err(Error::Message("R2 SQL is read-only.".into()).into())
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
