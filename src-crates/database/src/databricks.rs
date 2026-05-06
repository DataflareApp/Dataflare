use crate::utils::FirstCell;
use crate::{ChunkInsert, Database, DatabricksConfig, Result, Value};
use connection_config::{ConnectProtocol, DatabricksAuth};
use databricks::{Connection, config::Config};
use query::{Query, QueryColumn};
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Clone)]
pub struct DatabricksConnection {
    conn: Arc<Mutex<Connection>>,
}

impl DatabricksConnection {
    pub(crate) async fn test(config: DatabricksConfig) -> Result<Option<String>> {
        let conn = Self::make_conn(config).await?;
        let sql = r#"
            SELECT concat(
                'Apache Spark: ', split(version(), ' ')[0],
                '\n', 
                'Databricks Runtime: ', coalesce(current_version().dbr_version, 'null'),
                '\n',
                'Databricks SQL: ', coalesce(current_version().dbsql_version, 'null')
            ) AS info;
        "#
        .trim();
        let mut rows = conn.select(sql.into()).await?;
        rows.first_cell_string().map(Some)
    }

    pub(crate) async fn connect(config: DatabricksConfig) -> Result<Database> {
        let conn = Self::make_conn(config).await?;
        Ok(Database::Databricks(conn))
    }

    async fn make_conn(config: DatabricksConfig) -> Result<Self> {
        let token = match config.auth {
            DatabricksAuth::Token { token } => token,
        };
        let conn_config = Config {
            https: config.protocol == ConnectProtocol::Https,
            host: config.host,
            port: match config.port {
                Some(p) => p,
                None => match config.protocol {
                    ConnectProtocol::Https => 443,
                    ConnectProtocol::Http => 80,
                },
            },
            http_path: config.http_path,
            token,
            catalog: config.catalog,
            schema: config.schema,
            allow_invalid_certs: config.allow_invalid_certs,
            proxy: config.proxy,
        };
        let conn = Connection::open_with(conn_config).await?;
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    pub(crate) async fn query(&self, sql: String) -> Result<Query> {
        let resp = { self.conn.lock().await.query(sql).await? };
        let columns = resp
            .columns
            .into_iter()
            .map(|c| QueryColumn::new(c.name, c.datatype))
            .collect();
        let rows = resp
            .rows
            .into_iter()
            .map(|row| row.into_iter().map(map_value).collect())
            .collect();
        Ok(Query {
            columns,
            rows,
            rows_affected: resp.rows_affected,
            duration: resp.duration.unwrap_or(0),
        })
    }

    pub(crate) async fn select(&self, sql: String) -> Result<Vec<Vec<Value>>> {
        let query = self.query(sql).await?;
        Ok(query.rows)
    }

    pub(crate) async fn execute(&self, sql: String) -> Result<()> {
        self.query(sql).await?;
        Ok(())
    }

    // TODO: Consider using BEGIN ATOMIC in the future
    // https://docs.databricks.com/aws/en/transactions/
    pub(crate) async fn transaction(&self, sqls: Vec<String>) -> Result<()> {
        if sqls.len() == 1 {
            self.conn.lock().await.query(&sqls[0]).await?;
            return Ok(());
        }
        let mut conn = self.conn.lock().await;
        conn.query("BEGIN TRANSACTION").await?;
        for sql in sqls {
            if let Err(err) = conn.query(&sql).await {
                let _ = conn.query("ROLLBACK TRANSACTION").await;
                return Err(err.into());
            }
        }
        conn.query("COMMIT TRANSACTION").await?;
        Ok(())
    }

    // TODO: Should open a separate session?
    // Batch insert here occupies the current session, preventing parallel execution of other queries
    pub(crate) async fn batch_insert(&self, insert: ChunkInsert) -> Result<()> {
        for sql in insert {
            self.conn.lock().await.query(sql).await?;
        }
        Ok(())
    }
}

#[inline]
fn map_value(v: databricks::Value) -> Value {
    match v {
        databricks::Value::Null => Value::Null,
        databricks::Value::Boolean(b) => Value::Bool(b),
        databricks::Value::TinyInt(i) => Value::I8(i),
        databricks::Value::SmallInt(i) => Value::I16(i),
        databricks::Value::Int(i) => Value::I32(i),
        databricks::Value::BigInt(i) => Value::I64(i),
        databricks::Value::Float(f) => Value::F32(f),
        databricks::Value::Double(f) => Value::F64(f),
        databricks::Value::String(s) => Value::String(s),
        databricks::Value::Binary(b) => Value::from_bytes(b),
    }
}
