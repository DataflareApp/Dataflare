mod bigquery;
mod clickhouse;
mod d1;
mod databend;
mod databricks;
mod duckdb;
mod echolite;
mod error;
mod mssql;
mod mysql;
mod postgres;
mod presto;
mod r2sql;
mod rqlite;
mod sqlcipher;
mod sqlite;
mod trino;
mod turso;
mod utils;
mod workers_analytics_engine;

use bigquery::BigQueryConnection;
use clickhouse::ClickHouseConnection;
use d1::D1Connection;
use databend::DatabendConnection;
use databricks::DatabricksConnection;
use duckdb::DuckDbConnection;
use echolite::EchoLiteConnection;
use kvdb::{
    CommandOutput, Cursor, GenericValue, Key, Keys, KvDatabase, KvDatabaseConfig, KvInput,
    KvOutput, NameSpace,
};
use mssql::MsSqlConnection;
use mysql::MySqlConnection;
use postgres::{COCKROACH_DEFAULT_PORT, POSTGRES_DEFAULT_PORT, PostgresConnection};
use presto::PrestoConnection;
use query::{Query, Value};
use r2sql::R2SqlConnection;
use rqlite::RqliteConnection;
use sqlcipher::SqlCipherConnection;
use sqlite::SqliteConnection;
use std::fmt::Debug;
use std::sync::Arc;
use trino::TrinoConnection;
use turso::TursoConnection;
use workers_analytics_engine::WorkersAnalyticsEngineConnection;

pub use batch_insert::{BatchInsertOptions, ChunkInsert, SingleInsert};
pub use connection_config::*;
pub use error::Error;

pub(crate) const LOCALHOST: &str = "localhost";
pub(crate) type Result<T, E = Error> = std::result::Result<T, E>;

#[derive(Debug, Clone)]
pub enum Database {
    Sqlite(SqliteConnection),
    SqlCipher(SqlCipherConnection),
    Postgres(PostgresConnection),
    MySql(MySqlConnection),
    MsSql(MsSqlConnection),
    ClickHouse(ClickHouseConnection),
    Databend(DatabendConnection),
    BigQuery(BigQueryConnection),
    Trino(TrinoConnection),
    Presto(PrestoConnection),
    Databricks(DatabricksConnection),
    Turso(TursoConnection),
    Rqlite(RqliteConnection),
    EchoLite(EchoLiteConnection),
    D1(D1Connection),
    WorkersAnalyticsEngine(WorkersAnalyticsEngineConnection),
    R2Sql(R2SqlConnection),
    DuckDb(DuckDbConnection),
    Kv(Arc<Box<dyn KvDatabase>>),
}

impl Database {
    #[rustfmt::skip]
    pub async fn test(config: ConnectionConfig) -> Result<Option<String>> {
        match config {
            ConnectionConfig::SQLite(config) => SqliteConnection::test(config).await,
            ConnectionConfig::SQLCipher(config) => SqlCipherConnection::test(config).await,
            ConnectionConfig::PostgreSQL(config) => PostgresConnection::test_postgres(config, POSTGRES_DEFAULT_PORT).await,
            ConnectionConfig::CockroachDB(config) => PostgresConnection::test_postgres(config, COCKROACH_DEFAULT_PORT).await,
            ConnectionConfig::QuestDB(config) => PostgresConnection::test_questdb(config).await,
            ConnectionConfig::MySQL(config) => MySqlConnection::test(config).await,
            ConnectionConfig::MariaDB(config) => MySqlConnection::test(config).await,
            ConnectionConfig::ManticoreSearch(config) => {
                MySqlConnection::test_manticore_search(config).await
            }
            ConnectionConfig::MSSQL(config) => MsSqlConnection::test(config).await,
            ConnectionConfig::ClickHouse(config) => ClickHouseConnection::test(config).await,
            ConnectionConfig::Databend(config) => DatabendConnection::test(config).await,
            ConnectionConfig::BigQuery(config) => BigQueryConnection::test(config).await,
            ConnectionConfig::Trino(config) => TrinoConnection::test(config).await,
            ConnectionConfig::Presto(config) => PrestoConnection::test(config).await,
            ConnectionConfig::Databricks(config) => DatabricksConnection::test(config).await,
            ConnectionConfig::Turso(config) => TursoConnection::test(config).await,
            ConnectionConfig::Rqlite(config) => RqliteConnection::test(config).await,
            ConnectionConfig::EchoLite(config) => EchoLiteConnection::test(config).await,
            ConnectionConfig::CloudflareD1(config) => D1Connection::test(config).await,
            ConnectionConfig::WorkersAnalyticsEngine(config) => WorkersAnalyticsEngineConnection::test(config).await,
            ConnectionConfig::R2Sql(config) => R2SqlConnection::test(config).await,
            ConnectionConfig::DuckDB(config) => DuckDbConnection::test(config).await,
            ConnectionConfig::CloudflareKv(config) => {
                KvDatabaseConfig::CloudflareKv(config).test().await?;
                Ok(None)
            }
            ConnectionConfig::Redis(config) => {
                KvDatabaseConfig::Redis(config).test().await?;
                Ok(None)
            }
            ConnectionConfig::S3(config) => {
                KvDatabaseConfig::S3(config).test().await?;
                Ok(None)
            }
        }
    }

