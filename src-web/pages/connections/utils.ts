import { t } from '../../i18n/index'
import {
    Connection,
    encodeURL,
    decodeURL,
    UrlOption,
    DEFAULT_MYSQL_TLS_MODE,
    DEFAULT_POSTGRES_TLS_MODE,
    DatabaseConfig,
    DatabaseType,
    TursoDatabaseType,
    MsSqlAuthType,
    CloudflareD1Config,
    CockroachDbConfig,
    TursoConfig,
    ManticoreSearchConfig,
    MariaDbConfig,
    MsSqlConfig,
    MySqlConfig,
    PostgresConfig,
    RqliteConfig,
    SqlCipherConfig,
    SqliteConfig,
    DuckDbConfig,
    ConnectProtocol,
    ClickHouseConfig,
    DatabendConfig,
    TrinoConfig,
    TrinoAuthType,
    PrestoConfig,
    QuestDbConfig,
    SqlDatabaseType,
    KvDatabaseType,
    CloudflareKvConfig,
    EchoLiteConfig,
    RedisConfig,
    S3Config,
    BigQueryAuthType,
    BigQueryConfig,
    DatabricksConfig,
    DatabricksAuthType,
    PrestoAuthType,
    WorkersAnalyticsEngineConfig,
    R2SqlConfig,
    TursoEncryptionCipher,
    TursoEncryptionConfig
} from '../../tauri'

