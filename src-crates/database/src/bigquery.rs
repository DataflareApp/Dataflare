use crate::utils::unordered_tasks;
use crate::{BigQueryConfig, ChunkInsert, Database, Result, Value};
use bigquery::Connection;
use connection_config::BigQueryAuth;
use futures_util::FutureExt;
use query::Query;

#[derive(Debug, Clone)]
pub struct BigQueryConnection {
    conn: Connection,
}

impl BigQueryConnection {
    pub(crate) async fn test(config: BigQueryConfig) -> Result<Option<String>> {
        let conn = Self::make_conn(config).await?;
        conn.query("SELECT 1;".into()).await?;
        Ok(None)
    }

    pub(crate) async fn connect(config: BigQueryConfig) -> Result<Database> {
        let conn = Self::make_conn(config).await?;
        Ok(Database::BigQuery(Self { conn }))
    }

    async fn make_conn(config: BigQueryConfig) -> Result<Connection> {
        let key = match config.auth {
            BigQueryAuth::JsonKey { content } => content.ok_or(bigquery::Error::MissingJsonKey)?,
        };
        let conn = Connection::new(key, config.project_id, config.dataset).await?;
        Ok(conn)
    }

    pub(crate) async fn select(&self, sql: String) -> Result<Vec<Vec<Value>>> {
        let rows = self.conn.query(sql).await?.rows;
        Ok(rows)
    }

    pub(crate) async fn execute(&self, sql: String) -> Result<()> {
        self.conn.query(sql).await?;
        Ok(())
    }

    // TODO
    pub(crate) async fn transaction(&self, sqls: Vec<String>) -> Result<()> {
        for sql in sqls {
            self.execute(sql).await?;
        }
        Ok(())
    }

    pub(crate) async fn query(&self, sql: String) -> Result<Query> {
        let query = self.conn.query(sql).await?;
        Ok(query)
    }

    // TODO
    pub(crate) async fn batch_insert(&self, insert: ChunkInsert) -> Result<()> {
        unordered_tasks(100, insert, |sql| {
            let conn = self.conn.clone();
            async move { conn.query(sql).await.map(|_| ()) }.boxed()
        })
        .await?;
        Ok(())
    }
}
