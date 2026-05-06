use crate::utils::{FirstCell, empty_if, unordered_tasks};
use crate::{ChunkInsert, ClickHouseConfig, ConnectProtocol, Database, LOCALHOST, Result, Value};
use clickhouse::{Config, Connection};
use futures_util::FutureExt;
use query::Query;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Clone)]
pub struct ClickHouseConnection {
    conn: Arc<Mutex<Connection>>,
}

impl ClickHouseConnection {
    pub(crate) async fn test(config: ClickHouseConfig) -> Result<Option<String>> {
        let config = Self::make_options(config);
        let mut conn = Connection::open_with(config)?;
        conn.query("SELECT concat('ClickHouse version: ', version());".into())
            .await?
            .rows
            .first_cell_string()
            .map(Some)
    }

    pub(crate) async fn connect(config: ClickHouseConfig) -> Result<Database> {
        let config = Self::make_options(config);
        Ok(Database::ClickHouse(Self {
            conn: Arc::new(Mutex::new(Connection::open_with(config)?)),
        }))
    }

    fn make_options(config: ClickHouseConfig) -> Config {
        let host = empty_if(config.host, LOCALHOST);
        let port = match config.port {
            Some(port) => port,
            None => {
                if config.protocol == ConnectProtocol::Https {
                    8443
                } else {
                    8123
                }
            }
        };
        let user = empty_if(config.user, "default");
        let database = empty_if(config.database, "default");
        Config {
            https: config.protocol == ConnectProtocol::Https,
            host,
            port,
            user,
            password: config.password,
            database,
            proxy: config.proxy,
        }
    }

    pub(crate) async fn select(&self, sql: String) -> Result<Vec<Vec<Value>>> {
        let rows = self.conn.lock().await.query(sql).await?.rows;
        Ok(rows)
    }

    pub(crate) async fn execute(&self, sql: String) -> Result<()> {
        self.conn.lock().await.query(sql).await?;
        Ok(())
    }

    // TODO
    pub(crate) async fn transaction(&self, sqls: Vec<String>) -> Result<()> {
        let mut conn = self.conn.lock().await;
        for sql in sqls {
            conn.query(sql).await?;
        }
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