    #[rustfmt::skip]
    pub async fn connect(config: ConnectionConfig) -> Result<Self> {
        match config {
            ConnectionConfig::SQLite(config) => SqliteConnection::connect(config).await,
            ConnectionConfig::SQLCipher(config) => SqlCipherConnection::connect(config).await,
            ConnectionConfig::PostgreSQL(config) => PostgresConnection::connect_postgres(config, POSTGRES_DEFAULT_PORT).await,
            ConnectionConfig::CockroachDB(config) => PostgresConnection::connect_postgres(config, COCKROACH_DEFAULT_PORT).await,
            ConnectionConfig::QuestDB(config) => PostgresConnection::connect_questdb(config).await,
            ConnectionConfig::MySQL(config) => MySqlConnection::connect(config).await,
            ConnectionConfig::MariaDB(config) => MySqlConnection::connect(config).await,
            ConnectionConfig::ManticoreSearch(config) => {
                MySqlConnection::connect_manticore_search(config).await
            }
            ConnectionConfig::MSSQL(config) => MsSqlConnection::connect(config).await,
            ConnectionConfig::ClickHouse(config) => ClickHouseConnection::connect(config).await,
            ConnectionConfig::Databend(config) => DatabendConnection::connect(config).await,
            ConnectionConfig::BigQuery(config) => BigQueryConnection::connect(config).await,
            ConnectionConfig::Trino(config) => TrinoConnection::connect(config).await,
            ConnectionConfig::Presto(config) => PrestoConnection::connect(config).await,
            ConnectionConfig::Databricks(config) => DatabricksConnection::connect(config).await,
            ConnectionConfig::Turso(config) => TursoConnection::connect(config).await,
            ConnectionConfig::Rqlite(config) => RqliteConnection::connect(config).await,
            ConnectionConfig::EchoLite(config) => EchoLiteConnection::connect(config).await,
            ConnectionConfig::CloudflareD1(config) => D1Connection::connect(config).await,
            ConnectionConfig::WorkersAnalyticsEngine(config) => WorkersAnalyticsEngineConnection::connect(config).await,
            ConnectionConfig::R2Sql(config) => R2SqlConnection::connect(config).await,
            ConnectionConfig::DuckDB(config) => DuckDbConnection::connect(config).await,
            ConnectionConfig::CloudflareKv(config) => {
                let db = KvDatabaseConfig::CloudflareKv(config).connect().await?;
                Ok(Self::Kv(Arc::new(db)))
            }
            ConnectionConfig::Redis(config) => {
                let db = KvDatabaseConfig::Redis(config).connect().await?;
                Ok(Self::Kv(Arc::new(db)))
            }
            ConnectionConfig::S3(config) => {
                let db = KvDatabaseConfig::S3(config).connect().await?;
                Ok(Self::Kv(Arc::new(db)))
            }
        }
    }

