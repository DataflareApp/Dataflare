export interface SqliteConfig {
    type: SqlDatabaseType.Sqlite
    options: {
        path: string
        readonly: boolean
        initial: string | null
    }
}

export interface SqlCipherConfig {
    type: SqlDatabaseType.SqlCipher
    options: {
        path: string
        readonly: boolean
        key: string
        initial: string | null
    }
}

export interface PostgresConfig {
    type: SqlDatabaseType.Postgres
    options: {
        host: string | null
        port: number | null
        user: string
        password: string
        database: string
        readonly: boolean
        initial: string | null
        tls: {
            mode: PostgresTlsMode
            config: TlsConfig
        }
        proxy: ProxyConfig | null
    }
}

export interface QuestDbConfig {
    type: SqlDatabaseType.QuestDB
    options: {
        protocol: 'pgwire'
        host: string | null
        port: number | null
        user: string
        password: string
        readonly: boolean
        tls: {
            mode: PostgresTlsMode
            config: TlsConfig
        }
        proxy: ProxyConfig | null
    }
}

export interface CockroachDbConfig {
    type: SqlDatabaseType.CockroachDB
    options: PostgresConfig['options']
}

export interface MySqlConfig {
    type: SqlDatabaseType.MySql
    options: {
        host: string | null
        port: number | null
        user: string
        password: string | null
        database: string | null
        readonly: boolean
        initial: string | null
        tls: {
            mode: MySqlTlsMode
            config: TlsConfig
        }
        proxy: ProxyConfig | null
    }
}

export interface MariaDbConfig {
    type: SqlDatabaseType.MariaDB
    options: MySqlConfig['options']
}

export interface ManticoreSearchConfig {
    type: SqlDatabaseType.ManticoreSearch
    options: {
        host: string | null
        port: number | null
        readonly: boolean
        initial: string | null
        tls: {
            mode: MySqlTlsMode
            config: TlsConfig
        }
        proxy: ProxyConfig | null
    }
}

export interface MsSqlConfig {
    type: SqlDatabaseType.MsSql
    options: {
        host: string | null
        port: number | null
        auth: MsSqlAuthConfig
        database: string
        readonly: boolean
        initial: string | null
    }
}

export interface TursoConfig {
    type: SqlDatabaseType.Turso
    options: {
        database: TursoDatabaseConfig
        readonly: boolean
        initial: string | null
    }
}

export interface DuckDbConfig {
    type: SqlDatabaseType.DuckDB
    options: {
        path: string
        readonly: boolean
        initial: string | null
    }
}

export const enum ConnectProtocol {
    Http = 'http',
    Https = 'https'
}

export interface ClickHouseConfig {
    type: SqlDatabaseType.ClickHouse
    options: {
        protocol: ConnectProtocol
        host: string
        port: number | null
        user: string
        password: string
        database: string
        readonly: boolean
        proxy: ProxyConfig | null
    }
}

export interface DatabendConfig {
    type: SqlDatabaseType.Databend
    options: {
        protocol: ConnectProtocol
        host: string
        port: number | null
        user: string
        password: string
        database: string
        readonly: boolean
        proxy: ProxyConfig | null
    }
}

export interface BigQueryConfig {
    type: SqlDatabaseType.BigQuery
    options: {
        project_id: string | null
        dataset: string | null
        auth: BigQueryAuth
        readonly: boolean
    }
}

export const enum BigQueryAuthType {
    JsonKey = 'jsonkey'
}

export type BigQueryAuth = BigQueryJsonKeyAuth

export interface BigQueryJsonKeyAuth {
    type: BigQueryAuthType.JsonKey
    options: {
        content: string | null
    }
}

export interface TrinoConfig {
    type: SqlDatabaseType.Trino
    options: {
        protocol: ConnectProtocol
        host: string
        port: number | null
        user: string
        auth: TrinoAuth
        catalog: string
        schema: string
        allow_invalid_certs: boolean
        readonly: boolean
        proxy: ProxyConfig | null
    }
}

