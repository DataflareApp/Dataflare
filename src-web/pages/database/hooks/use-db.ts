import { useMemo } from 'react'
import useSWRImmutable from 'swr/immutable'
import { SqlDatabaseConfig, SqlDatabaseType } from '../../../tauri'
import { SelectProps } from '../../../ui'
import { db, Tables } from '../db/db'
import { LanguageHighLight } from '../sql-editor'
import { useConnectedID, useConnectID, useConnection } from './use-store'

const defaultSchema = (config: SqlDatabaseConfig): string => {
    switch (config.type) {
        case SqlDatabaseType.Sqlite:
        case SqlDatabaseType.Turso:
        case SqlDatabaseType.DuckDB:
        case SqlDatabaseType.Rqlite:
        case SqlDatabaseType.EchoLite:
        case SqlDatabaseType.SqlCipher:
        case SqlDatabaseType.CloudflareD1:
        case SqlDatabaseType.WorkersAnalyticsEngine:
        case SqlDatabaseType.QuestDB: {
            return 'main'
        }
        case SqlDatabaseType.Postgres:
        case SqlDatabaseType.CockroachDB: {
            return 'public'
        }
        case SqlDatabaseType.MySql:
        case SqlDatabaseType.MariaDB: {
            return config.options.database || ''
        }
        case SqlDatabaseType.ManticoreSearch: {
            return 'Manticore'
        }
        case SqlDatabaseType.ClickHouse:
        case SqlDatabaseType.Databend: {
            return config.options.database === '' ? 'default' : config.options.database
        }
        case SqlDatabaseType.MsSql: {
            return 'dbo'
        }
        case SqlDatabaseType.BigQuery: {
            return config.options.dataset ?? ''
        }
        case SqlDatabaseType.Presto:
        case SqlDatabaseType.Trino: {
            return config.options.schema
        }
        case SqlDatabaseType.Databricks: {
            return config.options.schema ?? 'default'
        }
        case SqlDatabaseType.R2Sql: {
            return 'default'
        }
    }
}

export interface SchemaOptions {
    schemas: string[]
    selectOptions: SelectProps['options']
}

export const useSchemaOptions = (tables: Tables | undefined): SchemaOptions => {
    const config = useConnection().config as SqlDatabaseConfig
    const schemas = useMemo(() => {
        const schemas = Object.keys(tables ?? {})
        const firstSchema = defaultSchema(config)
        const sortedSchemas = schemas.sort((name, _) => {
            return name === firstSchema ? -1 : 0
        })
        return {
            schemas: sortedSchemas,
            selectOptions: sortedSchemas.map((item) => {
                return {
                    name: item,
                    value: item
                }
            })
        }
    }, [tables, config])

    return schemas
}

export const useLanguageHighLight = (): LanguageHighLight => {
    const connectedID = useConnectedID()
    const databaseType = useConnection().config.type as SqlDatabaseType

    // Keywords only relate to the current database type
    const { data: keywords } = useSWRImmutable(['sql-keywords', databaseType], () => {
        return db.databaseKeywords()
    })

    const key = connectedID !== null ? ['sql-functions', connectedID] : null
    const { data: functions } = useSWRImmutable(
        key,
        () => {
            return db.databaseFunctions()
        },
        { shouldRetryOnError: true }
    )

    return useMemo(() => {
        return {
            databaseType,
            keywords: keywords ?? [],
            functions: functions ?? []
        }
    }, [keywords, functions])
}

// Get all field types of the currently connected database
const EMPTY = [] as string[]
export const useDatabaseDataType = (): string[] => {
    const connectID = useConnectID()
    const { data } = useSWRImmutable(['datatypes', connectID], () => {
        return db.databaseDataTypes()
    })
    return data ?? EMPTY
}

// Whether the current database is in read-only mode
export const useReadonly = () => {
    const connection = useConnection()
    return connection.config.options.readonly
}