    pub async fn sql_select(&self, sql: String) -> Result<Vec<Vec<Value>>> {
        match &self {
            Self::Sqlite(db) => db.select(sql).await,
            Self::SqlCipher(db) => db.select(sql).await,
            Self::Postgres(db) => db.select(sql).await,
            Self::MySql(db) => db.select(sql).await,
            Self::MsSql(db) => db.select(sql).await,
            Self::ClickHouse(db) => db.select(sql).await,
            Self::Databend(db) => db.select(sql).await,
            Self::BigQuery(db) => db.select(sql).await,
            Self::Trino(db) => db.select(sql).await,
            Self::Presto(db) => db.select(sql).await,
            Self::Databricks(db) => db.select(sql).await,
            Self::Turso(db) => db.select(sql).await,
            Self::Rqlite(db) => db.select(sql).await,
            Self::EchoLite(db) => db.select(sql).await,
            Self::D1(db) => db.select(sql).await,
            Self::WorkersAnalyticsEngine(db) => db.select(sql).await,
            Self::R2Sql(db) => db.select(sql).await,
            Self::DuckDb(db) => db.select(sql).await,
            Self::Kv(_) => Err(Error::InvalidDatabaseType),
        }
    }

    pub async fn sql_execute(&self, sql: String) -> Result<()> {
        match &self {
            Self::Sqlite(db) => db.execute(sql).await,
            Self::SqlCipher(db) => db.execute(sql).await,
            Self::Postgres(db) => db.execute(sql).await,
            Self::MySql(db) => db.execute(sql).await,
            Self::MsSql(db) => db.execute(sql).await,
            Self::ClickHouse(db) => db.execute(sql).await,
            Self::Databend(db) => db.execute(sql).await,
            Self::BigQuery(db) => db.execute(sql).await,
            Self::Trino(db) => db.execute(sql).await,
            Self::Presto(db) => db.execute(sql).await,
            Self::Databricks(db) => db.execute(sql).await,
            Self::Turso(db) => db.execute(sql).await,
            Self::Rqlite(db) => db.execute(sql).await,
            Self::EchoLite(db) => db.execute(sql).await,
            Self::D1(db) => db.execute(sql).await,
            Self::WorkersAnalyticsEngine(db) => db.execute(sql).await,
            Self::R2Sql(db) => db.execute(sql).await,
            Self::DuckDb(db) => db.execute(sql).await,
            Self::Kv(_) => Err(Error::InvalidDatabaseType),
        }
    }

    pub async fn sql_transaction(&self, sqls: Vec<String>) -> Result<()> {
        match &self {
            Self::Sqlite(db) => db.transaction(sqls).await,
            Self::SqlCipher(db) => db.transaction(sqls).await,
            Self::Postgres(db) => db.transaction(sqls).await,
            Self::MySql(db) => db.transaction(sqls).await,
            Self::MsSql(db) => db.transaction(sqls).await,
            Self::ClickHouse(db) => db.transaction(sqls).await,
            Self::Databend(db) => db.transaction(sqls).await,
            Self::BigQuery(db) => db.transaction(sqls).await,
            Self::Trino(db) => db.transaction(sqls).await,
            Self::Presto(db) => db.transaction(sqls).await,
            Self::Databricks(db) => db.transaction(sqls).await,
            Self::Turso(db) => db.transaction(sqls).await,
            Self::Rqlite(db) => db.transaction(sqls).await,
            Self::EchoLite(db) => db.transaction(sqls).await,
            Self::D1(db) => db.transaction(sqls).await,
            Self::WorkersAnalyticsEngine(db) => db.transaction(sqls).await,
            Self::R2Sql(db) => db.transaction(sqls).await,
            Self::DuckDb(db) => db.transaction(sqls).await,
            Self::Kv(_) => Err(Error::InvalidDatabaseType),
        }
    }

    pub async fn sql_query(&self, sql: String) -> Result<Query> {
        match &self {
            Self::Sqlite(db) => db.query(sql).await,
            Self::SqlCipher(db) => db.query(sql).await,
            Self::Postgres(db) => db.query(sql).await,
            Self::MySql(db) => db.query(sql).await,
            Self::MsSql(db) => db.query(sql).await,
            Self::ClickHouse(db) => db.query(sql).await,
            Self::Databend(db) => db.query(sql).await,
            Self::BigQuery(db) => db.query(sql).await,
            Self::Trino(db) => db.query(sql).await,
            Self::Presto(db) => db.query(sql).await,
            Self::Databricks(db) => db.query(sql).await,
            Self::Turso(db) => db.query(sql).await,
            Self::Rqlite(db) => db.query(sql).await,
            Self::EchoLite(db) => db.query(sql).await,
            Self::D1(db) => db.query(sql).await,
            Self::WorkersAnalyticsEngine(db) => db.query(sql).await,
            Self::R2Sql(db) => db.query(sql).await,
            Self::DuckDb(db) => db.query(sql).await,
            Self::Kv(_) => Err(Error::InvalidDatabaseType),
        }
    }