export const enum TrinoAuthType {
    None = 'none',
    Password = 'password',
    Jwt = 'jwt'
}

export type TrinoAuth = TrinoNoneAuth | TrinoPasswordAuth | TrinoJwtAuth

export interface TrinoNoneAuth {
    type: TrinoAuthType.None
}

export interface TrinoPasswordAuth {
    type: TrinoAuthType.Password
    options: {
        password: string
    }
}

export interface TrinoJwtAuth {
    type: TrinoAuthType.Jwt
    options: {
        token: string
    }
}

export interface PrestoConfig {
    type: SqlDatabaseType.Presto
    options: {
        protocol: ConnectProtocol
        host: string
        port: number | null
        user: string
        auth: PrestoAuth
        catalog: string
        schema: string
        allow_invalid_certs: boolean
        readonly: boolean
        proxy: ProxyConfig | null
    }
}

export const enum PrestoAuthType {
    None = 'none',
    Password = 'password',
    Jwt = 'jwt'
}

export type PrestoAuth = PrestoNoneAuth | PrestoPasswordAuth | PrestoJwtAuth

export interface PrestoNoneAuth {
    type: PrestoAuthType.None
}

export interface PrestoPasswordAuth {
    type: PrestoAuthType.Password
    options: {
        password: string
    }
}

export interface PrestoJwtAuth {
    type: PrestoAuthType.Jwt
    options: {
        token: string
    }
}

export interface DatabricksConfig {
    type: SqlDatabaseType.Databricks
    options: {
        protocol: ConnectProtocol
        host: string
        port: number | null
        http_path: string
        auth: DatabricksAuth
        catalog: string | null
        schema: string | null
        allow_invalid_certs: boolean
        readonly: boolean
        proxy: ProxyConfig | null
    }
}

export const enum DatabricksAuthType {
    Token = 'token'
}

export type DatabricksAuth = DatabricksTokenAuth

export interface DatabricksTokenAuth {
    type: DatabricksAuthType.Token
    options: {
        token: string
    }
}

export interface RqliteConfig {
    type: SqlDatabaseType.Rqlite
    options: {
        https: boolean
        host: string | null
        port: number | null
        user: string | null
        password: string | null
        allow_invalid_certs: boolean
        readonly: boolean
        proxy: ProxyConfig | null
    }
}

export interface EchoLiteConfig {
    type: SqlDatabaseType.EchoLite
    options: {
        host: string | null
        port: number | null
        path: string
        password: string
        readonly: boolean
        initial: string | null
        proxy: ProxyConfig | null
    }
}

export interface CloudflareD1Config {
    type: SqlDatabaseType.CloudflareD1
    options: {
        account_id: string
        database_id: string
        api_token: string
        api_origin: string | null
        readonly: boolean
    }
}

export interface WorkersAnalyticsEngineConfig {
    type: SqlDatabaseType.WorkersAnalyticsEngine
    options: {
        account_id: string
        api_token: string
        readonly: boolean
    }
}

export interface R2SqlConfig {
    type: SqlDatabaseType.R2Sql
    options: {
        account_id: string
        bucket_name: string
        api_token: string
        readonly: boolean
    }
}

export type DatabaseConfig = SqlDatabaseConfig | KvDatabaseConfig

export type SqlDatabaseConfig =
    | SqliteConfig
    | SqlCipherConfig
    | PostgresConfig
    | CockroachDbConfig
    | QuestDbConfig
    | MySqlConfig
    | MariaDbConfig
    | ManticoreSearchConfig
    | MsSqlConfig
    | ClickHouseConfig
    | DatabendConfig
    | BigQueryConfig
    | TrinoConfig
    | PrestoConfig
    | DatabricksConfig
    | TursoConfig
    | DuckDbConfig
    | RqliteConfig
    | EchoLiteConfig
    | CloudflareD1Config
    | WorkersAnalyticsEngineConfig
    | R2SqlConfig