function defaultConfig(type: DatabaseType): DatabaseConfig {
    switch (type) {
        case SqlDatabaseType.Sqlite: {
            return {
                type,
                options: {
                    path: '',
                    readonly: false,
                    initial: null
                }
            }
        }
        case SqlDatabaseType.SqlCipher: {
            return {
                type,
                options: {
                    path: '',
                    readonly: false,
                    key: '',
                    initial: null
                }
            }
        }
        case SqlDatabaseType.DuckDB: {
            return {
                type,
                options: {
                    path: '',
                    readonly: false,
                    initial: null
                }
            }
        }
        case SqlDatabaseType.Postgres:
        case SqlDatabaseType.CockroachDB: {
            return {
                type,
                options: {
                    host: null,
                    port: null,
                    user: '',
                    password: '',
                    database: '',
                    readonly: false,
                    initial: null,
                    tls: {
                        mode: DEFAULT_POSTGRES_TLS_MODE,
                        config: {
                            cert: null,
                            key: null,
                            ca: null
                        }
                    },
                    proxy: null
                }
            }
        }
        case SqlDatabaseType.QuestDB: {
            return {
                type,
                options: {
                    protocol: 'pgwire',
                    host: null,
                    port: null,
                    user: '',
                    password: '',
                    readonly: false,
                    tls: {
                        mode: DEFAULT_POSTGRES_TLS_MODE,
                        config: {
                            cert: null,
                            key: null,
                            ca: null
                        }
                    },
                    proxy: null
                }
            }
        }
        case SqlDatabaseType.MySql:
        case SqlDatabaseType.MariaDB: {
            return {
                type,
                options: {
                    host: null,
                    port: null,
                    user: '',
                    password: null,
                    database: null,
                    readonly: false,
                    initial: null,
                    tls: {
                        mode: DEFAULT_MYSQL_TLS_MODE,
                        config: {
                            cert: null,
                            key: null,
                            ca: null
                        }
                    },
                    proxy: null
                }
            }
        }
        case SqlDatabaseType.ManticoreSearch: {
            return {
                type,
                options: {
                    host: null,
                    port: null,
                    readonly: false,
                    initial: null,
                    tls: {
                        mode: DEFAULT_MYSQL_TLS_MODE,
                        config: {
                            cert: null,
                            key: null,
                            ca: null
                        }
                    },
                    proxy: null
                }
            }
        }
        case SqlDatabaseType.MsSql: {
            return {
                type,
                options: {
                    host: null,
                    port: null,
                    auth: {
                        type: MsSqlAuthType.SqlServer,
                        options: {
                            user: '',
                            password: ''
                        }
                    },
                    database: '',
                    readonly: false,
                    initial: null
                }
            }
        }
        case SqlDatabaseType.ClickHouse: {
            return {
                type,
                options: {
                    protocol: ConnectProtocol.Http,
                    host: '',
                    port: null,
                    user: '',
                    password: '',
                    database: '',
                    readonly: false,
                    proxy: null
                }
            }
        }
        case SqlDatabaseType.Databend: {
            return {
                type,
                options: {
                    protocol: ConnectProtocol.Http,
                    host: '',
                    port: null,
                    user: '',
                    password: '',
                    database: '',
                    readonly: false,
                    proxy: null
                }
            }
        }
        case SqlDatabaseType.Trino: {
            return {
                type,
                options: {
                    protocol: ConnectProtocol.Http,
                    host: '',
                    port: null,
                    user: '',
                    auth: { type: TrinoAuthType.None },
                    catalog: '',
                    schema: '',
                    allow_invalid_certs: false,
                    readonly: false,
                    proxy: null
                }
            }
        }
        case SqlDatabaseType.Presto: {
            return {
                type,
                options: {
                    protocol: ConnectProtocol.Http,
                    host: '',
                    port: null,
                    user: '',
                    auth: { type: PrestoAuthType.None },
                    catalog: '',
                    schema: '',
                    allow_invalid_certs: false,
                    readonly: false,
                    proxy: null
                }
            }
        }
        case SqlDatabaseType.Databricks: {
            return {
                type,
                options: {
                    protocol: ConnectProtocol.Https,
                    host: '',
                    port: null,
                    http_path: '',
                    auth: { type: DatabricksAuthType.Token, options: { token: '' } },
                    catalog: null,
                    schema: null,
                    allow_invalid_certs: false,
                    readonly: false,
                    proxy: null
                }
            }
        }
        case SqlDatabaseType.BigQuery: {
            return {
                type,
                options: {
                    project_id: null,
                    dataset: null,
                    auth: {
                        type: BigQueryAuthType.JsonKey,
                        options: {
                            content: null
                        }
                    },
                    readonly: false
                }
            }
        }
        case SqlDatabaseType.Turso: {
            return {
                type,
                options: {
                    database: {
                        type: TursoDatabaseType.Remote,
                        options: {
                            url: '',
                            token: ''
                        }
                    },
                    readonly: false,
                    initial: null
                }
            }
        }
        case SqlDatabaseType.Rqlite: {
            return {
                type,
                options: {
                    https: false,
                    host: null,
                    port: null,
                    user: null,
                    password: null,
                    allow_invalid_certs: false,
                    readonly: false,
                    proxy: null
                }
            }
        }
        case SqlDatabaseType.EchoLite: {
            return {
                type,
                options: {
                    host: null,
                    port: null,
                    path: '',
                    password: '',
                    readonly: false,
                    initial: null,
                    proxy: null
                }
            }
        }
        case SqlDatabaseType.CloudflareD1: {
            return {
                type,
                options: {
                    account_id: '',
                    database_id: '',
                    api_token: '',
                    api_origin: null,
                    readonly: false
                }
            }
        }
        case SqlDatabaseType.WorkersAnalyticsEngine: {
            return {
                type,
                options: {
                    account_id: '',
                    api_token: '',
                    readonly: false
                }
            }
        }
        case SqlDatabaseType.R2Sql: {
            return {
                type,
                options: {
                    account_id: '',
                    bucket_name: '',
                    api_token: '',
                    readonly: false
                }
            }
        }
        case KvDatabaseType.CloudflareWorkersKv: {
            return {
                type,
                options: {
                    account_id: '',
                    api_token: '',
                    default_namespace: '',
                    readonly: false
                }
            }
        }
        case KvDatabaseType.Redis: {
            return {
                type,
                options: {
                    host: null,
                    port: null,
                    username: null,
                    password: null,
                    readonly: false,
                    tls: {
                        enabled: false,
                        insecure: false,
                        config: {
                            cert: null,
                            key: null,
                            ca: null
                        }
                    },
                    proxy: null
                }
            }
        }
        case KvDatabaseType.S3: {
            return {
                type,
                options: {
                    access_key: '',
                    secret_key: '',
                    endpoint: '',
                    region: '',
                    default_bucket: '',
                    list_all_buckets: false,
                    readonly: false
                }
            }
        }
    }
}

