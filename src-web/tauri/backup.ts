import { invoke } from '@tauri-apps/api/core'
import { ProxyConfig } from './database'
import { TauriGlobalEvent } from './event'

export class DatabaseBackup {
    static backupCommand(config: BackupConfig): Promise<string> {
        return invoke('backup_command_preview', { config })
    }

    static async startBackup(config: BackupConfig, path: string, callback: (message: BackupMessage) => void) {
        const taskID = await invoke<number>('start_backup', { config, path })
        const unlisten = await TauriGlobalEvent.listen<BackupMessage>(`backup-task-${taskID}`, (event) => {
            callback(event.payload)
        })
        return {
            taskID,
            unlisten
        } as const
    }

    static cancelBackup(id: number): Promise<void> {
        return invoke('cancel_backup', { id })
    }
}

export const enum BackupMessageType {
    Stdout = 'stdout',
    StdoutCompleted = 'stdoutcompleted',
    Stderr = 'stderr',
    Exit = 'exit',
    ExitWithKill = 'exitwithkill',
    IoError = 'ioerror'
}

export type BackupMessage =
    | BackupMessageStdout
    | BackupMessageStdoutCompleted
    | BackupMessageStderr
    | BackupMessageExit
    | BackupMessageExitWithKill
    | BackupMessageIoError

export interface BackupMessageStdout {
    type: BackupMessageType.Stdout
    value: number
}

export interface BackupMessageStdoutCompleted {
    type: BackupMessageType.StdoutCompleted
}

export interface BackupMessageStderr {
    type: BackupMessageType.Stderr
    value: string
}

export interface BackupMessageExit {
    type: BackupMessageType.Exit
    value: number
}

export interface BackupMessageExitWithKill {
    type: BackupMessageType.ExitWithKill
}

export interface BackupMessageIoError {
    type: BackupMessageType.IoError
    value: string
}

export const enum BackupDatabaseType {
    SQLite = 'SQLite',
    DuckDB = 'DuckDB',
    Postgres = 'PostgreSQL',
    MySQL = 'MySQL',
    Redis = 'Redis'
}

export type BackupConfig =
    | SqliteBackupConfig
    | DuckDbBackupConfig
    | PostgresBackupConfig
    | MySqlBackupConfig
    | RedisBackupConfig

export interface SqliteBackupConfig {
    type: BackupDatabaseType.SQLite
    options: {
        sqlite3_path: string
        database_path: string
        tables: string[]
    }
}

export interface DuckDbBackupConfig {
    type: BackupDatabaseType.DuckDB
    options: {
        duckdb_path: string
        database_path: string
        tables: string[]
    }
}

export interface PostgresBackupConfig {
    type: BackupDatabaseType.Postgres
    options: {
        pg_dump_path: string
        host: string
        port: string
        username: string
        password: string
        database: string

        format: PgFormat
        statement: PgStatementOption
        schemas: string[]
        exclude_schemas: string[]
        tables: string[]
        exclude_tables: string[]

        flags: string[]
        custom: string

        proxy: ProxyConfig | null
    }
}

export const enum PgFormat {
    Plain = 'Plain',
    Custom = 'Custom',
    Tar = 'Tar'
}

export const enum PgStatementOption {
    Copy = 'Copy',
    Insert = 'Insert',
    ColumnInsert = 'Column Insert'
}

export interface MySqlBackupConfig {
    type: BackupDatabaseType.MySQL
    options: {
        mysqldump_path: string
        host: string
        port: string
        username: string
        password: string | null

        databases: string[]
        tables: string[]
        ignore_tables: string[]
        flags: string[]
        custom: string

        proxy: ProxyConfig | null
    }
}

export interface RedisBackupConfig {
    type: BackupDatabaseType.Redis
    options: {
        redis_cli_path: string
        host: string
        port: string
        username: string | null
        password: string | null
        tls: RedisBackupTlsConfig | null
        proxy: ProxyConfig | null
    }
}

export interface RedisBackupTlsConfig {
    enabled: boolean
    insecure: boolean
}
