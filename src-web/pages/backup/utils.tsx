import useSWR from 'swr'
import useSWRImmutable from 'swr/immutable'
import {
    Connection,
    BackupConfig,
    KvDatabaseType,
    SqlDatabaseType,
    BackupDatabaseType,
    ClientData,
    DatabaseBackup,
    Database,
    PgFormat,
    PgStatementOption,
    z
} from '../../tauri'
import { filenameDateTime } from '../../utils/datetime'
import { isWindows } from '../../utils/os'
import { db } from '../database/db/db'

export const CommandStorage = {
    async read(conn: Connection): Promise<string> {
        return (await ClientData.getStorage(conn.cid, 'backup:command', z.string())) ?? ''
    },

    timer: null as number | null,
    async write(conn: Connection, path: string) {
        if (this.timer !== null) {
            clearTimeout(this.timer)
        }
        this.timer = setTimeout(() => {
            this.timer = null
            ClientData.setStorage(conn.cid, 'backup:command', path, '')
        }, 2000)
    }
}

export const toBackupConfig = async (conn: Connection): Promise<BackupConfig> => {
    let command = await CommandStorage.read(conn)
    let { config } = conn
    switch (config.type) {
        case SqlDatabaseType.Sqlite: {
            return {
                type: BackupDatabaseType.SQLite,
                options: {
                    sqlite3_path: command,
                    database_path: config.options.path,
                    tables: []
                }
            }
        }
        case SqlDatabaseType.DuckDB: {
            return {
                type: BackupDatabaseType.DuckDB,
                options: {
                    duckdb_path: command,
                    database_path: config.options.path,
                    tables: []
                }
            }
        }
        case SqlDatabaseType.Postgres: {
            return {
                type: BackupDatabaseType.Postgres,
                options: {
                    pg_dump_path: command,
                    host: config.options.host ?? 'localhost',
                    port: config.options.port === null ? '5432' : config.options.port.toString(),
                    username: config.options.user ?? '',
                    password: config.options.password,
                    database: config.options.database,
                    format: PgFormat.Plain,
                    statement: PgStatementOption.Copy,
                    schemas: [],
                    exclude_schemas: [],
                    tables: [],
                    exclude_tables: [],
                    flags: [],
                    custom: '',
                    proxy: config.options.proxy
                }
            }
        }
        case SqlDatabaseType.MySql: {
            return {
                type: BackupDatabaseType.MySQL,
                options: {
                    mysqldump_path: command,
                    host: config.options.host ?? 'localhost',
                    port: config.options.port === null ? '3306' : config.options.port.toString(),
                    username: config.options.user ?? '',
                    password: config.options.password,
                    databases: config.options.database !== null ? [config.options.database] : [],
                    tables: [],
                    ignore_tables: [],
                    flags: [],
                    custom: '',
                    proxy: config.options.proxy
                }
            }
        }
        case KvDatabaseType.Redis: {
            return {
                type: BackupDatabaseType.Redis,
                options: {
                    redis_cli_path: command,
                    host: config.options.host ?? 'localhost',
                    port: config.options.port === null ? '6379' : config.options.port.toString(),
                    username: config.options.username,
                    password: config.options.password,
                    tls: {
                        enabled: config.options.tls.enabled,
                        insecure: config.options.tls.insecure
                    },
                    proxy: config.options.proxy
                }
            }
        }
        case SqlDatabaseType.SqlCipher:
        case SqlDatabaseType.CockroachDB:
        case SqlDatabaseType.QuestDB:
        case SqlDatabaseType.MariaDB:
        case SqlDatabaseType.ManticoreSearch:
        case SqlDatabaseType.MsSql:
        case SqlDatabaseType.ClickHouse:
        case SqlDatabaseType.Databend:
        case SqlDatabaseType.Databricks:
        case SqlDatabaseType.BigQuery:
        case SqlDatabaseType.Presto:
        case SqlDatabaseType.Trino:
        case SqlDatabaseType.Turso:
        case SqlDatabaseType.Rqlite:
        case SqlDatabaseType.EchoLite:
        case SqlDatabaseType.CloudflareD1:
        case SqlDatabaseType.WorkersAnalyticsEngine:
        case SqlDatabaseType.R2Sql:
        case KvDatabaseType.CloudflareWorkersKv:
        case KvDatabaseType.S3: {
            throw `The '${config.type}' database is not currently supported for backup.`
        }
    }
}

export const useCommandPreview = (config: BackupConfig) => {
    const { data, error } = useSWR(
        ['command-preview', config] as const,
        ([_, config]) => {
            return DatabaseBackup.backupCommand(config)
        },
        {
            keepPreviousData: true
        }
    )
    return data || error
}

export interface BackupOptionsEditor<T extends BackupConfig> {
    data: T
    onChange: React.Dispatch<React.SetStateAction<T>>
}

export const useOptions = <T extends BackupConfig>(
    data: BackupOptionsEditor<T>['data'],
    onChange: BackupOptionsEditor<T>['onChange']
) => {
    const setOpt = <K extends keyof T['options']>(key: K, value: T['options'][K]) => {
        onChange((data) => {
            return {
                ...data,
                options: {
                    ...data.options,
                    [key]: value
                }
            }
        })
    }

    return {
        options: data.options as T['options'],
        setOpt
    }
}

export const useTables = (conn: Connection) => {
    return useSWRImmutable('tables', async () => {
        await db.connect(conn.config)
        try {
            return await db.tables()
        } finally {
            await Database.close()
        }
    })
}

class OutputUtil {
    private suffix_ = ''

    constructor() {}

    public set suffix(value: BackupDatabaseType) {
        function suffix(value: BackupDatabaseType): string {
            switch (value) {
                case BackupDatabaseType.SQLite:
                case BackupDatabaseType.DuckDB:
                case BackupDatabaseType.Postgres:
                case BackupDatabaseType.MySQL: {
                    return 'sql'
                }
                case BackupDatabaseType.Redis: {
                    return 'rdb'
                }
            }
        }
        this.suffix_ = suffix(value)
    }

    public get default(): string {
        return isWindows
            ? `~\\Downloads\\{name}_{datetime}.${this.suffix_}`
            : `~/Downloads/{name}_{datetime}.${this.suffix_}`
    }

    public addFileName(dir: string): string {
        if (isWindows) {
            return dir + `\\{name}_{datetime}.${this.suffix_}`
        } else {
            return dir + `/{name}_{datetime}.${this.suffix_}`
        }
    }

    public replaceVars(conn: Connection, value: string): string {
        if (value === '') {
            value = this.default
        }
        if (value.includes('{name}')) {
            value = value.replaceAll('{name}', conn.name)
        }
        if (value.includes('{datetime}')) {
            value = value.replaceAll('{datetime}', filenameDateTime())
        }
        return value
    }
}

export const out = new OutputUtil()
