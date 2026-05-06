use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Run blocking task error: {0}")]
    BlockingTask(#[from] tokio::task::JoinError),
    #[error(transparent)]
    Proxy(#[from] proxy::Error),
    #[error(transparent)]
    Postgres(#[from] pgsq::Error),
    #[error(transparent)]
    PostgresDecoder(#[from] pgsq::DecodeError),
    #[error(transparent)]
    MySql(#[from] mysql::Error),
    #[error(transparent)]
    MySqlDecoder(#[from] mysql::DecodeError),
    #[error(transparent)]
    Sqlite(#[from] rusqlite::Error),
    #[error(transparent)]
    DylibDriver(#[from] dylib::driver::Error),
    #[error(transparent)]
    Mssql(#[from] tiberius::error::Error),
    #[error(transparent)]
    TursoRemote(#[from] turso_remote::Error),
    #[error(transparent)]
    Rqlite(#[from] rqlite::Error),
    #[error(transparent)]
    EchoLite(#[from] echolite::Error),
    #[error(transparent)]
    CloudflareD1(#[from] cloudflare_d1::Error),
    #[error(transparent)]
    WorkersAnalyticsEngine(#[from] workers_analytics_engine::Error),
    #[error(transparent)]
    R2Sql(#[from] r2sql::Error),
    #[error(transparent)]
    ClickHouse(#[from] clickhouse::Error),
    #[error(transparent)]
    Databend(#[from] databend::Error),
    #[error(transparent)]
    BigQuery(#[from] bigquery::Error),
    #[error(transparent)]
    Trino(#[from] trino::Error),
    #[error(transparent)]
    Presto(#[from] presto::Error),
    #[error(transparent)]
    Databricks(#[from] databricks::Error),
    #[error(transparent)]
    Kvdb(#[from] kvdb::KvDatabaseError),
    #[error("Invalid database type, NOTE: this error should not occur")]
    InvalidDatabaseType,
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
