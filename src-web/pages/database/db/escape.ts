import { InsertColumn, SqlDatabaseType, Value } from '../../../tauri'
import { Entry } from '../hooks/use-store'
import { DEFAULT, EditValue } from './db'

export class Escape {
    type: SqlDatabaseType

    constructor(type: SqlDatabaseType) {
        this.type = type
    }

    public id(val: string): string {
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino: {
                const value = val.replaceAll('"', '""')
                return '"' + value + '"'
            }
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.ManticoreSearch:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.Databricks: {
                const value = val.replaceAll('`', '``')
                return '`' + value + '`'
            }
            // TODO:
            // 1. Escape square brackets
            // 2. SP_RENAME '[schema].[table].[col']', [new-col], 'COLUMN'; needs to escape the single quote after col
            case SqlDatabaseType.MsSql: {
                return '[' + val + ']'
            }
            // TODO: R2 SQL does not currently support escaping.
            case SqlDatabaseType.R2Sql: {
                return val
            }
        }
    }

    public value(val: Value | typeof DEFAULT): string {
        if (val === DEFAULT) {
            return 'DEFAULT'
        }
        if (val === null) {
            return 'NULL'
        }
        switch (typeof val) {
            case 'string': {
                if (val.length === 0) {
                    return "''"
                }
                return "'" + val.replaceAll("'", "''") + "'"
            }
            case 'number':
            case 'bigint': {
                return val.toString()
            }
            case 'boolean': {
                return val ? 'true' : 'false'
            }
        }
        const hex = bytesTohexString(val)
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            // NOTE: ManticoreSearch does not support
            case SqlDatabaseType.ManticoreSearch: {
                return `X'${hex}'`
            }
            case SqlDatabaseType.Postgres: {
                return `'\\x${hex}'`
            }
            case SqlDatabaseType.CockroachDB: {
                return `x'${hex}'`
            }
            case SqlDatabaseType.MsSql:
            case SqlDatabaseType.QuestDB: {
                return `0x${hex}`
            }
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.Databend: {
                return `from_hex('${hex}')`
            }
        }
    }

    public entry(entry: Entry): string {
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.ManticoreSearch: {
                return this.id(entry.table)
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.MsSql:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.R2Sql: {
                return `${this.id(entry.schema)}.${this.id(entry.table)}`
            }
        }
    }

    public editValue(val: EditValue): string {
        if (val === DEFAULT || val === null || val instanceof Uint8Array) {
            return this.value(val)
        } else {
            if (val.raw) {
                return val.value
            } else {
                return this.value(val.value)
            }
        }
    }

    public where(where: { column: string; value: Value }[]) {
        return where
            .map(({ column, value }) => {
                if (value === null) {
                    return `${this.id(column)} IS NULL`
                } else {
                    return `${this.id(column)} = ${this.value(value)}`
                }
            })
            .join(' AND ')
    }

    public insertValueColumns(columns: InsertColumn[]): InsertColumn[] {
        return columns.map((item) => {
            return {
                ...item,
                name: this.id(item.name)
            }
        })
    }
}

export function bytesTohexString(bytes: Uint8Array): string {
    if (bytes.toHex) {
        return bytes.toHex()
    }
    return bytes.reduce((a, b) => {
        return a + b.toString(16).padStart(2, '0')
    }, '')
}