export type KvDatabaseConfig = CloudflareKvConfig | RedisConfig | S3Config

export type DatabaseType = SqlDatabaseType | KvDatabaseType

export const enum SqlDatabaseType {
    Sqlite = 'SQLite',
    SqlCipher = 'SQLCipher',
    Postgres = 'PostgreSQL',
    CockroachDB = 'CockroachDB',
    QuestDB = 'QuestDB',
    MySql = 'MySQL',
    MariaDB = 'MariaDB',
    ManticoreSearch = 'Manticore Search',
    MsSql = 'MSSQL',
    ClickHouse = 'ClickHouse',
    Databend = 'Databend',
    BigQuery = 'BigQuery',
    Trino = 'Trino',
    Presto = 'Presto',
    Databricks = 'Databricks',
    Turso = 'Turso',
    DuckDB = 'DuckDB',
    Rqlite = 'Rqlite',
    EchoLite = 'EchoLite',
    CloudflareD1 = 'Cloudflare D1',
    WorkersAnalyticsEngine = 'Workers Analytics Engine',
    R2Sql = 'R2 SQL'
}

export const enum KvDatabaseType {
    CloudflareWorkersKv = 'Cloudflare Workers KV',
    Redis = 'Redis',
    S3 = 'S3'
}

export const ALL_DATABASE_TYPE: DatabaseType[] = [
    SqlDatabaseType.BigQuery,
    SqlDatabaseType.ClickHouse,
    SqlDatabaseType.CloudflareD1,
    KvDatabaseType.CloudflareWorkersKv,
    SqlDatabaseType.CockroachDB,
    SqlDatabaseType.Databend,
    SqlDatabaseType.Databricks,
    SqlDatabaseType.DuckDB,
    SqlDatabaseType.EchoLite,
    SqlDatabaseType.ManticoreSearch,
    SqlDatabaseType.MariaDB,
    SqlDatabaseType.MsSql,
    SqlDatabaseType.MySql,
    SqlDatabaseType.Postgres,
    SqlDatabaseType.Presto,
    SqlDatabaseType.QuestDB,
    SqlDatabaseType.R2Sql,
    KvDatabaseType.Redis,
    SqlDatabaseType.Rqlite,
    KvDatabaseType.S3,
    SqlDatabaseType.SqlCipher,
    SqlDatabaseType.Sqlite,
    SqlDatabaseType.Trino,
    SqlDatabaseType.Turso,
    SqlDatabaseType.WorkersAnalyticsEngine
]

export const enum PostgresTlsMode {
    Disabled = 'Disabled',
    Allow = 'Allow',
    Preferred = 'Preferred',
    Required = 'Required',
    VerifyCa = 'VerifyCa',
    VerifyFull = 'VerifyFull'
}

export const DEFAULT_POSTGRES_TLS_MODE = PostgresTlsMode.Preferred

export const ALL_POSTGRES_SSL_MODE = [
    PostgresTlsMode.Disabled,
    PostgresTlsMode.Allow,
    PostgresTlsMode.Preferred,
    PostgresTlsMode.Required,
    PostgresTlsMode.VerifyCa,
    PostgresTlsMode.VerifyFull
]

export const enum MySqlTlsMode {
    Disabled = 'Disabled',
    Required = 'Required',
    RequiredVerify = 'RequiredVerify'
}
export const DEFAULT_MYSQL_TLS_MODE = MySqlTlsMode.Disabled

export const ALL_MYSQL_SSL_MODE = [MySqlTlsMode.Disabled, MySqlTlsMode.Required, MySqlTlsMode.RequiredVerify]

export interface TlsConfig {
    cert: string | null
    key: string | null
    ca: string | null
}

export const enum MsSqlAuthType {
    SqlServer = 'sqlserver',
    Integrated = 'integrated'
}