    pub async fn sql_batch_insert(&self, insert: ChunkInsert) -> Result<()> {
        match &self {
            Self::Sqlite(db) => db.batch_insert(insert).await,
            Self::SqlCipher(db) => db.batch_insert(insert).await,
            Self::Postgres(db) => db.batch_insert(insert).await,
            Self::MySql(db) => db.batch_insert(insert).await,
            Self::MsSql(db) => db.batch_insert(insert).await,
            Self::ClickHouse(db) => db.batch_insert(insert).await,
            Self::Databend(db) => db.batch_insert(insert).await,
            Self::BigQuery(db) => db.batch_insert(insert).await,
            Self::Trino(db) => db.batch_insert(insert).await,
            Self::Presto(db) => db.batch_insert(insert).await,
            Self::Databricks(db) => db.batch_insert(insert).await,
            Self::Turso(db) => db.batch_insert(insert).await,
            Self::Rqlite(db) => db.batch_insert(insert).await,
            Self::EchoLite(db) => db.batch_insert(insert).await,
            Self::D1(db) => db.batch_insert(insert).await,
            Self::WorkersAnalyticsEngine(db) => db.batch_insert(insert).await,
            Self::R2Sql(db) => db.batch_insert(insert).await,
            Self::DuckDb(db) => db.batch_insert(insert).await,
            Self::Kv(_) => Err(Error::InvalidDatabaseType),
        }
    }

    pub async fn kv_namespaces(&self) -> Result<Vec<NameSpace>> {
        match &self {
            Self::Kv(db) => Ok(db.namespaces().await?),
            _ => Err(Error::InvalidDatabaseType),
        }
    }

    pub async fn kv_keys(
        &self,
        namespace: String,
        cursor: Option<Cursor>,
        search: Option<String>,
    ) -> Result<Keys> {
        match &self {
            Self::Kv(db) => Ok(db.keys(namespace, cursor, 100, search).await?),
            _ => Err(Error::InvalidDatabaseType),
        }
    }

    pub async fn kv_get(&self, namespace: String, key: Key) -> Result<KvOutput> {
        match &self {
            Self::Kv(db) => Ok(db.get(namespace, key).await?),
            _ => Err(Error::InvalidDatabaseType),
        }
    }

    pub async fn kv_get_content(&self, namespace: String, key: Key) -> Result<GenericValue> {
        match &self {
            Self::Kv(db) => Ok(db.get_content(namespace, key).await?),
            _ => Err(Error::InvalidDatabaseType),
        }
    }

    pub async fn kv_download_content(
        &self,
        namespace: String,
        key: Key,
        path: String,
    ) -> Result<()> {
        match &self {
            Self::Kv(db) => Ok(db.download_content(namespace, key, path).await?),
            _ => Err(Error::InvalidDatabaseType),
        }
    }

    pub async fn kv_set(&self, namespace: String, key: Key, value: KvInput) -> Result<()> {
        match &self {
            Self::Kv(db) => Ok(db.set(namespace, key, value).await?),
            _ => Err(Error::InvalidDatabaseType),
        }
    }

    pub async fn kv_delete(&self, namespace: String, key: Key) -> Result<()> {
        match &self {
            Self::Kv(db) => Ok(db.delete(namespace, key).await?),
            _ => Err(Error::InvalidDatabaseType),
        }
    }

    pub async fn kv_run_command(
        &self,
        namespace: String,
        command: String,
        readonly: bool,
    ) -> Result<CommandOutput> {
        match &self {
            Self::Kv(db) => Ok(db.run_command(namespace, command, readonly).await?),
            _ => Err(Error::InvalidDatabaseType),
        }
    }
}
