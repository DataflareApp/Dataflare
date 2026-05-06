mod process;

pub use process::*;

use proxy::{Proxy, ProxyConfig, ProxyHandler};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "options")]
pub enum BackupConfig {
    SQLite(SqliteBackupConfig),
    DuckDB(DuckDbBackupConfig),
    PostgreSQL(PostgresBackupConfig),
    MySQL(MySqlBackupConfig),
    Redis(RedisBackupConfig),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SqliteBackupConfig {
    pub sqlite3_path: String,
    pub database_path: String,
    pub tables: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuckDbBackupConfig {
    pub duckdb_path: String,
    pub database_path: String,
    pub tables: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostgresBackupConfig {
    pub pg_dump_path: String,
    pub host: String,
    pub port: String,
    pub username: String,
    pub password: String,
    pub database: String,

    pub format: PgFormat,
    pub statement: PgStatementOption,
    pub schemas: Vec<String>,
    pub exclude_schemas: Vec<String>,
    pub tables: Vec<String>,
    pub exclude_tables: Vec<String>,

    pub flags: Vec<String>,
    pub custom: String,

    pub proxy: Option<ProxyConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PgStatementOption {
    Copy,
    Insert,
    #[serde(rename = "Column Insert")]
    ColumnInsert,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PgFormat {
    Plain,
    Custom,
    // TODO: This does not output to stdout, and -f must specify a directory
    // Directory { directory: String },
    Tar,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MySqlBackupConfig {
    pub mysqldump_path: String,
    pub host: String,
    pub port: String,
    pub username: String,
    pub password: Option<String>,

    pub databases: Vec<String>,
    pub tables: Vec<String>,
    pub ignore_tables: Vec<String>,
    pub flags: Vec<String>,
    pub custom: String,

    pub proxy: Option<ProxyConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisBackupConfig {
    pub redis_cli_path: String,
    pub host: String,
    pub port: String,
    pub username: Option<String>,
    pub password: Option<String>,
    pub tls: Option<RedisBackupTlsConfig>,
    pub proxy: Option<ProxyConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisBackupTlsConfig {
    pub enabled: bool,
    pub insecure: bool,
    // TODO: Cert
}

impl BackupConfig {
    // Replace target address with proxy address
    async fn start_proxy(
        proxy: ProxyConfig,
        host: &mut String,
        port: &mut String,
    ) -> Result<ProxyHandler, String> {
        let port_ = port
            .parse::<u16>()
            .map_err(|_| "Invalid port number".to_string())?;
        let (addr, ph) = Proxy::new(host.clone(), port_, proxy)
            .listen()
            .await
            .map_err(|err| err.to_string())?;
        *host = addr.ip().to_string();
        *port = addr.port().to_string();
        Ok(ph)
    }

    pub async fn try_proxy(&mut self) -> Result<Option<ProxyHandler>, String> {
        match self {
            BackupConfig::SQLite(_) => Ok(None),
            BackupConfig::DuckDB(_) => Ok(None),
            BackupConfig::PostgreSQL(config) => {
                if let Some(proxy) = config.proxy.take() {
                    let ph = Self::start_proxy(proxy, &mut config.host, &mut config.port).await?;
                    return Ok(Some(ph));
                }
                Ok(None)
            }
            BackupConfig::MySQL(config) => {
                if let Some(proxy) = config.proxy.take() {
                    let ph = Self::start_proxy(proxy, &mut config.host, &mut config.port).await?;
                    return Ok(Some(ph));
                }
                Ok(None)
            }
            BackupConfig::Redis(config) => {
                if let Some(proxy) = config.proxy.take() {
                    let ph = Self::start_proxy(proxy, &mut config.host, &mut config.port).await?;
                    return Ok(Some(ph));
                }
                Ok(None)
            }
        }
    }

    pub fn program(&self) -> &str {
        macro_rules! empty_if {
            ($s:expr, $default:expr) => {
                if $s.is_empty() { $default } else { $s }
            };
        }
        match self {
            BackupConfig::SQLite(config) => {
                empty_if!(&config.sqlite3_path, "sqlite3")
            }
            BackupConfig::DuckDB(config) => empty_if!(&config.duckdb_path, "duckdb"),
            BackupConfig::PostgreSQL(config) => empty_if!(&config.pg_dump_path, "pg_dump"),
            BackupConfig::MySQL(config) => empty_if!(&config.mysqldump_path, "mysqldump"),
            BackupConfig::Redis(config) => empty_if!(&config.redis_cli_path, "redis-cli"),
        }
    }

    pub fn args(&self) -> Result<Vec<String>, String> {
        match self {
            Self::SQLite(config) => {
                let mut args = Vec::new();
                {
                    args.push(config.database_path.clone());
                }
                {
                    if config.tables.is_empty() {
                        args.push(".dump".into());
                    } else {
                        let mut items = Vec::new();
                        items.push(".dump".into());
                        items.extend_from_slice(&config.tables);
                        args.push(items.join(" "));
                    }
                }
                Ok(args)
            }
            Self::DuckDB(config) => {
                let mut args = Vec::new();
                {
                    args.push(config.database_path.clone());
                }
                {
                    if config.tables.is_empty() {
                        args.push(".dump".into());
                    } else {
                        let mut items = Vec::new();
                        items.push(".dump".into());
                        items.extend_from_slice(&config.tables);
                        args.push(items.join(" "));
                    }
                }
                Ok(args)
            }
            Self::PostgreSQL(config) => {
                let mut args = Vec::new();
                {
                    args.push("--host".into());
                    args.push(config.host.clone());
                }
                {
                    args.push("--port".into());
                    args.push(config.port.clone());
                }
                if !config.username.is_empty() {
                    args.push("--username".into());
                    args.push(config.username.clone());
                }
                {
                    args.push("--no-password".into());
                }
                if !config.database.is_empty() {
                    args.push("--dbname".into());
                    args.push(config.database.clone());
                }
                {
                    args.push("--format".into());
                    match &config.format {
                        PgFormat::Plain => args.push("plain".into()),
                        PgFormat::Custom => args.push("custom".into()),
                        PgFormat::Tar => args.push("tar".into()),
                    }
                }
                {
                    match config.statement {
                        PgStatementOption::Copy => {}
                        PgStatementOption::Insert => args.push("--inserts".into()),
                        PgStatementOption::ColumnInsert => args.push("--column-inserts".into()),
                    }
                }
                {
                    for schema in &config.schemas {
                        args.push("--schema".into());
                        args.push(schema.clone());
                    }
                }
                {
                    for schema in &config.exclude_schemas {
                        args.push("--exclude-schema".into());
                        args.push(schema.clone());
                    }
                }
                {
                    for table in &config.tables {
                        args.push("--table".into());
                        args.push(table.clone());
                    }
                }
                {
                    for table in &config.exclude_tables {
                        args.push("--exclude-table".into());
                        args.push(table.clone());
                    }
                }
                {
                    for flag in &config.flags {
                        args.push(flag.clone());
                    }
                }
                if !config.custom.is_empty() {
                    let items = shell::args_split(&config.custom)
                        .map_err(|_| "Invalid custom shell arguments".to_string())?;
                    args.extend(items);
                }
                Ok(args)
            }
            Self::MySQL(config) => {
                let mut args = Vec::new();
                {
                    args.push("--host".into());
                    args.push(config.host.clone());
                }
                {
                    args.push("--port".into());
                    args.push(config.port.clone());
                }
                if !config.username.is_empty() {
                    args.push("--user".into());
                    args.push(config.username.clone());
                }
                {
                    if config.databases.is_empty() {
                        args.push("--all-databases".into());
                    } else {
                        args.push("--databases".into());
                        for db in &config.databases {
                            args.push(db.clone());
                        }
                    }
                }
                {
                    if !config.tables.is_empty() {
                        args.push("--tables".into());
                        for table in &config.tables {
                            args.push(table.clone());
                        }
                    }
                }
                {
                    for table in &config.ignore_tables {
                        args.push(format!("--ignore-table={table}"));
                    }
                }
                {
                    for flag in &config.flags {
                        args.push(flag.clone());
                    }
                }
                {
                    if !config.custom.is_empty() {
                        let items = shell::args_split(&config.custom)
                            .map_err(|_| "Invalid custom shell arguments".to_string())?;
                        args.extend(items);
                    }
                }
                Ok(args)
            }
            Self::Redis(config) => {
                let mut args = Vec::new();
                {
                    args.push("-h".into());
                    args.push(config.host.clone());
                }
                {
                    args.push("-p".into());
                    args.push(config.port.clone());
                }
                if let Some(user) = &config.username {
                    args.push("--user".into());
                    args.push(user.clone());
                }
                if let Some(tls) = &config.tls {
                    if tls.enabled {
                        args.push("--tls".into());
                    }
                    if tls.insecure {
                        args.push("--insecure".into());
                    }
                }
                args.push("--rdb".into());
                args.push("-".into());
                Ok(args)
            }
        }
    }

    pub fn env(&self) -> Option<(String, String)> {
        match self {
            BackupConfig::SQLite(_) => None,
            BackupConfig::DuckDB(_) => None,
            BackupConfig::PostgreSQL(config) => {
                Some(("PGPASSWORD".into(), config.password.clone()))
            }
            BackupConfig::MySQL(config) => config
                .password
                .as_ref()
                .map(|p| ("MYSQL_PWD".into(), p.clone())),
            BackupConfig::Redis(config) => config
                .password
                .as_ref()
                .map(|p| ("REDISCLI_AUTH".into(), p.clone())),
        }
    }

    pub fn command_string(&self) -> Result<String, String> {
        let program = shell::arg_escape(self.program().into());
        let args = self
            .args()?
            .into_iter()
            .map(|arg| shell::arg_escape(arg.into()))
            .collect::<Vec<_>>()
            .join(" ");
        Ok(format!("{program} {args}"))
    }

    pub fn command(self) -> Result<Cmd, String> {
        let mut cmd = Cmd::new(self.program());
        cmd.args(self.args()?);
        if let Some((key, value)) = self.env() {
            cmd.env(key, value);
        }
        Ok(cmd)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_command_string() {
        fn t(binary: &str, db: &str) -> String {
            let backup_config = BackupConfig::SQLite(SqliteBackupConfig {
                sqlite3_path: binary.into(),
                database_path: db.into(),
                tables: vec![],
            });
            backup_config.command_string().unwrap()
        }

        assert_eq!(t("sqlite3", "test.db"), "sqlite3 test.db .dump");

        let a = t("sqlite3", "");
        #[cfg(any(target_os = "linux", target_os = "macos"))]
        assert_eq!(a, "sqlite3 '' .dump");
        #[cfg(target_os = "windows")]
        assert_eq!(a, "sqlite3 \"\" .dump");

        let a = t("/usr/bin/sqlite3", "/test/demo database/data.db");
        #[cfg(any(target_os = "linux", target_os = "macos"))]
        assert_eq!(a, "/usr/bin/sqlite3 '/test/demo database/data.db' .dump");
        #[cfg(target_os = "windows")]
        assert_eq!(a, "/usr/bin/sqlite3 \"/test/demo database/data.db\" .dump");

        let a = t("/path with spaces/sqlite3", "test.db");
        #[cfg(any(target_os = "linux", target_os = "macos"))]
        assert_eq!(a, "'/path with spaces/sqlite3' test.db .dump");
        #[cfg(target_os = "windows")]
        assert_eq!(a, "\"/path with spaces/sqlite3\" test.db .dump");

        let a = t("/path with spaces/sqlite3", "/test/demo database/data.db");
        #[cfg(any(target_os = "linux", target_os = "macos"))]
        assert_eq!(
            a,
            "'/path with spaces/sqlite3' '/test/demo database/data.db' .dump"
        );
        #[cfg(target_os = "windows")]
        assert_eq!(
            a,
            "\"/path with spaces/sqlite3\" \"/test/demo database/data.db\" .dump"
        );
    }
}