export type MsSqlAuthConfig = SqlServerAuthConfig | IntegratedAuthConfig

export interface SqlServerAuthConfig {
    type: MsSqlAuthType.SqlServer
    options: {
        user: string
        password: string
    }
}

export interface IntegratedAuthConfig {
    type: MsSqlAuthType.Integrated
}

export const enum TursoDatabaseType {
    LibSQL = 'libsql',
    Turso = 'turso',
    Remote = 'remote'
}

export type TursoDatabaseConfig = TursoLibSQLDatabase | TursoTursoDatabase | TursoRemoteDatabase

export interface TursoLibSQLDatabase {
    type: TursoDatabaseType.LibSQL
    options: {
        path: string
    }
}

export interface TursoTursoDatabase {
    type: TursoDatabaseType.Turso
    options: {
        path: string
        encryption: TursoEncryptionConfig | null
    }
}

export interface TursoRemoteDatabase {
    type: TursoDatabaseType.Remote
    options: {
        url: string
        token: string
    }
}

// From: https://github.com/tursodatabase/turso/blob/1ae080bc2767ed7588d84ed9f0bfc39e42b396ad/core/storage/encryption.rs#L349-L378
export const enum TursoEncryptionCipher {
    Aes128Gcm = 'aes-128-gcm',
    Aes256Gcm = 'aes-256-gcm',
    Aegis256 = 'aegis-256',
    Aegis128L = 'aegis-128l',
    Aegis128X2 = 'aegis-128x2',
    Aegis128X4 = 'aegis-128x4',
    Aegis256X2 = 'aegis-256x2',
    Aegis256X4 = 'aegis-256x4'
}

export const ALL_TURSO_CIPHERS: TursoEncryptionCipher[] = [
    TursoEncryptionCipher.Aes128Gcm,
    TursoEncryptionCipher.Aes256Gcm,
    TursoEncryptionCipher.Aegis256,
    TursoEncryptionCipher.Aegis128L,
    TursoEncryptionCipher.Aegis128X2,
    TursoEncryptionCipher.Aegis128X4,
    TursoEncryptionCipher.Aegis256X2,
    TursoEncryptionCipher.Aegis256X4
]

export interface TursoEncryptionConfig {
    cipher: TursoEncryptionCipher
    key: string
}

export interface CloudflareKvConfig {
    type: KvDatabaseType.CloudflareWorkersKv
    options: {
        account_id: string
        api_token: string
        default_namespace: string
        readonly: boolean
    }
}

export interface RedisConfig {
    type: KvDatabaseType.Redis
    options: {
        host: string | null
        port: number | null
        username: string | null
        password: string | null
        readonly: boolean
        proxy: ProxyConfig | null
        tls: RedisTlsConfig
    }
}

export interface RedisTlsConfig {
    enabled: boolean
    insecure: boolean
    config: TlsConfig
}

export interface S3Config {
    type: KvDatabaseType.S3
    options: {
        access_key: string
        secret_key: string
        endpoint: string
        region: string
        default_bucket: string
        list_all_buckets: boolean
        readonly: boolean
    }
}

export type ProxyConfig = SshProxyConfig

export const enum ProxyConfigType {
    SSH = 'ssh'
}

export interface SshProxyConfig {
    type: ProxyConfigType.SSH
    options: {
        host: string
        port: number | null
        user: string
        auth: SshAuth
    }
}

export const enum SshAuthType {
    Password = 'password',
    Key = 'key',
    Agent = 'agent'
}

export type SshAuth = SshPasswordAuth | SshKeyAuth | SshAgentAuth

export interface SshPasswordAuth {
    type: SshAuthType.Password
    options: {
        password: string
    }
}

export interface SshKeyAuth {
    type: SshAuthType.Key
    options: {
        key: string
        password: string | null
    }
}

export interface SshAgentAuth {
    type: SshAuthType.Agent
    options: {
        agent_endpoint: string | null
    }
}