export const createConnectionConfig = (type: DatabaseType): Connection => {
    return {
        cid: '',
        name: `New ${type}`,
        config: defaultConfig(type)
    }
}

// TODO: Add initial SQL and TLS configuration
export const toConnectionURL = async (conn: Connection) => {
    const HOST = 'localhost'
    const { name, config } = conn
    const opt: UrlOption = {
        scheme: '',
        host: null,
        username: '',
        password: null,
        port: null,
        path: '',
        query: {}
    }
    opt.query['name'] = name
    if (config.options.readonly) {
        opt.query['mode'] = 'r'
    }
    switch (config.type) {
        case SqlDatabaseType.Sqlite: {
            opt.scheme = 'sqlite'
            opt.path = config.options.path
            break
        }
        case SqlDatabaseType.SqlCipher: {
            opt.scheme = 'sqlcipher'
            opt.path = config.options.path
            opt.query['key'] = config.options.key
            break
        }
        // TODO: Missing certificate configuration
        case SqlDatabaseType.Rqlite: {
            opt.scheme = 'rqlite'
            opt.host = config.options.host ?? HOST
            opt.port = config.options.port
            if (config.options.user !== null) {
                opt.username = config.options.user
            }
            if (config.options.password !== null) {
                opt.password = config.options.password
            }
            opt.query['protocol'] = config.options.https ? 'https' : 'http'
            break
        }
        case SqlDatabaseType.EchoLite: {
            opt.scheme = 'echolite'
            opt.host = config.options.host ?? HOST
            opt.port = config.options.port
            opt.path = config.options.path
            opt.password = config.options.password
            break
        }
        case SqlDatabaseType.CloudflareD1: {
            opt.scheme = 'd1'
            opt.path = config.options.database_id
            opt.query['account'] = config.options.account_id
            opt.query['token'] = config.options.api_token
            if (config.options.api_origin !== null) {
                opt.query['origin'] = config.options.api_origin
            }
            break
        }
        case SqlDatabaseType.DuckDB: {
            opt.scheme = 'duckdb'
            opt.path = config.options.path
            break
        }
        case SqlDatabaseType.Turso: {
            opt.scheme = 'turso'
            switch (config.options.database.type) {
                case TursoDatabaseType.LibSQL: {
                    opt.path = config.options.database.options.path
                    opt.query['type'] = TursoDatabaseType.LibSQL
                    break
                }
                case TursoDatabaseType.Turso: {
                    opt.path = config.options.database.options.path
                    opt.query['type'] = TursoDatabaseType.Turso
                    if (config.options.database.options.encryption !== null) {
                        opt.query['cipher'] = config.options.database.options.encryption.cipher
                        opt.query['key'] = config.options.database.options.encryption.key
                    }
                    break
                }
                case TursoDatabaseType.Remote: {
                    opt.query['url'] = config.options.database.options.url
                    opt.query['token'] = config.options.database.options.token
                    opt.query['type'] = TursoDatabaseType.Remote
                    break
                }
            }
            break
        }
        // TODO: Missing SSL configuration
        case SqlDatabaseType.Postgres: {
            opt.scheme = 'postgresql'
            opt.host = config.options.host ?? HOST
            opt.port = config.options.port
            opt.username = config.options.user
            opt.password = config.options.password
            opt.path = config.options.database
            break
        }
        // TODO: Missing SSL configuration
        case SqlDatabaseType.CockroachDB: {
            opt.scheme = 'cockroach'
            opt.host = config.options.host ?? HOST
            opt.port = config.options.port
            opt.username = config.options.user
            opt.password = config.options.password
            opt.path = config.options.database
            break
        }
        // TODO: Missing SSL configuration
        case SqlDatabaseType.QuestDB: {
            opt.scheme = 'questdb'
            opt.host = config.options.host ?? HOST
            opt.port = config.options.port
            opt.username = config.options.user
            opt.password = config.options.password
            break
        }
        // TODO: Missing SSL configuration
        case SqlDatabaseType.MySql:
        case SqlDatabaseType.MariaDB: {
            opt.scheme = config.type.toLowerCase()
            opt.host = config.options.host ?? HOST
            opt.port = config.options.port
            opt.username = config.options.user
            opt.password = config.options.password
            if (config.options.database !== null) {
                opt.path = config.options.database
            }
            break
        }
        case SqlDatabaseType.ManticoreSearch: {
            opt.scheme = 'manticoresearch'
            opt.host = config.options.host ?? HOST
            opt.port = config.options.port
            break
        }
        case SqlDatabaseType.MsSql: {
            opt.scheme = 'sqlserver'
            opt.host = config.options.host ?? HOST
            opt.port = config.options.port
            opt.path = config.options.database
            opt.query['auth'] = config.options.auth.type
            switch (config.options.auth.type) {
                case MsSqlAuthType.SqlServer: {
                    opt.username = config.options.auth.options.user
                    opt.password = config.options.auth.options.password
                    break
                }
                case MsSqlAuthType.Integrated: {
                    break
                }
            }
            break
        }
        // TODO: Currently TCP protocol is not supported, so adding a protocol parameter to decide between HTTP and HTTPS
        case SqlDatabaseType.ClickHouse: {
            opt.scheme = 'clickhouse'
            opt.host = config.options.host === '' ? HOST : config.options.host
            opt.port = config.options.port
            opt.username = config.options.user
            opt.password = config.options.password
            opt.path = config.options.database
            opt.query['protocol'] = config.options.protocol
            break
        }
        case SqlDatabaseType.Databend: {
            opt.scheme = 'databend'
            opt.host = config.options.host === '' ? HOST : config.options.host
            opt.port = config.options.port
            opt.username = config.options.user
            opt.password = config.options.password
            opt.path = config.options.database
            opt.query['protocol'] = config.options.protocol
            break
        }
        case SqlDatabaseType.Trino: {
            opt.scheme = 'trino'
            opt.host = config.options.host === '' ? HOST : config.options.host
            opt.port = config.options.port
            opt.username = config.options.user
            opt.query['auth'] = config.options.auth.type
            switch (config.options.auth.type) {
                case TrinoAuthType.Password:
                    opt.password = config.options.auth.options.password
                    break
                case TrinoAuthType.Jwt:
                    opt.query['token'] = config.options.auth.options.token
                    break
                case TrinoAuthType.None:
                    break
            }
            opt.query['protocol'] = config.options.protocol
            opt.query['catalog'] = config.options.catalog
            opt.query['schema'] = config.options.schema
            break
        }
        case SqlDatabaseType.Presto: {
            opt.scheme = 'presto'
            opt.host = config.options.host === '' ? HOST : config.options.host
            opt.port = config.options.port
            opt.username = config.options.user
            opt.query['auth'] = config.options.auth.type
            switch (config.options.auth.type) {
                case PrestoAuthType.Password:
                    opt.password = config.options.auth.options.password
                    break
                case PrestoAuthType.Jwt:
                    opt.query['token'] = config.options.auth.options.token
                    break
                case PrestoAuthType.None:
                    break
            }
            opt.query['protocol'] = config.options.protocol
            opt.query['catalog'] = config.options.catalog
            opt.query['schema'] = config.options.schema
            break
        }
        case SqlDatabaseType.Databricks: {
            opt.scheme = 'databricks'
            opt.host = config.options.host === '' ? HOST : config.options.host
            opt.port = config.options.port
            opt.path = config.options.http_path
            opt.query['protocol'] = config.options.protocol
            opt.query['token'] = config.options.auth.options.token
            if (config.options.catalog !== null) {
                opt.query['catalog'] = config.options.catalog
            }
            if (config.options.schema !== null) {
                opt.query['schema'] = config.options.schema
            }
            break
        }
        // TODO: Missing authorization parameters
        case SqlDatabaseType.BigQuery: {
            opt.scheme = 'bigquery'
            if (config.options.project_id !== null) {
                opt.query['project_id'] = config.options.project_id
            }
            if (config.options.dataset !== null) {
                opt.query['dataset'] = config.options.dataset
            }
            break
        }
        case SqlDatabaseType.WorkersAnalyticsEngine: {
            opt.scheme = 'workers-analytics-engine'
            opt.query['account'] = config.options.account_id
            opt.query['token'] = config.options.api_token
            break
        }
        case SqlDatabaseType.R2Sql: {
            opt.scheme = 'r2sql'
            opt.path = config.options.bucket_name
            opt.query['account'] = config.options.account_id
            opt.query['token'] = config.options.api_token
            break
        }
        case KvDatabaseType.CloudflareWorkersKv: {
            opt.scheme = 'workers-kv'
            opt.path = config.options.default_namespace
            opt.query['account'] = config.options.account_id
            opt.query['token'] = config.options.api_token
            break
        }
        case KvDatabaseType.Redis: {
            opt.scheme = 'redis'
            opt.host = config.options.host ?? HOST
            opt.port = config.options.port
            if (config.options.username !== null) {
                opt.username = config.options.username
            }
            if (config.options.password !== null) {
                opt.password = config.options.password
            }
            break
        }
        case KvDatabaseType.S3: {
            opt.scheme = 's3'
            opt.path = config.options.default_bucket
            opt.query['access_key'] = config.options.access_key
            opt.query['secret_key'] = config.options.secret_key
            opt.query['endpoint'] = config.options.endpoint
            opt.query['region'] = config.options.region
            if (config.options.list_all_buckets) {
                opt.query['list_all_buckets'] = 'enabled'
            }
            break
        }
    }
    return await encodeURL(opt)
}

