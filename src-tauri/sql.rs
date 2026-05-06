use database::SqlDatabaseType;
use sqlstmt::{
    AnsiDialect, BigQueryDialect, ClickHouseDialect, DatabricksDialect, DdlType, Dialect,
    DuckDbDialect, MsSqlDialect, MySqlDialect, PostgreSqlDialect, SQLiteDialect, StatementPosition,
};
use tauri::command;

fn to_dialect(db: SqlDatabaseType) -> Box<dyn Dialect> {
    match db {
        SqlDatabaseType::SQLite
        | SqlDatabaseType::SQLCipher
        | SqlDatabaseType::Turso
        | SqlDatabaseType::Rqlite
        | SqlDatabaseType::EchoLite
        | SqlDatabaseType::CloudflareD1 => Box::new(SQLiteDialect {}),
        SqlDatabaseType::PostgreSQL | SqlDatabaseType::CockroachDB | SqlDatabaseType::QuestDB => {
            Box::new(PostgreSqlDialect {})
        }
        SqlDatabaseType::MySQL | SqlDatabaseType::MariaDB | SqlDatabaseType::ManticoreSearch => {
            Box::new(MySqlDialect {})
        }
        SqlDatabaseType::MSSQL => Box::new(MsSqlDialect {}),
        SqlDatabaseType::ClickHouse | SqlDatabaseType::Databend => Box::new(ClickHouseDialect {}),
        SqlDatabaseType::DuckDB => Box::new(DuckDbDialect {}),
        SqlDatabaseType::BigQuery => Box::new(BigQueryDialect {}),
        // Trino / Presto are ANSI SQL compliant query engines: https://trino.io/docs/current/language.html
        SqlDatabaseType::Trino | SqlDatabaseType::Presto => Box::new(AnsiDialect {}),
        SqlDatabaseType::Databricks => Box::new(DatabricksDialect {}),
        // Not sure which SQL dialect Workers Analytics Engine uses, using ClickHouse dialect for now
        SqlDatabaseType::WorkersAnalyticsEngine => Box::new(ClickHouseDialect {}),
        // R2 SQL uses ANSI-like syntax
        SqlDatabaseType::R2Sql => Box::new(AnsiDialect {}),
    }
}

#[command]
pub fn format(sql: String) -> String {
    sqlstmt::format(sql)
}

#[command]
pub fn minify(db: SqlDatabaseType, sql: &str) -> Result<String, String> {
    sqlstmt::minify(&*to_dialect(db), sql)
}

#[command]
pub fn statements_position(db: SqlDatabaseType, sql: &str) -> Result<Vec<StatementPosition>, ()> {
    sqlstmt::statements_position(&*to_dialect(db), sql)
}

#[command]
pub fn statement_readonly(db: SqlDatabaseType, sql: &str) -> bool {
    sqlstmt::statement_readonly(&*to_dialect(db), sql)
}

#[command]
pub fn ddl_type(db: SqlDatabaseType, sqls: Vec<String>) -> DdlType {
    sqlstmt::ddl_type(&*to_dialect(db), sqls)
}