export const parseConnectionURL = async (url: string) => {
    const opt = await decodeURL(url)
    const applyQuery = (conn: Connection) => {
        const { name, mode } = opt.query
        if (name !== undefined) {
            conn.name = name
        }
        // Default is rw
        if (mode === 'r') {
            conn.config.options.readonly = true
        }
    }
    switch (opt.scheme) {
        case 'sqlite': {
            let conn = createConnectionConfig(SqlDatabaseType.Sqlite) as Connection<SqliteConfig>
            applyQuery(conn)
            conn.config.options.path = opt.path
            return conn
        }
        case 'sqlcipher': {
            let conn = createConnectionConfig(SqlDatabaseType.SqlCipher) as Connection<SqlCipherConfig>
            applyQuery(conn)
            conn.config.options.path = opt.path
            conn.config.options.key = opt.query['key'] ?? ''
            return conn
        }
        case 'duckdb': {
            let conn = createConnectionConfig(SqlDatabaseType.DuckDB) as Connection<DuckDbConfig>
            applyQuery(conn)
            conn.config.options.path = opt.path
            return conn
        }
        case 'rqlite': {
            let conn = createConnectionConfig(SqlDatabaseType.Rqlite) as Connection<RqliteConfig>
            applyQuery(conn)
            conn.config.options.host = opt.host
            conn.config.options.port = opt.port
            conn.config.options.user = opt.username === '' ? null : opt.username
            conn.config.options.password = opt.password
            conn.config.options.https = opt.query['protocol'] === 'https'
            return conn
        }
        case 'echolite': {
            let conn = createConnectionConfig(SqlDatabaseType.EchoLite) as Connection<EchoLiteConfig>
            applyQuery(conn)
            conn.config.options.host = opt.host
            conn.config.options.port = opt.port
            conn.config.options.path = opt.path
            conn.config.options.password = opt.password ?? ''
            return conn
        }
        case 'd1': {
            let conn = createConnectionConfig(SqlDatabaseType.CloudflareD1) as Connection<CloudflareD1Config>
            applyQuery(conn)
            conn.config.options.database_id = opt.path.slice(1)
            conn.config.options.account_id = opt.query['account'] ?? ''
            conn.config.options.api_token = opt.query['token'] ?? ''
            conn.config.options.api_origin = opt.query['origin'] ?? null
            return conn
        }
        case 'workers-analytics-engine': {
            let conn = createConnectionConfig(
                SqlDatabaseType.WorkersAnalyticsEngine
            ) as Connection<WorkersAnalyticsEngineConfig>
            applyQuery(conn)
            conn.config.options.account_id = opt.query['account'] ?? ''
            conn.config.options.api_token = opt.query['token'] ?? ''
            return conn
        }
        case 'r2sql': {
            let conn = createConnectionConfig(SqlDatabaseType.R2Sql) as Connection<R2SqlConfig>
            applyQuery(conn)
            conn.config.options.account_id = opt.query['account'] ?? ''
            conn.config.options.bucket_name = opt.path.slice(1)
            conn.config.options.api_token = opt.query['token'] ?? ''
            return conn
        }
        case 'libsql':
        case 'turso': {
            let conn = createConnectionConfig(SqlDatabaseType.Turso) as Connection<TursoConfig>
            applyQuery(conn)
            switch (opt.query['type'] as TursoDatabaseType) {
                // Local libsql was initially referred to as 'local' or 'file' here. With the subsequent support for Turso, libsql and Turso have become two distinct database types. We continue to provide compatibility handling for local libsql here.
                case 'local' as any:
                case TursoDatabaseType.LibSQL: {
                    conn.config.options.database = {
                        type: TursoDatabaseType.LibSQL,
                        options: { path: opt.path }
                    }
                    break
                }
                case TursoDatabaseType.Turso: {
                    const cipher = opt.query['cipher'] ?? ''
                    const key = opt.query['key'] ?? ''
                    let encryption: TursoEncryptionConfig | null = null
                    if (cipher !== '' || key !== '') {
                        encryption = { cipher: cipher as TursoEncryptionCipher, key }
                    }
                    conn.config.options.database = {
                        type: TursoDatabaseType.Turso,
                        options: { path: opt.path, encryption }
                    }
                    break
                }
                case TursoDatabaseType.Remote: {
                    conn.config.options.database = {
                        type: TursoDatabaseType.Remote,
                        options: {
                            url: opt.query['url'] ?? '',
                            token: opt.query['token'] ?? ''
                        }
                    }
                    break
                }
            }
            return conn
        }
        case 'postgres':
        case 'postgresql': {
            let conn = createConnectionConfig(SqlDatabaseType.Postgres) as Connection<PostgresConfig>
            applyQuery(conn)
            conn.config.options.host = opt.host
            conn.config.options.port = opt.port
            conn.config.options.user = opt.username
            conn.config.options.password = opt.password ?? ''
            conn.config.options.database = opt.path.slice(1)
            return conn
        }
        case 'cockroach':
        case 'cockroachdb': {
            let conn = createConnectionConfig(SqlDatabaseType.CockroachDB) as Connection<CockroachDbConfig>
            applyQuery(conn)
            conn.config.options.host = opt.host
            conn.config.options.port = opt.port
            conn.config.options.user = opt.username
            conn.config.options.password = opt.password ?? ''
            conn.config.options.database = opt.path.slice(1)
            return conn
        }
        case 'questdb': {
            let conn = createConnectionConfig(SqlDatabaseType.QuestDB) as Connection<QuestDbConfig>
            applyQuery(conn)
            conn.config.options.host = opt.host
            conn.config.options.port = opt.port
            conn.config.options.user = opt.username
            conn.config.options.password = opt.password ?? ''
            return conn
        }
        case 'mysql': {
            let conn = createConnectionConfig(SqlDatabaseType.MySql) as Connection<MySqlConfig>
            applyQuery(conn)
            conn.config.options.host = opt.host
            conn.config.options.port = opt.port
            conn.config.options.user = opt.username
            conn.config.options.password = opt.password
            conn.config.options.database = opt.path.slice(1) === '' ? null : opt.path.slice(1)
            return conn
        }
        case 'mariadb': {
            let conn = createConnectionConfig(SqlDatabaseType.MariaDB) as Connection<MariaDbConfig>
            applyQuery(conn)
            conn.config.options.host = opt.host
            conn.config.options.port = opt.port
            conn.config.options.user = opt.username
            conn.config.options.password = opt.password
            conn.config.options.database = opt.path.slice(1) === '' ? null : opt.path.slice(1)
            return conn
        }
        case 'manticore':
        case 'manticoresearch': {
            let conn = createConnectionConfig(
                SqlDatabaseType.ManticoreSearch
            ) as Connection<ManticoreSearchConfig>
            applyQuery(conn)
            conn.config.options.host = opt.host
            conn.config.options.port = opt.port
            return conn
        }
        case 'mssql':
        case 'sqlserver':
        case 'microsoftsqlserver': {
            let conn = createConnectionConfig(SqlDatabaseType.MsSql) as Connection<MsSqlConfig>
            applyQuery(conn)
            conn.config.options.host = opt.host
            conn.config.options.port = opt.port
            conn.config.options.database = opt.path.slice(1)
            switch (opt.query['auth'] as MsSqlAuthType) {
                case MsSqlAuthType.SqlServer: {
                    conn.config.options.auth = {
                        type: MsSqlAuthType.SqlServer,
                        options: {
                            user: opt.username,
                            password: opt.password ?? ''
                        }
                    }
                    break
                }
                case MsSqlAuthType.Integrated: {
                    conn.config.options.auth = {
                        type: MsSqlAuthType.Integrated
                    }
                    break
                }
            }
            return conn
        }
        case 'clickhouse': {
            let conn = createConnectionConfig(SqlDatabaseType.ClickHouse) as Connection<ClickHouseConfig>
            applyQuery(conn)
            conn.config.options.host = opt.host ?? ''
            conn.config.options.port = opt.port
            conn.config.options.user = opt.username
            conn.config.options.password = opt.password ?? ''
            conn.config.options.database = opt.path.slice(1)
            switch (opt.query['protocol']) {
                case 'http': {
                    conn.config.options.protocol = ConnectProtocol.Http
                    break
                }
                case 'https': {
                    conn.config.options.protocol = ConnectProtocol.Https
                    break
                }
            }
            return conn
        }
        case 'databend': {
            let conn = createConnectionConfig(SqlDatabaseType.Databend) as Connection<DatabendConfig>
            applyQuery(conn)
            conn.config.options.host = opt.host ?? ''
            conn.config.options.port = opt.port
            conn.config.options.user = opt.username
            conn.config.options.password = opt.password ?? ''
            conn.config.options.database = opt.path.slice(1)
            switch (opt.query['protocol']) {
                case 'http': {
                    conn.config.options.protocol = ConnectProtocol.Http
                    break
                }
                case 'https': {
                    conn.config.options.protocol = ConnectProtocol.Https
                    break
                }
            }
            return conn
        }
        case 'trino': {
            let conn = createConnectionConfig(SqlDatabaseType.Trino) as Connection<TrinoConfig>
            applyQuery(conn)
            conn.config.options.host = opt.host ?? ''
            conn.config.options.port = opt.port
            conn.config.options.user = opt.username
            switch (opt.query['auth'] as TrinoAuthType) {
                case TrinoAuthType.Password:
                    conn.config.options.auth = {
                        type: TrinoAuthType.Password,
                        options: { password: opt.password ?? '' }
                    }
                    break
                case TrinoAuthType.Jwt:
                    conn.config.options.auth = {
                        type: TrinoAuthType.Jwt,
                        options: { token: opt.query['token'] ?? '' }
                    }
                    break
                default:
                    conn.config.options.auth = opt.password
                        ? { type: TrinoAuthType.Password, options: { password: opt.password } }
                        : { type: TrinoAuthType.None }
                    break
            }
            conn.config.options.catalog = opt.query['catalog'] ?? ''
            conn.config.options.schema = opt.query['schema'] ?? ''
            switch (opt.query['protocol']) {
                case 'http': {
                    conn.config.options.protocol = ConnectProtocol.Http
                    break
                }
                case 'https': {
                    conn.config.options.protocol = ConnectProtocol.Https
                    break
                }
            }
            return conn
        }
        case 'presto': {
            let conn = createConnectionConfig(SqlDatabaseType.Presto) as Connection<PrestoConfig>
            applyQuery(conn)
            conn.config.options.host = opt.host ?? ''
            conn.config.options.port = opt.port
            conn.config.options.user = opt.username
            switch (opt.query['auth'] as PrestoAuthType) {
                case PrestoAuthType.Password:
                    conn.config.options.auth = {
                        type: PrestoAuthType.Password,
                        options: { password: opt.password ?? '' }
                    }
                    break
                case PrestoAuthType.Jwt:
                    conn.config.options.auth = {
                        type: PrestoAuthType.Jwt,
                        options: { token: opt.query['token'] ?? '' }
                    }
                    break
                default:
                    conn.config.options.auth = opt.password
                        ? { type: PrestoAuthType.Password, options: { password: opt.password } }
                        : { type: PrestoAuthType.None }
                    break
            }
            conn.config.options.catalog = opt.query['catalog'] ?? ''
            conn.config.options.schema = opt.query['schema'] ?? ''
            switch (opt.query['protocol']) {
                case 'http': {
                    conn.config.options.protocol = ConnectProtocol.Http
                    break
                }
                case 'https': {
                    conn.config.options.protocol = ConnectProtocol.Https
                    break
                }
            }
            return conn
        }
        case 'databricks': {
            let conn = createConnectionConfig(SqlDatabaseType.Databricks) as Connection<DatabricksConfig>
            applyQuery(conn)
            conn.config.options.host = opt.host ?? ''
            conn.config.options.port = opt.port
            conn.config.options.http_path = opt.path
            conn.config.options.auth = {
                type: DatabricksAuthType.Token,
                options: { token: opt.query['token'] ?? '' }
            }
            conn.config.options.catalog = opt.query['catalog'] ?? null
            conn.config.options.schema = opt.query['schema'] ?? null
            switch (opt.query['protocol']) {
                case 'http': {
                    conn.config.options.protocol = ConnectProtocol.Http
                    break
                }
                case 'https': {
                    conn.config.options.protocol = ConnectProtocol.Https
                    break
                }
            }
            return conn
        }
        case 'bigquery': {
            let conn = createConnectionConfig(SqlDatabaseType.BigQuery) as Connection<BigQueryConfig>
            applyQuery(conn)
            conn.config.options.project_id = opt.query['project_id'] ?? null
            conn.config.options.dataset = opt.query['dataset'] ?? null
            return conn
        }
        case 'workers-kv': {
            let conn = createConnectionConfig(
                KvDatabaseType.CloudflareWorkersKv
            ) as Connection<CloudflareKvConfig>
            applyQuery(conn)
            conn.config.options.account_id = opt.query['account'] ?? ''
            conn.config.options.api_token = opt.query['token'] ?? ''
            conn.config.options.default_namespace = opt.path.slice(1)
            return conn
        }
        case 'redis':
        case 'rediss': {
            let conn = createConnectionConfig(KvDatabaseType.Redis) as Connection<RedisConfig>
            applyQuery(conn)
            conn.config.options.host = opt.host
            conn.config.options.port = opt.port
            conn.config.options.username = opt.username === '' ? null : opt.username
            conn.config.options.password = opt.password
            return conn
        }
        case 's3': {
            let conn = createConnectionConfig(KvDatabaseType.S3) as Connection<S3Config>
            applyQuery(conn)
            conn.config.options.access_key = opt.query['access_key'] ?? ''
            conn.config.options.secret_key = opt.query['secret_key'] ?? ''
            conn.config.options.endpoint = opt.query['endpoint'] ?? ''
            conn.config.options.region = opt.query['region'] ?? ''
            conn.config.options.list_all_buckets = opt.query['list_all_buckets'] === 'enabled'
            conn.config.options.default_bucket = opt.path.slice(1)
            return conn
        }
        default: {
            throw t('unsupportedProtocol')
        }
    }
}
