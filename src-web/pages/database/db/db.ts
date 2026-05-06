// TODO: This file needs to be redesigned

import {
    Database,
    DatabaseConfig,
    Value,
    Rows,
    InsertColumn,
    Query,
    SqlDatabaseType,
    QueryData
} from '../../../tauri'
import { Entry } from '../hooks/use-store'
import { Sort, SortType } from '../preview/sort'
import { Completion, CompletionKind } from '../sql-editor'
import {
    Tables,
    DeleteTableType,
    Column,
    EditValue,
    InsertRowData,
    ForeignKeys,
    SchemaEntry,
    SchemaForeignKey,
    SchemaIndexs,
    DatabaseStruct,
    FilterType,
    FilterData,
    Trigger,
    DbFunction,
    NewTableData,
    TableColumn,
    TableForeignKeyAction,
    TableIndex,
    Extension,
    SetupExtension,
    TableType
} from './db-types'
import { Escape } from './escape'

export * from './db-types'

class Db {
    private type: SqlDatabaseType = SqlDatabaseType.Sqlite
    private escape = new Escape(SqlDatabaseType.Sqlite)

    constructor() {}

    public escapeBytes(bytes: Uint8Array): string {
        return this.escape.value(bytes)
    }

    public connect(config: DatabaseConfig) {
        this.type = config.type as SqlDatabaseType
        this.escape = new Escape(this.type)
        return Database.connect(config)
    }

    public select<R = Value[]>(sql: string): Promise<Rows<R>> {
        return Database.sql.select<R>(sql)
    }

    public query(sql: string): Promise<Query> {
        return Database.sql.query(sql)
    }

    public execute(query: string): Promise<number> {
        return Database.sql.execute(query)
    }

    public transaction(sqls: string[]): Promise<void> {
        return Database.sql.transaction(sqls)
    }

    public batchInsert(entry: Entry, columns: InsertColumn[], count: number): Promise<void> {
        return Database.sql.batchInsert({
            entry: this.escape.entry(entry),
            columns: this.escape.insertValueColumns(columns),
            count
        })
    }

    public batchInsertPreview(entry: Entry, columns: InsertColumn[], count: number): Promise<string> {
        return Database.sql.batchInsertPreview({
            entry: this.escape.entry(entry),
            columns: this.escape.insertValueColumns(columns),
            count
        })
    }

    public exportBatchInsert(
        path: string,
        entry: Entry,
        columns: InsertColumn[],
        count: number
    ): Promise<void> {
        return Database.sql.exportBatchInsert(path, {
            entry: this.escape.entry(entry),
            columns: this.escape.insertValueColumns(columns),
            count
        })
    }

    public defaultQuerySql(entry: Entry): string {
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.ManticoreSearch: {
                return `SELECT * FROM ${this.escape.entry(entry)} LIMIT 100;`
            }
            case SqlDatabaseType.MsSql: {
                return `SELECT TOP 100 * FROM ${this.escape.entry(entry)};`
            }
        }
    }

    public supportsMultipleSchemas(): boolean {
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.ManticoreSearch: {
                return false
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.MsSql:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.R2Sql: {
                return true
            }
        }
    }

    public createSchemaSql(schema: string): string {
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.ManticoreSearch: {
                throw 'Unsupported'
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.MsSql:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino: {
                return `CREATE SCHEMA ${this.escape.id(schema)};`
            }
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.BigQuery: {
                return `CREATE DATABASE ${this.escape.id(schema)};`
            }
        }
    }

    public allowCreateSchema(): boolean {
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.ManticoreSearch: {
                return false
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.MsSql:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.DuckDB: {
                return true
            }
        }
    }

    public async renameSchema(schemaName: string, newSchemaName: string): Promise<null> {
        const f = this.escape.id(schemaName)
        const t = this.escape.id(newSchemaName)
        switch (this.type) {
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino: {
                await this.execute(`ALTER SCHEMA ${f} RENAME TO ${t};`)
                return null
            }
            case SqlDatabaseType.ClickHouse: {
                await this.execute(`RENAME DATABASE ${f} TO ${t};`)
                return null
            }
            case SqlDatabaseType.Databend: {
                await this.execute(`ALTER DATABASE ${f} RENAME TO ${t};`)
                return null
            }
            // Not supported
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.Databricks:
            // Not yet supported
            case SqlDatabaseType.DuckDB:
            // May have other unexpected consequences
            case SqlDatabaseType.MsSql:
            // Too complex, haven't figured it out yet
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.ManticoreSearch: {
                throw 'Unsupported'
            }
        }
    }

    public allowRenameSchema(): boolean {
        switch (this.type) {
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino: {
                return true
            }
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.MsSql:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.ManticoreSearch: {
                return false
            }
        }
    }

    public allowCascadeDropSchema(): boolean {
        switch (this.type) {
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.DuckDB: {
                return true
            }
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.MsSql:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.ManticoreSearch:
            case SqlDatabaseType.BigQuery: {
                return false
            }
        }
    }

    public async dropSchema(schemaName: string, cascade: boolean): Promise<null> {
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.ManticoreSearch: {
                throw 'Unsupported'
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.MsSql:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino: {
                if (cascade) {
                    await this.execute(`DROP SCHEMA ${this.escape.id(schemaName)} CASCADE;`)
                } else {
                    await this.execute(`DROP SCHEMA ${this.escape.id(schemaName)};`)
                }
                return null
            }
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.BigQuery: {
                await this.execute(`DROP DATABASE ${this.escape.id(schemaName)};`)
                return null
            }
        }
    }

    public createTableSql(entry: Entry, data: NewTableData): string[] {
        const cols = () => {
            if (data.columns.length === 0) {
                return null
            }
            return data.columns
                .map((item) => {
                    let defaultValue = item.defaultValue ?? ''
                    if (defaultValue !== '') {
                        defaultValue = ` DEFAULT ${item.defaultValue}`
                    }
                    let notNull = item.notNull ? ' NOT NULL' : ''
                    let unique = item.unique ? ' UNIQUE' : ''
                    return `${this.escape.id(item.name)} ${item.datatype}${defaultValue}${notNull}${unique}`
                })
                .join(',')
        }

        const primaryKeys = () => {
            const items = data.columns
                .filter((item) => item.primaryKey)
                .map((item) => this.escape.id(item.name))
            if (items.length === 0) {
                return null
            }
            return `PRIMARY KEY (${items.join(',')})`
        }

        const foreignKeys = () => {
            const items = data.columns
                .map((column) => {
                    return column.foreignKeys.map((fk) => {
                        let value = ''
                        if (fk.name !== null) {
                            value = `CONSTRAINT ${this.escape.id(fk.name)} `
                        }
                        let entry = this.escape.entry({
                            schema: fk.schema,
                            table: fk.table
                        })
                        value += `FOREIGN KEY (${this.escape.id(
                            column.name
                        )}) REFERENCES ${entry} (${this.escape.id(fk.column)})`
                        if (fk.onUpdate !== TableForeignKeyAction.NoAction) {
                            value += ` ON UPDATE ${fk.onUpdate}`
                        }
                        if (fk.onDelete !== TableForeignKeyAction.NoAction) {
                            value += ` ON DELETE ${fk.onDelete}`
                        }
                        return value
                    })
                })
                .flat()
            if (items.length === 0) {
                return null
            }
            return items.join(',')
        }

        const checks = () => {
            if (data.checks.length === 0) {
                return null
            }
            return data.checks
                .map((item) => {
                    if (item.name !== null) {
                        return `CONSTRAINT ${this.escape.id(item.name)} CHECK (${item.expression})`
                    } else {
                        return `CHECK (${item.expression})`
                    }
                })
                .join(',')
        }

        const table = this.escape.entry(entry)

        const indexs = data.indexs.map((item) => {
            let unique = item.option.unique ? ' UNIQUE' : ''
            let name = item.name === null ? '' : ` ${this.escape.id(item.name)}`
            let columns = item.columns
                .map((item) => {
                    return this.escape.id(item.name)
                })
                .join(',')
            let where = item.option.condition === null ? '' : ` WHERE ${item.option.condition}`
            return `CREATE${unique} INDEX${name} ON ${table}(${columns})${where};`
        })

        const contentSql = [cols(), primaryKeys(), foreignKeys(), checks()]
            .filter((item) => item !== null)
            .join(',')

        return [`CREATE TABLE ${this.escape.entry(entry)} (${contentSql});`, ...indexs]
    }

    public supportDuplicateTable(): boolean {
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.MsSql:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.ManticoreSearch: {
                return true
            }
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.QuestDB: {
                return false
            }
        }
    }
    public duplicateTableSql(entry: Entry, newTableName: string, duplicateRows: boolean): string {
        const table = this.escape.entry(entry)
        const newTable = this.escape.entry({ schema: entry.schema, table: newTableName })
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1: {
                return duplicateRows
                    ? `CREATE TABLE ${newTable} AS SELECT * FROM ${table};`
                    : `CREATE TABLE ${newTable} AS SELECT * FROM ${table} LIMIT 0;`
            }
            case SqlDatabaseType.DuckDB: {
                return duplicateRows
                    ? `CREATE TABLE ${newTable} AS TABLE ${table};`
                    : `CREATE TABLE ${newTable} AS SELECT * FROM ${table} LIMIT 0;`
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB: {
                return duplicateRows
                    ? `CREATE TABLE ${newTable} AS TABLE ${table};`
                    : `CREATE TABLE ${newTable} AS TABLE ${table} WITH NO DATA;`
            }
            case SqlDatabaseType.MySql: {
                return duplicateRows
                    ? `CREATE TABLE ${newTable} AS TABLE ${table};`
                    : `CREATE TABLE ${newTable} LIKE ${table};`
            }
            case SqlDatabaseType.MariaDB: {
                return duplicateRows
                    ? `CREATE TABLE ${newTable} SELECT * FROM ${table};`
                    : `CREATE TABLE ${newTable} LIKE ${table};`
            }
            case SqlDatabaseType.MsSql: {
                return duplicateRows
                    ? `SELECT * INTO ${newTable} FROM ${table};`
                    : `SELECT * INTO ${newTable} FROM ${table} WHERE 0 = 1;`
            }
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.BigQuery: {
                return duplicateRows
                    ? `CREATE TABLE ${newTable} AS SELECT * FROM ${table};`
                    : `CREATE TABLE ${newTable} LIKE ${table};`
            }
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino: {
                return duplicateRows
                    ? `CREATE TABLE ${newTable} AS SELECT * FROM ${table};`
                    : `CREATE TABLE ${newTable} (LIKE ${table});`
            }
            case SqlDatabaseType.ManticoreSearch: {
                return duplicateRows
                    ? `CREATE TABLE ${newTable} LIKE ${table} WITH DATA;`
                    : `CREATE TABLE ${newTable} LIKE ${table};`
            }
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            // TODO: Support
            case SqlDatabaseType.QuestDB: {
                throw 'Unsupported'
            }
        }
    }

    public allowSwitchDatabase(): boolean {
        switch (this.type) {
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.MsSql:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino: {
                return true
            }
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.ManticoreSearch: {
                return false
            }
        }
    }

    // Get database list
    public async databases(): Promise<undefined | { current: string; items: string[] }> {
        let sql: string
        switch (this.type) {
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB: {
                sql = `SELECT current_database(), datname FROM pg_database WHERE datallowconn = TRUE ORDER BY datname;`
                break
            }
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend: {
                sql = `SELECT DATABASE(), schema_name FROM INFORMATION_SCHEMA.SCHEMATA ORDER BY schema_name;`
                break
            }
            case SqlDatabaseType.MsSql: {
                sql = `SELECT DB_NAME(), name FROM sys.databases ORDER BY name;`
                break
            }
            case SqlDatabaseType.BigQuery: {
                sql = `__DATAFLARE_BIGQUERY_CALL_INFORMATION_SCHEMA.SCHEMATA`
                break
            }
            case SqlDatabaseType.Presto: {
                // TODO: Presto doesn't support CURRENT_CATALOG / current_catalog(), cannot directly get current catalog, using empty string as placeholder
                sql = `SELECT '', catalog_name FROM system.metadata.catalogs ORDER BY catalog_name;`
                break
            }
            case SqlDatabaseType.Trino: {
                sql = `SELECT CURRENT_CATALOG, catalog_name FROM system.metadata.catalogs ORDER BY catalog_name;`
                break
            }
            case SqlDatabaseType.Databricks: {
                sql = `SELECT current_catalog(), catalog_name FROM system.information_schema.catalogs ORDER BY catalog_name;`
                break
            }
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.ManticoreSearch:
            case SqlDatabaseType.QuestDB: {
                return undefined
            }
        }
        const rows = await this.select<[string, string]>(sql)
        return {
            current: rows[0]?.[0] ?? '',
            items: rows.map(([_, name]) => name)
        }
    }

    public createDatabaseSql(name: string): string {
        switch (this.type) {
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.MsSql:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.BigQuery:
            // NOTE: Presto / Trino don't support CREATE DATABASE, but for a unified interface, still implemented here even though it will return a syntax error
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino: {
                return `CREATE DATABASE ${this.escape.id(name)};`
            }
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.ManticoreSearch: {
                throw 'Unsupported'
            }
        }
    }

    // ai: tool-listDatabaseSchemas Get all schemas in the database
    public async schemas(): Promise<{ currentSchema: string; schemas: string[] }> {
        let sql: string
        switch (this.type) {
            // Refer to the allowCreateSchema() method here
            // Although SQLite supports attaching databases, methods for getting columns and foreign keys don't allow specifying a schema
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.ManticoreSearch:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.WorkersAnalyticsEngine: {
                return { currentSchema: '', schemas: [] }
            }
            case SqlDatabaseType.R2Sql: {
                const namespaces = await this.select<[string]>('SHOW NAMESPACES;')
                const schemas = namespaces.map(([ns]) => ns)
                // The 'default' namespace is always the default.
                return { currentSchema: 'default', schemas }
            }
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.Databricks: {
                sql = `SELECT current_schema(), schema_name FROM INFORMATION_SCHEMA.SCHEMATA WHERE catalog_name = current_catalog() ORDER BY schema_name;`
                break
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB: {
                sql = `SELECT current_schema(), schema_name FROM INFORMATION_SCHEMA.SCHEMATA ORDER BY schema_name;`
                break
            }
            case SqlDatabaseType.Presto: {
                // Presto doesn't support CURRENT_SCHEMA / current_schema(), using empty string as placeholder
                sql = `SELECT '', schema_name FROM INFORMATION_SCHEMA.SCHEMATA ORDER BY schema_name;`
                break
            }
            case SqlDatabaseType.Trino: {
                sql = `SELECT CURRENT_SCHEMA, schema_name FROM INFORMATION_SCHEMA.SCHEMATA ORDER BY schema_name;`
                break
            }
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend: {
                sql = `SELECT DATABASE(), schema_name FROM INFORMATION_SCHEMA.SCHEMATA ORDER BY schema_name;`
                break
            }
            case SqlDatabaseType.MsSql: {
                sql = `SELECT SCHEMA_NAME(), SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA ORDER BY SCHEMA_NAME;`
                break
            }
            case SqlDatabaseType.BigQuery: {
                sql = `__DATAFLARE_BIGQUERY_CALL_INFORMATION_SCHEMA.SCHEMATA`
                break
            }
        }
        const rows = await this.select<[string, string]>(sql)
        return {
            currentSchema: rows[0]?.[0] ?? '',
            schemas: rows.map(([_, name]) => name)
        }
    }

    // Get all schemas and tables in the database
    public async tables(): Promise<Tables> {
        let sql: string
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1: {
                sql = `SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY name;`
                const rows = await this.select<[string, TableType]>(sql)
                const tables = rows.map(([name, type]) => {
                    return { name, type }
                })
                return {
                    main: tables
                }
            }
            case SqlDatabaseType.WorkersAnalyticsEngine: {
                sql = `SHOW TABLES`
                const rows = await this.select<[string]>(sql)
                return {
                    Dataset: rows.map(([name]) => {
                        return { name, type: TableType.Table }
                    })
                }
            }
            case SqlDatabaseType.ManticoreSearch: {
                sql = `SHOW TABLES`
                const rows = await this.select<[string]>(sql)
                return {
                    Manticore: rows.map(([name]) => {
                        return { name, type: TableType.Table }
                    })
                }
            }
            case SqlDatabaseType.R2Sql: {
                const namespaces = await this.select<[string]>('SHOW NAMESPACES;')
                const result: Tables = {}
                for (let i = 0; i < namespaces.length; i++) {
                    result[namespaces[i][0]] = []
                }
                await Promise.all(
                    namespaces.map(async ([ns]) => {
                        const tables = await this.select<[string]>(`SHOW TABLES IN ${this.escape.id(ns)};`)
                        result[ns] = tables.map(([name]) => {
                            return { name, type: TableType.Table }
                        })
                    })
                )
                return result
            }
            case SqlDatabaseType.QuestDB: {
                sql = `SELECT table_name, CASE WHEN matView THEN 'view' ELSE 'table' END FROM tables() ORDER BY table_name;`
                const rows = await this.select<[string, TableType]>(sql)
                return {
                    main: rows.map(([name, type]) => {
                        return { name, type }
                    })
                }
            }
            case SqlDatabaseType.BigQuery: {
                const datasets = (await this.databases())?.items ?? []
                const tasks = await Promise.all(
                    datasets.map((dataset) => {
                        const task = this.select<[string, TableType]>(
                            `SELECT table_name, IF(table_type = 'VIEW', 'view', 'table') FROM ${this.escape.id(dataset)}.INFORMATION_SCHEMA.TABLES ORDER BY table_name;`
                        )
                        return task
                    })
                )
                const tables: Tables = {}
                for (let i = 0; i < datasets.length; i++) {
                    if (tables[datasets[i]] === undefined) {
                        tables[datasets[i]] = []
                    }
                    for (const [name, type] of tasks[i]) {
                        tables[datasets[i]].push({ name, type })
                    }
                }
                return tables
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.MsSql:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino: {
                sql = `
SELECT
    c.schema_name,
    t.table_name,
    CASE WHEN table_type = 'VIEW' THEN 'view' ELSE 'table' END
FROM
    INFORMATION_SCHEMA.SCHEMATA as c
    LEFT JOIN INFORMATION_SCHEMA.TABLES as t ON t.table_schema = c.schema_name
ORDER BY c.schema_name, t.table_name;`
                break
            }
            case SqlDatabaseType.Databricks: {
                sql = `
SELECT
    c.schema_name,
    t.table_name,
    CASE WHEN t.table_type = 'VIEW' THEN 'view' ELSE 'table' END AS table_type
FROM
    INFORMATION_SCHEMA.SCHEMATA AS c
    LEFT JOIN INFORMATION_SCHEMA.TABLES AS t
    ON
        t.table_catalog = c.catalog_name AND
        t.table_schema  = c.schema_name
WHERE c.catalog_name = current_catalog()
ORDER BY c.schema_name, t.table_name;`
                break
            }
            case SqlDatabaseType.ClickHouse: {
                sql = `
SELECT
    c.schema_name,
    nullIf(t.table_name, ''),
    IF(t.table_type = 'VIEW', 'view', 'table')
FROM
    INFORMATION_SCHEMA.SCHEMATA as c
    LEFT JOIN INFORMATION_SCHEMA.TABLES as t ON t.table_schema = c.schema_name
ORDER BY c.schema_name, t.table_name;`
                break
            }
            case SqlDatabaseType.DuckDB: {
                sql = `
SELECT
    s.schema_name,
    t.table_name,
    IF(t.table_type = 'VIEW', 'view', 'table')
FROM
    INFORMATION_SCHEMA.SCHEMATA as s
    LEFT JOIN INFORMATION_SCHEMA.TABLES as t ON
        t.table_catalog = current_catalog() AND
        t.table_schema = s.schema_name
WHERE
    s.catalog_name = current_catalog()
ORDER BY 
    s.schema_name, t.table_name;`
                break
            }
        }
        const rows = await this.select<[string, string | null, TableType]>(sql)
        const tables: Tables = {}
        for (const [schema, tableName, tableType] of rows) {
            if (tables[schema] === undefined) {
                tables[schema] = []
            }
            if (tableName !== null) {
                tables[schema].push({
                    name: tableName,
                    type: tableType
                })
            }
        }
        return tables
    }

    // Editor typing suggestions
    // TODO: Triggers, stored procedures, variables (SHOW VARIABLES), and other completable items
    // TODO: DuckDB can use autocomplete extension: https://duckdb.org/docs/extensions/autocomplete
    public async completionItems(): Promise<Completion[]> {
        const [{ schemas, tables, views, indexs, columns }, keywords, functions, datatypes] =
            await Promise.all([
                this.databaseStruct(),
                this.databaseKeywords(),
                this.databaseFunctions(),
                this.databaseDataTypes()
            ])
        return [
            ...schemas.map((label) => {
                return {
                    label,
                    detail: 'Schema',
                    kind: CompletionKind.Struct
                }
            }),
            ...tables.map((label) => {
                return {
                    label,
                    detail: 'Table',
                    kind: CompletionKind.Field
                }
            }),
            ...views.map((label) => {
                return {
                    label,
                    detail: 'View',
                    kind: CompletionKind.Field
                }
            }),
            ...indexs.map((label) => {
                return {
                    label,
                    detail: 'Index',
                    kind: CompletionKind.Index
                }
            }),
            ...columns.map((label) => {
                return {
                    label,
                    detail: 'Column',
                    kind: CompletionKind.Field
                }
            }),
            ...keywords.map((label) => {
                return {
                    label,
                    detail: 'Keyword',
                    kind: CompletionKind.Keyword
                }
            }),
            ...functions.map((label) => {
                return {
                    label,
                    detail: 'Function',
                    kind: CompletionKind.Function
                }
            }),
            ...datatypes.map((label) => {
                return {
                    label,
                    detail: 'Data Type',
                    kind: CompletionKind.Value
                }
            })
        ]
    }

    // Get all schema / table / view / index / column in the database
    async databaseStruct(): Promise<DatabaseStruct> {
        const struct: DatabaseStruct = {
            schemas: [],
            tables: [],
            views: [],
            indexs: [],
            columns: []
        }
        let sql: string
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher: {
                sql = `
SELECT type, name FROM sqlite_master WHERE type IN ('table', 'view', 'index')
UNION ALL 
SELECT DISTINCT 'column', p.name FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type IN ('table', 'view');`
                break
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB: {
                sql = `
SELECT 'schema' AS type, schema_name AS name FROM INFORMATION_SCHEMA.SCHEMATA
UNION ALL
SELECT DISTINCT CASE WHEN table_type = 'VIEW' THEN 'view' ELSE 'table' END, table_name FROM INFORMATION_SCHEMA.TABLES WHERE table_schema != 'pg_catalog'
UNION ALL
SELECT DISTINCT 'index', indexname FROM pg_indexes
UNION ALL
SELECT DISTINCT 'column', column_name FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema != 'pg_catalog';`
                break
            }
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino: {
                sql = `
SELECT 'schema' AS type, schema_name AS name FROM INFORMATION_SCHEMA.SCHEMATA
UNION ALL
SELECT DISTINCT if(table_type = 'VIEW', 'view', 'table'), table_name FROM INFORMATION_SCHEMA.TABLES
UNION ALL
SELECT DISTINCT 'column', column_name FROM INFORMATION_SCHEMA.COLUMNS;`
                break
            }
            case SqlDatabaseType.BigQuery: {
                const datasets = (await this.databases())?.items ?? []
                struct.schemas = datasets
                const tasks = await Promise.all(
                    datasets.map((dataset) => {
                        const set = this.escape.id(dataset)
                        sql = `
SELECT DISTINCT IF(table_type = 'VIEW', 'view', 'table') AS type, table_name AS name FROM ${set}.INFORMATION_SCHEMA.TABLES
UNION ALL
SELECT DISTINCT 'column', column_name as name FROM ${set}.INFORMATION_SCHEMA.COLUMNS
UNION ALL
SELECT DISTINCT 'index', index_name FROM ${set}.INFORMATION_SCHEMA.SEARCH_INDEXES;`
                        return this.select<['table' | 'view' | 'column' | 'index', string]>(sql)
                    })
                )
                for (const [type, name] of tasks.flat()) {
                    switch (type) {
                        case 'column':
                            !struct.columns.includes(name) && struct.columns.push(name)
                            break
                        case 'table':
                            !struct.tables.includes(name) && struct.tables.push(name)
                            break
                        case 'view':
                            !struct.views.includes(name) && struct.views.push(name)
                            break
                        case 'index':
                            !struct.indexs.includes(name) && struct.indexs.push(name)
                            break
                    }
                }
                return struct
            }
            case SqlDatabaseType.ClickHouse: {
                sql = `
SELECT 'schema' AS type, schema_name AS name FROM INFORMATION_SCHEMA.SCHEMATA
UNION ALL
SELECT DISTINCT if(table_type = 'VIEW', 'view', 'table'), table_name FROM INFORMATION_SCHEMA.TABLES
UNION ALL
SELECT DISTINCT 'column', column_name FROM INFORMATION_SCHEMA.COLUMNS WHERE column_name NOT LIKE 'CurrentMetric_%' AND column_name NOT LIKE 'ProfileEvent_%';`
                break
            }
            case SqlDatabaseType.DuckDB: {
                sql = `
SELECT 'schema' AS type, schema_name AS name FROM INFORMATION_SCHEMA.SCHEMATA
UNION ALL
SELECT DISTINCT if(table_type = 'VIEW', 'view', 'table'), table_name FROM INFORMATION_SCHEMA.TABLES
UNION ALL
SELECT DISTINCT 'index', index_name from duckdb_indexes()
UNION ALL
SELECT DISTINCT 'column', column_name FROM INFORMATION_SCHEMA.COLUMNS;`
                break
            }
            case SqlDatabaseType.MsSql: {
                sql = `
SELECT 'schema' AS type, schema_name AS name FROM INFORMATION_SCHEMA.SCHEMATA
UNION ALL
SELECT DISTINCT IIF(table_type = 'VIEW', 'view', 'table'), table_name FROM INFORMATION_SCHEMA.TABLES
UNION ALL
SELECT DISTINCT 'index', name FROM sys.indexes WHERE name IS NOT NULL AND object_id > 100
UNION ALL
SELECT DISTINCT 'column', column_name FROM INFORMATION_SCHEMA.COLUMNS;`
                break
            }
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB: {
                sql = `
SELECT 'schema' AS type, SCHEMA_NAME AS name FROM INFORMATION_SCHEMA.SCHEMATA
UNION ALL
SELECT DISTINCT IF(table_type = 'VIEW', 'view', 'table'), table_name FROM INFORMATION_SCHEMA.TABLES
UNION ALL
SELECT DISTINCT 'index', INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
UNION ALL
SELECT DISTINCT 'column', column_name FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA != 'performance_schema' AND TABLE_SCHEMA != 'mysql' AND TABLE_SCHEMA != 'sys' AND TABLE_SCHEMA != 'information_schema';`
                break
            }
            case SqlDatabaseType.QuestDB: {
                sql = `
SELECT DISTINCT 'table', table_name FROM INFORMATION_SCHEMA.TABLES
UNION ALL
SELECT DISTINCT 'column', column_name FROM INFORMATION_SCHEMA.COLUMNS;`
                break
            }
            // D1 restricts the SQLite-like query above, loop through each table's column names here
            case SqlDatabaseType.CloudflareD1: {
                const master = await this.select<['table' | 'view' | 'index', string]>(
                    `SELECT type, name FROM sqlite_master WHERE type IN ('table', 'view', 'index') AND name != '_cf_KV';`
                )
                for (const [type, name] of master) {
                    switch (type) {
                        case 'table':
                            struct.tables.push(name)
                            break
                        case 'view':
                            struct.views.push(name)
                            break
                        case 'index':
                            struct.indexs.push(name)
                            break
                    }
                }
                const columnTasks = struct.tables.map((item) => {
                    return this.select<[string]>(
                        `SELECT name FROM pragma_table_info(${this.escape.id(item)});`
                    )
                })
                const columns = new Set<string>()
                const tasks = await Promise.allSettled(columnTasks)
                for (const task of tasks) {
                    if (task.status === 'fulfilled') {
                        for (const [name] of task.value) {
                            columns.add(name)
                        }
                    }
                }
                struct.columns = Array.from(columns)
                return struct
            }
            case SqlDatabaseType.WorkersAnalyticsEngine: {
                struct.tables = await this.tables().then((tables) => {
                    return Object.values(tables)
                        .flat()
                        .map((item) => item.name)
                })
                struct.columns = await this.tableColumnsInfo('', '').then((cols) => {
                    return cols.map((item) => item.name)
                })
                return struct
            }
            // TODO: Too many requests
            case SqlDatabaseType.R2Sql: {
                const tables = await this.tables()
                struct.schemas = Object.keys(tables)
                struct.tables = Object.values(tables)
                    .flat()
                    .map((item) => item.name)
                const columns = new Set<string>()
                await Promise.all(
                    Object.entries(tables).map(async ([ns, entries]) => {
                        await Promise.all(
                            entries.map(async (entry) => {
                                const cols = await this.tableColumnsInfo(ns, entry.name)
                                for (const col of cols) {
                                    columns.add(col.name)
                                }
                            })
                        )
                    })
                )
                struct.columns = Array.from(columns)
                return struct
            }
            case SqlDatabaseType.ManticoreSearch: {
                const tables = await this.tables()
                struct.tables = Object.values(tables)
                    .flat()
                    .map((item) => item.name)
                const columns = new Set<string>()
                await Promise.all(
                    struct.tables.map(async (table) => {
                        const cols = await this.tableColumnsInfo('', table)
                        for (const col of cols) {
                            columns.add(col.name)
                        }
                    })
                )
                struct.columns = Array.from(columns)
                return struct
            }
        }
        const rows = await this.select<['schema' | 'table' | 'view' | 'index' | 'column', string]>(sql)
        for (const [type, name] of rows) {
            switch (type) {
                case 'column':
                    struct.columns.push(name)
                    break
                case 'table':
                    struct.tables.push(name)
                    break
                case 'view':
                    struct.views.push(name)
                    break
                case 'schema':
                    struct.schemas.push(name)
                    break
                case 'index':
                    struct.indexs.push(name)
                    break
            }
        }
        return struct
    }

    public async databaseKeywords(): Promise<string[]> {
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1: {
                return (
                    await Promise.all([
                        import('./static/common-combination-keywords').then((mod) => mod.default),
                        import('./static/sqlite-keywords').then((mod) => mod.default)
                    ])
                ).flat()
            }
            case SqlDatabaseType.DuckDB: {
                return (
                    await Promise.all([
                        import('./static/common-combination-keywords').then((mod) => mod.default),
                        this.select<[string]>(`SELECT UPPER(keyword_name) from duckdb_keywords();`).then(
                            (rows) => rows.map(([val]) => val)
                        )
                    ])
                ).flat()
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB: {
                return (
                    await Promise.all([
                        import('./static/common-combination-keywords').then((mod) => mod.default),
                        import('./static/postgres-keywords').then((mod) => mod.default)
                    ])
                ).flat()
                // TODO: CockroachDB should use its own keywords
                // https://www.cockroachlabs.com/docs/stable/keywords-and-identifiers
            }
            case SqlDatabaseType.QuestDB: {
                return (
                    await Promise.all([
                        import('./static/common-combination-keywords').then((mod) => mod.default),
                        this.select<[string]>(`SELECT upper(keyword) FROM keywords();`).then((rows) =>
                            rows.map(([val]) => val)
                        )
                    ])
                ).flat()
            }
            case SqlDatabaseType.MySql: {
                return (
                    await Promise.all([
                        import('./static/common-combination-keywords').then((mod) => mod.default),
                        import('./static/mysql-keywords').then((mod) => mod.default)
                    ])
                ).flat()
            }
            case SqlDatabaseType.MariaDB: {
                return (
                    await Promise.all([
                        import('./static/common-combination-keywords').then((mod) => mod.default),
                        import('./static/mariadb-keywords').then((mod) => mod.default)
                    ])
                ).flat()
            }
            case SqlDatabaseType.ManticoreSearch: {
                return (
                    await Promise.all([
                        import('./static/common-combination-keywords').then((mod) => mod.default),
                        import('./static/manticore-search-keywords').then((mod) => mod.default)
                    ])
                ).flat()
            }
            case SqlDatabaseType.MsSql: {
                return (
                    await Promise.all([
                        import('./static/common-combination-keywords').then((mod) => mod.default),
                        import('./static/mssql-keywords').then((mod) => mod.default)
                    ])
                ).flat()
            }
            case SqlDatabaseType.ClickHouse: {
                return (await import('./static/clickhouse-keywords')).default
            }
            case SqlDatabaseType.Databend: {
                return (
                    await Promise.all([
                        import('./static/common-combination-keywords').then((mod) => mod.default),
                        import('./static/databend-keywords').then((mod) => mod.default)
                    ])
                ).flat()
            }
            case SqlDatabaseType.BigQuery: {
                return (
                    await Promise.all([
                        import('./static/common-combination-keywords').then((mod) => mod.default),
                        import('./static/bigquery-keywords').then((mod) => mod.default)
                    ])
                ).flat()
            }
            // Presto / Trino keyword lists are mostly the same, not differentiating for now
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.Presto: {
                return (
                    await Promise.all([
                        import('./static/common-combination-keywords').then((mod) => mod.default),
                        import('./static/trino-keywords').then((mod) => mod.default)
                    ])
                ).flat()
            }
            case SqlDatabaseType.Databricks: {
                return (
                    await Promise.all([
                        import('./static/common-combination-keywords').then((mod) => mod.default),
                        import('./static/databricks-keywords').then((mod) => mod.default)
                    ])
                ).flat()
            }
            case SqlDatabaseType.WorkersAnalyticsEngine: {
                return import('./static/workers-analytics-engine-keywords').then((mod) => mod.default)
            }
            case SqlDatabaseType.R2Sql: {
                return import('./static/r2sql-keywords').then((mod) => mod.default)
            }
        }
    }

    public async databaseFunctions(): Promise<string[]> {
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher: {
                const rows = await this.select<[string]>(`SELECT DISTINCT name FROM pragma_function_list();`)
                return rows.map(([val]) => val).filter((name) => /^[a-zA-Z0-9]/.test(name))
            }
            case SqlDatabaseType.CloudflareD1: {
                return (await import('./static/cloudflare-d1-functions')).default
            }
            case SqlDatabaseType.WorkersAnalyticsEngine: {
                return (await import('./static/workers-analytics-engine-functions')).default
            }
            case SqlDatabaseType.R2Sql: {
                return (await import('./static/r2sql-functions')).default
            }
            case SqlDatabaseType.DuckDB: {
                const rows = await this.select<[string]>(
                    `SELECT DISTINCT function_name FROM duckdb_functions() WHERE regexp_matches(function_name, '^[a-z0-9]');`
                )
                return rows.map(([val]) => val)
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB: {
                // TODO: Should differentiate types here
                const rows = await this.select<[string]>(`SELECT DISTINCT proname FROM pg_proc;`)
                return rows.map(([val]) => val)
            }
            case SqlDatabaseType.QuestDB: {
                const rows = await this.select<[string]>(
                    `SELECT DISTINCT name FROM functions() WHERE name ~ '^[a-z]';`
                )
                return rows.map(([val]) => val)
            }
            case SqlDatabaseType.ClickHouse: {
                const rows = await this.select<[string]>(`SELECT DISTINCT name FROM system.functions;`)
                return rows.map(([val]) => val)
            }
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB: {
                const rows = await this.select<[string]>(
                    `SELECT DISTINCT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES where routine_type = 'FUNCTION';`
                )
                const inner = (await import('./static/mysql-functions')).default
                return inner.concat(rows.map(([val]) => val))
            }
            case SqlDatabaseType.ManticoreSearch: {
                return (await import('./static/manticore-search-functions')).default
            }
            case SqlDatabaseType.MsSql: {
                const rows = await this.select<[string]>(
                    `SELECT DISTINCT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES where routine_type = 'FUNCTION';`
                )
                const inner = (await import('./static/mssql-functions')).default
                return inner.concat(rows.map(([val]) => val))
            }
            case SqlDatabaseType.Databend: {
                const rows = await this.select<[string]>(
                    `
SELECT DISTINCT name FROM system.functions
UNION SELECT DISTINCT name FROM system.table_functions
UNION SELECT DISTINCT name FROM system.user_functions;`
                )
                return rows.map(([val]) => val)
            }
            case SqlDatabaseType.BigQuery: {
                return (await import('./static/bigquery-functions')).default
            }
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino: {
                // NOTE: SHOW FUNCTIONS returns too much data, cannot use SELECT to process it, and it may also include functions from other catalogs
                const rows = await this.select<[string]>(`SHOW FUNCTIONS`)
                const set = new Set(rows.map(([val]) => val))
                return Array.from(set)
            }
            case SqlDatabaseType.Databricks: {
                const rows = await this.select<[string]>(`SHOW FUNCTIONS LIKE '[a-z]*';`)
                return rows.map(([val]) => val)
            }
        }
    }

    public async databaseDataTypes(): Promise<string[]> {
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1: {
                return (await import('./static/sqlite-datatypes')).default
            }
            case SqlDatabaseType.DuckDB: {
                const rows = await this.select<[string]>(
                    'SELECT DISTINCT type_name FROM duckdb_types() ORDER BY type_name;'
                )
                return rows.map(([val]) => val)
            }
            case SqlDatabaseType.Postgres: {
                return (await import('./static/postgres-datatypes')).default
            }
            case SqlDatabaseType.CockroachDB: {
                return (await import('./static/cockroachdb-datatypes')).default
            }
            case SqlDatabaseType.MySql: {
                return (await import('./static/mysql-datatypes')).default
            }
            case SqlDatabaseType.MariaDB: {
                return (await import('./static/mariadb-datatypes')).default
            }
            case SqlDatabaseType.ManticoreSearch: {
                return (await import('./static/manticore-datatypes')).default
            }
            case SqlDatabaseType.MsSql: {
                return (await import('./static/mssql-datatypes')).default
            }
            case SqlDatabaseType.ClickHouse: {
                return (await import('./static/clickhouse-datatypes')).default
            }
            case SqlDatabaseType.Databend: {
                return (await import('./static/databend-datatypes')).default
            }
            case SqlDatabaseType.QuestDB: {
                return (await import('./static/questdb-datatypes')).default
            }
            case SqlDatabaseType.BigQuery: {
                return (await import('./static/bigquery-datatypes')).default
            }
            // Presto / Trino datatype lists are mostly the same, not differentiating for now
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.Presto: {
                return (await import('./static/trino-datatypes')).default
            }
            case SqlDatabaseType.Databricks: {
                return (await import('./static/databricks-datatypes')).default
            }
            // Workers Analytics Engine is read-only, no need to add datatype suggestions
            // https://developers.cloudflare.com/analytics/analytics-engine/sql-reference/literals/
            case SqlDatabaseType.WorkersAnalyticsEngine: {
                return []
            }
            case SqlDatabaseType.R2Sql: {
                return (await import('./static/r2sql-datatypes')).default
            }
        }
    }

    public allowCascadeDropTable(): boolean {
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.MsSql:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.ManticoreSearch: {
                return false
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.DuckDB: {
                return true
            }
        }
    }

    public allowCascadeTruncateTable(): boolean {
        switch (this.type) {
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.DuckDB: {
                return true
            }
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.MsSql:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.ManticoreSearch: {
                return false
            }
        }
    }

    // Delete / Empty / Truncate table
    public deleteTable(entry: Entry, type: DeleteTableType, cascade: boolean): Promise<null> {
        const table = this.escape.entry(entry)
        let sql: string
        switch (type) {
            case DeleteTableType.Drop: {
                if (cascade) {
                    sql = `DROP TABLE ${table} CASCADE;`
                } else {
                    sql = `DROP TABLE ${table};`
                }
                break
            }
            case DeleteTableType.Truncate: {
                if (cascade) {
                    sql = `TRUNCATE TABLE ${table} CASCADE;`
                } else {
                    sql = `TRUNCATE TABLE ${table};`
                }
                break
            }
            case DeleteTableType.Delete: {
                sql = `DELETE FROM ${table};`
                break
            }
        }
        return this.execute(sql).then(() => null)
    }

    public allowDeleteTableTypes(): DeleteTableType[] {
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.CloudflareD1:
            // Workers Analytics Engine supports neither, but to avoid special UI handling, they are still returned here
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql: {
                return [DeleteTableType.Delete, DeleteTableType.Drop]
            }
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.ManticoreSearch:
            case SqlDatabaseType.MsSql:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino: {
                return [DeleteTableType.Delete, DeleteTableType.Truncate, DeleteTableType.Drop]
            }
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.QuestDB: {
                return [DeleteTableType.Truncate, DeleteTableType.Drop]
            }
        }
    }

    public renameTable(entry: Entry, newTableName: string): Promise<null> {
        const table = this.escape.entry(entry)
        let sql: string
        switch (this.type) {
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.ManticoreSearch: {
                sql = `ALTER TABLE ${table} RENAME TO ${this.escape.id(newTableName)};`
                break
            }
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.QuestDB:
            // Workers Analytics Engine / R2 SQL not supported
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql: {
                const newName = this.escape.entry({
                    schema: entry.schema,
                    table: newTableName
                })
                sql = `RENAME TABLE ${table} TO ${newName};`
                break
            }
            case SqlDatabaseType.MsSql: {
                sql = `SP_RENAME '${table}', ${this.escape.id(newTableName)};`
                break
            }
        }
        return this.execute(sql).then(() => null)
    }

    public moveTable(tableName: string, fromSchemaName: string, toSchemaName: string): Promise<null> {
        const from = this.escape.id(fromSchemaName)
        const to = this.escape.id(toSchemaName)
        const table = this.escape.id(tableName)
        let sql: string
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.ManticoreSearch: {
                throw 'Unsupported'
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB: {
                sql = `ALTER TABLE ${from}.${table} SET SCHEMA ${to};`
                break
            }
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB: {
                sql = `ALTER TABLE ${from}.${table} RENAME ${to}.${table};`
                break
            }
            case SqlDatabaseType.MsSql: {
                sql = `ALTER SCHEMA ${to} TRANSFER ${from}.${table};`
                break
            }
            case SqlDatabaseType.ClickHouse: {
                sql = `RENAME TABLE ${from}.${table} TO ${to}.${table};`
                break
            }
        }
        return this.execute(sql).then(() => null)
    }

    public allowMoveTable(): boolean {
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.ManticoreSearch: {
                return false
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.MsSql:
            case SqlDatabaseType.ClickHouse: {
                return true
            }
        }
    }

    // Get detailed info of all columns in a table
    public async tableColumnsInfo(schemaName: string, tableName: string): Promise<Column[]> {
        const schema = this.escape.value(schemaName)
        const table = this.escape.value(tableName)
        let sql: string
        type Rows = [string, string, bigint | number, string | null, bigint | number | boolean]
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1: {
                sql = `SELECT name, type, "notnull", dflt_value, pk FROM pragma_table_info(${table});`
                break
            }
            case SqlDatabaseType.DuckDB: {
                sql = `
WITH primary_keys AS (
    SELECT
        k.table_catalog AS table_catalog,
        k.table_schema AS table_schema,
        k.table_name AS table_name,
        k.column_name AS column_name
    FROM
        INFORMATION_SCHEMA.TABLE_CONSTRAINTS t
        INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE k ON
        t.constraint_catalog = k.constraint_catalog AND
        t.constraint_schema = k.constraint_schema AND
        t.constraint_name = k.constraint_name
    WHERE
        t.constraint_type = 'PRIMARY KEY'
)
SELECT
    c.column_name,
    c.data_type,
    if(c.is_nullable = 'YES', 0, 1),
    c.column_default,
    if(p.column_name IS NULL, 0, 1)
FROM INFORMATION_SCHEMA.COLUMNS AS c
LEFT JOIN primary_keys AS p
    ON
        c.table_catalog = p.table_catalog AND
        c.table_schema = p.table_schema AND
        c.table_name = p.table_name AND
        c.column_name = p.column_name
WHERE
    c.table_catalog = current_database() AND c.table_schema = ${schema} AND c.table_name = ${table}
ORDER BY c.ordinal_position;`
                break
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB: {
                sql = `
WITH primary_keys AS (
    SELECT 
       c.table_schema AS table_schema,
       c.table_name AS table_name,
       c.column_name AS column_name
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS c
    INNER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS t ON
        c.constraint_name = t.constraint_name AND
        c.table_schema = t.table_schema
    WHERE t.constraint_type = 'PRIMARY KEY'
)
SELECT 
    c.column_name, 
    c.udt_name,
    CASE WHEN c.is_nullable = 'NO' THEN 1 ELSE 0 END,
    c.column_default,
    CASE WHEN p.column_name IS NOT NULL THEN 1 ELSE 0 END
FROM INFORMATION_SCHEMA.COLUMNS as c
LEFT JOIN primary_keys AS p ON 
    c.table_schema = p.table_schema AND 
    c.table_name = p.table_name AND 
    c.column_name = p.column_name
WHERE c.table_schema = ${schema} AND c.table_name = ${table} ORDER BY c.ordinal_position;`
                break
            }
            case SqlDatabaseType.MsSql: {
                sql = `
SELECT 
    c.column_name, 
    c.data_type,
    IIF(c.is_nullable = 'YES', 0, 1),
    c.column_default,
    CASE WHEN p.column_name IS NOT NULL THEN 1 ELSE 0 END
FROM INFORMATION_SCHEMA.COLUMNS as c
LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE as p ON
    OBJECTPROPERTY(OBJECT_ID(p.CONSTRAINT_SCHEMA + '.' + p.CONSTRAINT_NAME), 'IsPrimaryKey') = 1 AND
    c.table_schema = p.table_schema AND
    c.table_name = p.table_name AND
    c.column_name = p.column_name
WHERE c.table_schema = ${schema} AND c.table_name = ${table} ORDER BY c.ordinal_position;`
                break
            }
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB: {
                sql = `
SELECT
    column_name,
    column_type,
    IF(is_nullable = 'YES', 0, 1),
    column_default,
    IF(column_key = 'PRI', 1, 0)
FROM
    INFORMATION_SCHEMA.COLUMNS
WHERE
    table_schema = ${schema} AND table_name = ${table} ORDER BY ordinal_position;`
                break
            }
            case SqlDatabaseType.ClickHouse: {
                sql = `
SELECT 
    name as column_name,
    type as datatype,
    type NOT LIKE 'Nullable(%' as notnull,
    default_expression AS default_value,
    is_in_primary_key as primary_key
FROM system.columns 
WHERE database = ${schema} AND table = ${table} ORDER BY position;`
                break
            }
            case SqlDatabaseType.Databend: {
                sql = `
SELECT
    column_name,
    data_type,
    if(is_nullable = 'YES', 0, 1),
    default,
    0
FROM
    INFORMATION_SCHEMA.COLUMNS
WHERE
    table_schema = ${schema} AND table_name = ${table} ORDER BY ordinal_position;`
                break
            }
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino: {
                sql = `
SELECT
    column_name,
    data_type,
    if(is_nullable = 'YES', 0, 1),
    column_default,
    0
FROM
    INFORMATION_SCHEMA.COLUMNS
WHERE
    table_schema = ${schema} AND table_name = ${table} ORDER BY ordinal_position;`
                break
            }
            case SqlDatabaseType.Databricks: {
                sql = `
SELECT
    c.column_name,
    c.data_type,
    if(c.is_nullable = 'YES', 0, 1),
    c.column_default,
    if(pk.column_name IS NOT NULL, 1, 0)
FROM
    INFORMATION_SCHEMA.COLUMNS AS c
LEFT JOIN (
    SELECT kcu.column_name
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS kcu
    JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc ON
        kcu.constraint_catalog = tc.constraint_catalog
        AND kcu.constraint_schema = tc.constraint_schema
        AND kcu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
        AND kcu.table_catalog = current_catalog() AND kcu.table_schema = ${schema} AND kcu.table_name = ${table}
) AS pk ON c.column_name = pk.column_name
WHERE
    c.table_catalog = current_catalog() AND c.table_schema = ${schema} AND c.table_name = ${table} ORDER BY c.ordinal_position;`
                break
            }
            case SqlDatabaseType.BigQuery: {
                const dataset = this.escape.id(schemaName)
                sql = `
SELECT
    c.column_name,
    c.data_type,
    if(c.is_nullable = 'YES', 0, 1),
    c.column_default,
    if(p.column_name IS NULL, 0, 1)
FROM ${dataset}.INFORMATION_SCHEMA.COLUMNS AS c
LEFT JOIN ${dataset}.INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS p ON
    c.table_name = p.table_name AND c.column_name = p.column_name
WHERE
    c.table_name = ${table} ORDER BY c.ordinal_position;`
                break
            }
            case SqlDatabaseType.QuestDB: {
                sql = `
SELECT
    column_name,
    data_type,
    0,
    null,
    0
FROM
    INFORMATION_SCHEMA.COLUMNS
WHERE
    table_name = ${table} ORDER BY ordinal_position;`
                break
            }
            case SqlDatabaseType.WorkersAnalyticsEngine: {
                // Every table has the same fixed columns
                return import('./static/workers-analytics-engine-columns').then((mod) => {
                    return mod.default.map((item) => {
                        return {
                            name: item.name,
                            datatype: item.type,
                            primaryKey: false,
                            notNull: false,
                            defaultValue: null
                        }
                    })
                })
            }
            case SqlDatabaseType.R2Sql: {
                const rows = await this.select<[string, string, string]>(
                    `DESCRIBE ${this.escape.entry({ schema: schemaName, table: tableName })};`
                )
                return rows.map(([name, datatype, required]) => {
                    return {
                        name,
                        datatype,
                        primaryKey: false,
                        notNull: required === 'true',
                        defaultValue: null
                    }
                })
            }
            case SqlDatabaseType.ManticoreSearch: {
                const rows = await this.select<[string, string]>(`DESCRIBE ${this.escape.id(tableName)};`)
                return rows.map(([name, datatype]) => {
                    return {
                        name,
                        datatype,
                        primaryKey: false,
                        notNull: false,
                        defaultValue: null
                    }
                })
            }
        }
        const rows = await this.select<Rows>(sql)
        return rows.map(([name, datatype, notNull, defaultValue, pk]): Column => {
            return {
                name,
                datatype,
                notNull: notNull != 0,
                defaultValue,
                primaryKey: pk != 0
            }
        })
    }

    // Get distinct column samples
    public async columnSamples(entry: Entry, columns: string[], limit: number): Promise<Value[][]> {
        const table = this.escape.entry(entry)
        const results = await Promise.all(
            columns.map(async (name) => {
                const column = this.escape.id(name)
                let sql: string
                switch (this.type) {
                    case SqlDatabaseType.Sqlite:
                    case SqlDatabaseType.SqlCipher:
                    case SqlDatabaseType.Postgres:
                    case SqlDatabaseType.CockroachDB:
                    case SqlDatabaseType.QuestDB:
                    case SqlDatabaseType.MySql:
                    case SqlDatabaseType.MariaDB:
                    case SqlDatabaseType.ClickHouse:
                    case SqlDatabaseType.Databend:
                    case SqlDatabaseType.Databricks:
                    case SqlDatabaseType.BigQuery:
                    case SqlDatabaseType.Presto:
                    case SqlDatabaseType.Trino:
                    case SqlDatabaseType.Turso:
                    case SqlDatabaseType.DuckDB:
                    case SqlDatabaseType.Rqlite:
                    case SqlDatabaseType.EchoLite:
                    case SqlDatabaseType.CloudflareD1:
                    case SqlDatabaseType.WorkersAnalyticsEngine: {
                        sql = `SELECT DISTINCT ${column} FROM ${table} LIMIT ${limit};`
                        break
                    }
                    case SqlDatabaseType.MsSql: {
                        sql = `SELECT DISTINCT TOP ${limit} ${column} FROM ${table};`
                        break
                    }
                    // R2 SQL / ManticoreSearch does not support DISTINCT
                    case SqlDatabaseType.R2Sql:
                    case SqlDatabaseType.ManticoreSearch: {
                        sql = `SELECT ${column} FROM ${table} LIMIT ${limit};`
                        break
                    }
                }
                const rows = await this.select(sql)
                return rows.map((row) => row[0])
            })
        )
        return results
    }

    // Get total row count of a table
    public async tableRowsCount(schema: string, tableName: string, rawWhereSql: string): Promise<number> {
        const whereSql = rawWhereSql === '' ? '' : ` WHERE ${rawWhereSql}`
        const entry = this.escape.entry({ schema, table: tableName })
        let sql: string
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.ManticoreSearch:
            case SqlDatabaseType.MsSql:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.R2Sql: {
                sql = `SELECT COUNT(*) AS count FROM ${entry}${whereSql};`
                break
            }
            // COUNT(*) is not supported in Workers Analytics Engine
            case SqlDatabaseType.WorkersAnalyticsEngine: {
                sql = `SELECT COUNT() AS count FROM ${entry}${whereSql};`
                break
            }
        }
        const rows = await this.select<[number]>(sql)
        return Number(rows[0][0])
    }

    // Get the SQL statement for querying table data
    public queryTableSql(
        entry: Entry,
        pagination: {
            limit: number
            offset: number
        } | null,
        rawWhereSql: string,
        columns: string[] | null,
        sort: Sort | null
    ): string {
        const whereSql = rawWhereSql === '' ? '' : ` WHERE ${rawWhereSql}`
        const columnsSql = columns === null ? '*' : columns.map((col) => this.escape.id(col)).join(', ')
        let sortSql = ''
        if (sort !== null) {
            sortSql = ` ORDER BY ${this.escape.id(sort.name)} ${sort.type === SortType.Ascending ? 'ASC' : 'DESC'}`
        }
        const table = this.escape.entry(entry)
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.ManticoreSearch:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.BigQuery: {
                if (pagination) {
                    return `SELECT ${columnsSql} FROM ${table}${whereSql}${sortSql} LIMIT ${pagination.limit} OFFSET ${pagination.offset};`
                } else {
                    return `SELECT ${columnsSql} FROM ${table}${whereSql}${sortSql};`
                }
            }
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino: {
                if (pagination) {
                    return `SELECT ${columnsSql} FROM ${table}${whereSql}${sortSql} OFFSET ${pagination.offset} LIMIT ${pagination.limit};`
                } else {
                    return `SELECT ${columnsSql} FROM ${table}${whereSql}${sortSql};`
                }
            }
            case SqlDatabaseType.QuestDB: {
                if (pagination) {
                    return `SELECT ${columnsSql} FROM ${table}${whereSql}${sortSql} LIMIT ${pagination.offset},${pagination.offset + pagination.limit};`
                } else {
                    return `SELECT ${columnsSql} FROM ${table}${whereSql}${sortSql};`
                }
            }
            case SqlDatabaseType.MsSql: {
                // MSSQL requires ORDER BY
                if (sortSql === '') {
                    sortSql = ' ORDER BY (SELECT NULL)'
                }
                if (pagination) {
                    return `SELECT ${columnsSql} FROM ${table}${whereSql}${sortSql} OFFSET ${pagination.offset} ROWS FETCH NEXT ${pagination.limit} ROWS ONLY;`
                } else {
                    return `SELECT ${columnsSql} FROM ${table}${whereSql}${sortSql};`
                }
            }
            case SqlDatabaseType.R2Sql: {
                if (pagination) {
                    // NOTE: R2 SQL does not support OFFSET
                    // An error will be returned if the SQL statement contains an OFFSET, so currently only the data on the first page can be viewed.
                    const offset = pagination.offset === 0 ? '' : ` OFFSET ${pagination.offset}`
                    return `SELECT ${columnsSql} FROM ${table}${whereSql}${sortSql} LIMIT ${pagination.limit}${offset};`
                } else {
                    return `SELECT ${columnsSql} FROM ${table}${whereSql}${sortSql};`
                }
            }
        }
    }

    // Get foreign keys referenced by a table
    public async foreignKeys(entry: Entry): Promise<ForeignKeys> {
        const schema = this.escape.value(entry.schema)
        const table = this.escape.value(entry.table)
        let sql: string
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1: {
                sql = `SELECT "from", 'main', "table", "to" FROM pragma_foreign_key_list(${table})`
                break
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB: {
                sql = `SELECT kcu.column_name, ccu.table_schema, ccu.table_name, ccu.column_name FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS kcu JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE AS ccu ON kcu.constraint_name = ccu.constraint_name JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc ON kcu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND kcu.table_schema = ${schema} AND kcu.table_name = ${table};`
                break
            }
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB: {
                sql = `SELECT column_name, referenced_table_schema, referenced_table_name, referenced_column_name FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE referenced_column_name IS NOT NULL AND table_schema = ${schema} AND table_name = ${table};`
                break
            }
            case SqlDatabaseType.ManticoreSearch: {
                return {}
            }
            case SqlDatabaseType.MsSql: {
                sql = `SELECT COL_NAME(parent_object_id, parent_column_id), OBJECT_SCHEMA_NAME(referenced_object_id), OBJECT_NAME(referenced_object_id), COL_NAME(referenced_object_id, referenced_column_id) FROM sys.foreign_key_columns WHERE OBJECT_SCHEMA_NAME(parent_object_id) = ${schema} AND OBJECT_NAME(parent_object_id) = ${table};`
                break
            }
            // From: https://github.com/duckdb/duckdb-java/issues/149#issuecomment-3669266051
            case SqlDatabaseType.DuckDB: {
                sql = `
WITH foreign_keys AS (
  SELECT
    pk_tc.table_schema AS referenced_table_schema,
    pk_tc.table_name AS referenced_table_name,
    pk_kcu.column_name AS referenced_column_name,
    fk_tc.table_schema AS table_schema,
    fk_tc.table_name AS table_name,
    fk_kcu.column_name AS column_name
  FROM
    information_schema.referential_constraints AS rc
    JOIN information_schema.table_constraints AS fk_tc ON fk_tc.constraint_catalog = rc.constraint_catalog
    AND fk_tc.constraint_schema = rc.constraint_schema
    AND fk_tc.constraint_name = rc.constraint_name
    JOIN information_schema.key_column_usage AS fk_kcu ON fk_kcu.constraint_catalog = rc.constraint_catalog
    AND fk_kcu.constraint_schema = rc.constraint_schema
    AND fk_kcu.constraint_name = rc.constraint_name
    JOIN information_schema.table_constraints AS pk_tc ON pk_tc.constraint_catalog = rc.unique_constraint_catalog
    AND pk_tc.constraint_schema = rc.unique_constraint_schema
    AND pk_tc.constraint_name = rc.unique_constraint_name
    JOIN information_schema.key_column_usage AS pk_kcu ON pk_kcu.constraint_catalog = pk_tc.constraint_catalog
    AND pk_kcu.constraint_schema = pk_tc.constraint_schema
    AND pk_kcu.constraint_name = pk_tc.constraint_name
    AND pk_kcu.ordinal_position = fk_kcu.ordinal_position
  WHERE pk_tc.table_catalog = current_database() AND fk_tc.table_catalog = current_database()
)
SELECT column_name, referenced_table_schema, referenced_table_name, referenced_column_name FROM foreign_keys WHERE table_schema = ${schema} AND table_name = ${table};`
                break
            }
            case SqlDatabaseType.Databricks: {
                sql = `SELECT kcu.column_name, ccu.table_schema, ccu.table_name, ccu.column_name FROM information_schema.key_column_usage AS kcu JOIN information_schema.referential_constraints AS rc ON kcu.constraint_catalog = rc.constraint_catalog AND kcu.constraint_schema = rc.constraint_schema AND kcu.constraint_name = rc.constraint_name JOIN information_schema.key_column_usage AS ccu ON ccu.constraint_catalog = rc.unique_constraint_catalog AND ccu.constraint_schema = rc.unique_constraint_schema AND ccu.constraint_name = rc.unique_constraint_name AND ccu.ordinal_position = kcu.ordinal_position WHERE kcu.table_catalog = current_catalog() AND kcu.table_schema = ${schema} AND kcu.table_name = ${table};`
                break
            }
            // Foreign keys not supported
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino: {
                return {}
            }
        }
        const rows = await this.select<[string, string, string, string | null]>(sql)
        const fks: ForeignKeys = {}
        for (const [fromColumn, schema, table, toColumn] of rows) {
            const fk = {
                toTable: {
                    schema,
                    table
                },
                toColumn: toColumn || ''
            }
            if (fks[fromColumn] === undefined) {
                fks[fromColumn] = [fk]
            } else {
                fks[fromColumn].push(fk)
            }
        }
        return fks
    }

    // Get reverse foreign keys of a table (which columns in other tables reference columns in this table)
    public async reverseForeignKeys(entry: Entry): Promise<ForeignKeys> {
        const schema = this.escape.value(entry.schema)
        const table = this.escape.value(entry.table)
        let sql: string
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher: {
                sql = `
SELECT
    'main',
    t."name",
    f."from",
    f."to"
FROM
    sqlite_master AS t,
    pragma_foreign_key_list(t.name) AS f
WHERE
    t.type = 'table'
    AND f."table" = ${table};`
                break
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB: {
                sql = `
SELECT
    kcu.table_schema,
    kcu.table_name,
    kcu.column_name,
    ccu.column_name
FROM
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS kcu
    JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE AS ccu ON kcu.constraint_name = ccu.constraint_name
    JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc ON kcu.constraint_name = tc.constraint_name
WHERE
    tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_schema = ${schema}
    AND ccu.table_name = ${table};`
                break
            }
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB: {
                sql = `
SELECT
    table_schema,
    table_name,
    column_name,
    referenced_column_name
FROM
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE
    referenced_column_name IS NOT NULL AND 
    referenced_table_schema = ${schema} AND 
    referenced_table_name = ${table};`
                break
            }
            case SqlDatabaseType.ManticoreSearch: {
                return {}
            }
            case SqlDatabaseType.MsSql: {
                sql = `
SELECT
    OBJECT_SCHEMA_NAME(parent_object_id),
    OBJECT_NAME(parent_object_id),
    COL_NAME(parent_object_id, parent_column_id),
    COL_NAME(referenced_object_id, referenced_column_id)
FROM
    sys.foreign_key_columns
WHERE
    OBJECT_SCHEMA_NAME(referenced_object_id) = ${schema} AND 
    OBJECT_NAME(referenced_object_id) = ${table};`
                break
            }
            case SqlDatabaseType.DuckDB: {
                sql = `
WITH foreign_keys AS (
  SELECT
    pk_tc.table_schema AS referenced_table_schema,
    pk_tc.table_name AS referenced_table_name,
    pk_kcu.column_name AS referenced_column_name,
    fk_tc.table_schema AS table_schema,
    fk_tc.table_name AS table_name,
    fk_kcu.column_name AS column_name
  FROM
    information_schema.referential_constraints AS rc
    JOIN information_schema.table_constraints AS fk_tc ON fk_tc.constraint_catalog = rc.constraint_catalog
    AND fk_tc.constraint_schema = rc.constraint_schema
    AND fk_tc.constraint_name = rc.constraint_name
    JOIN information_schema.key_column_usage AS fk_kcu ON fk_kcu.constraint_catalog = rc.constraint_catalog
    AND fk_kcu.constraint_schema = rc.constraint_schema
    AND fk_kcu.constraint_name = rc.constraint_name
    JOIN information_schema.table_constraints AS pk_tc ON pk_tc.constraint_catalog = rc.unique_constraint_catalog
    AND pk_tc.constraint_schema = rc.unique_constraint_schema
    AND pk_tc.constraint_name = rc.unique_constraint_name
    JOIN information_schema.key_column_usage AS pk_kcu ON pk_kcu.constraint_catalog = pk_tc.constraint_catalog
    AND pk_kcu.constraint_schema = pk_tc.constraint_schema
    AND pk_kcu.constraint_name = pk_tc.constraint_name
    AND pk_kcu.ordinal_position = fk_kcu.ordinal_position
  WHERE pk_tc.table_catalog = current_database() AND fk_tc.table_catalog = current_database()
)
SELECT table_schema, table_name, column_name, referenced_column_name FROM foreign_keys WHERE referenced_table_schema = ${schema} AND referenced_table_name = ${table};`
                break
            }
            case SqlDatabaseType.Databricks: {
                sql = `SELECT kcu.table_schema, kcu.table_name, kcu.column_name, ccu.column_name FROM information_schema.key_column_usage AS kcu JOIN information_schema.referential_constraints AS rc ON kcu.constraint_catalog = rc.constraint_catalog AND kcu.constraint_schema = rc.constraint_schema AND kcu.constraint_name = rc.constraint_name JOIN information_schema.key_column_usage AS ccu ON ccu.constraint_catalog = rc.unique_constraint_catalog AND ccu.constraint_schema = rc.unique_constraint_schema AND ccu.constraint_name = rc.unique_constraint_name AND ccu.ordinal_position = kcu.ordinal_position WHERE ccu.table_catalog = current_catalog() AND ccu.table_schema = ${schema} AND ccu.table_name = ${table};`
                break
            }
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            // D1 could also support this via traversal, but it would require TableCount requests every time a table is opened, so not considered here
            case SqlDatabaseType.CloudflareD1: {
                return {}
            }
        }
        const rows = await this.select<[string, string, string, string | null]>(sql)

        const fks: ForeignKeys = {}
        for (const [fromSchema, fromTable, fromColumn, toColumn] of rows) {
            const col = toColumn || ''
            const fk = {
                toTable: { schema: fromSchema, table: fromTable },
                toColumn: fromColumn
            }
            if (fks[col] === undefined) {
                fks[col] = [fk]
            } else {
                fks[col].push(fk)
            }
        }
        return fks
    }

    // Get all foreign keys under a schema (limited to this schema)
    public async schemaForeignKeys(schema: string): Promise<SchemaForeignKey[]> {
        let sql: string
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite: {
                sql = `
SELECT
    t."name",
    f."from",
    f."table",
    f."to"
FROM
    sqlite_master AS t
    RIGHT JOIN pragma_foreign_key_list(t.name) AS f;`
                break
            }
            // D1 restricts the SQLite-like query above, loop through each table's foreign key info here
            case SqlDatabaseType.CloudflareD1: {
                const tables = (
                    await this.select<[string]>(
                        `SELECT name FROM sqlite_master WHERE type = 'table' AND name != '_cf_KV';`
                    )
                ).map(([name]) => name)
                const tasks = tables.map((table) => {
                    return this.select<[string, string, string | null]>(
                        `SELECT "from", "table", "to" FROM pragma_foreign_key_list(${this.escape.id(table)});`
                    ).then((rows) => {
                        return { table, rows }
                    })
                })
                const results = await Promise.all(tasks)
                const fks: SchemaForeignKey[] = []
                for (const { table: fromTable, rows } of results) {
                    for (const [fromColumn, toTable, toColumn] of rows) {
                        fks.push({
                            fromTable,
                            fromColumn,
                            toTable,
                            toColumn: toColumn || ''
                        })
                    }
                }
                return fks
            }
            case SqlDatabaseType.DuckDB: {
                sql = `
WITH foreign_keys AS (
  SELECT
    pk_tc.table_schema AS referenced_table_schema,
    pk_tc.table_name AS referenced_table_name,
    pk_kcu.column_name AS referenced_column_name,
    fk_tc.table_schema AS table_schema,
    fk_tc.table_name AS table_name,
    fk_kcu.column_name AS column_name
  FROM
    information_schema.referential_constraints AS rc
    JOIN information_schema.table_constraints AS fk_tc ON fk_tc.constraint_catalog = rc.constraint_catalog
    AND fk_tc.constraint_schema = rc.constraint_schema
    AND fk_tc.constraint_name = rc.constraint_name
    JOIN information_schema.key_column_usage AS fk_kcu ON fk_kcu.constraint_catalog = rc.constraint_catalog
    AND fk_kcu.constraint_schema = rc.constraint_schema
    AND fk_kcu.constraint_name = rc.constraint_name
    JOIN information_schema.table_constraints AS pk_tc ON pk_tc.constraint_catalog = rc.unique_constraint_catalog
    AND pk_tc.constraint_schema = rc.unique_constraint_schema
    AND pk_tc.constraint_name = rc.unique_constraint_name
    JOIN information_schema.key_column_usage AS pk_kcu ON pk_kcu.constraint_catalog = pk_tc.constraint_catalog
    AND pk_kcu.constraint_schema = pk_tc.constraint_schema
    AND pk_kcu.constraint_name = pk_tc.constraint_name
    AND pk_kcu.ordinal_position = fk_kcu.ordinal_position
  WHERE pk_tc.table_catalog = current_database() AND fk_tc.table_catalog = current_database()
)
SELECT table_name, column_name, referenced_table_name, referenced_column_name FROM foreign_keys WHERE referenced_table_schema = ${this.escape.value(schema)} AND table_schema = ${this.escape.value(schema)};`
                break
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB: {
                sql = `
SELECT
    kcu.table_name,
    kcu.column_name,
    ccu.table_name,
    ccu.column_name
FROM
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS kcu
    JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE AS ccu ON kcu.table_schema = ccu.table_schema
    AND kcu.constraint_name = ccu.constraint_name
    JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc ON kcu.constraint_name = tc.constraint_name
WHERE
    tc.constraint_type = 'FOREIGN KEY'
    AND kcu.table_schema = ${this.escape.value(schema)};`
                break
            }
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB: {
                sql = `
SELECT
    table_name,
    column_name,
    referenced_table_name,
    referenced_column_name
FROM
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE
    referenced_table_name IS NOT NULL
    AND referenced_column_name IS NOT NULL
    AND referenced_table_schema = table_schema
    AND table_schema = ${this.escape.value(schema)};`
                break
            }
            case SqlDatabaseType.ManticoreSearch: {
                return []
            }
            case SqlDatabaseType.MsSql: {
                sql = `
SELECT
    OBJECT_NAME(parent_object_id),
    COL_NAME(parent_object_id, parent_column_id),
    OBJECT_NAME(referenced_object_id),
    COL_NAME(referenced_object_id, referenced_column_id)
FROM
    sys.foreign_key_columns
WHERE
    OBJECT_SCHEMA_NAME(parent_object_id) = OBJECT_SCHEMA_NAME(referenced_object_id)
    AND OBJECT_SCHEMA_NAME(parent_object_id) = ${this.escape.value(schema)};`
                break
            }
            case SqlDatabaseType.Databricks: {
                sql = `SELECT kcu.table_name, kcu.column_name, ccu.table_name, ccu.column_name FROM information_schema.key_column_usage AS kcu JOIN information_schema.referential_constraints AS rc ON kcu.constraint_catalog = rc.constraint_catalog AND kcu.constraint_schema = rc.constraint_schema AND kcu.constraint_name = rc.constraint_name JOIN information_schema.key_column_usage AS ccu ON ccu.constraint_catalog = rc.unique_constraint_catalog AND ccu.constraint_schema = rc.unique_constraint_schema AND ccu.constraint_name = rc.unique_constraint_name AND ccu.ordinal_position = kcu.ordinal_position WHERE kcu.table_catalog = current_catalog() AND kcu.table_schema = ${this.escape.value(schema)};`
                break
            }
            // Foreign keys not supported
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql: {
                return []
            }
        }
        const rows = await this.select<[string, string, string, string | null]>(sql)
        return rows.map(([fromTable, fromColumn, toTable, toColumn]) => {
            return {
                fromTable,
                fromColumn,
                toTable,
                toColumn: toColumn ?? ''
            }
        })
    }

    // Get all indexes under a schema (limited to this schema)
    public async schemaIndexs(schema: string): Promise<SchemaIndexs> {
        let sql: string
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite: {
                sql = `
SELECT
    m.tbl_name AS table_name,
    l.name AS index_name,
    l."unique" AS is_unqiue,
    i.name AS column_name
FROM
    sqlite_master AS m
    JOIN pragma_index_list(m.tbl_name) AS l
    JOIN pragma_index_info(l.name) AS i ON m.type = 'table';`
                break
            }
            // D1 restricts the SQLite-like query above, leaving empty for now here
            case SqlDatabaseType.CloudflareD1: {
                return new Map()
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB: {
                sql = `
SELECT
    t.relname AS table_name,
    i.relname AS index_name,
    CASE
        WHEN ix.indisunique THEN 1
        ELSE 0
    END AS is_unique,
    a.attname AS column_name
FROM
    pg_class t
    JOIN pg_index ix ON t.oid = ix.indrelid
    JOIN pg_class i ON ix.indexrelid = i.oid
    JOIN pg_attribute a ON t.oid = a.attrelid
    AND a.attnum = ANY(ix.indkey)
WHERE
    t.relkind = 'r'
    AND t.relnamespace = ${this.escape.value(schema)}::regnamespace;`
                break
            }
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB: {
                sql = `
SELECT
    table_name,
    index_name,
    IF(non_unique = 1, 0, 1),
    column_name
FROM
    INFORMATION_SCHEMA.STATISTICS
WHERE
    table_schema = ${this.escape.value(schema)}
ORDER BY
    seq_in_index;`
                break
            }
            case SqlDatabaseType.MsSql: {
                sql = `
SELECT
    t.name,
    i.name,
    IIF(i.is_unique = 1, 1, 0),
    c.name AS column_name
FROM
    sys.indexes i
    INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id
    AND i.index_id = ic.index_id
    INNER JOIN sys.columns c ON ic.object_id = c.object_id
    AND ic.column_id = c.column_id
    INNER JOIN sys.tables t ON i.object_id = t.object_id
WHERE
     SCHEMA_NAME(t.schema_id) = ${this.escape.value(schema)};`
                break
            }
            case SqlDatabaseType.BigQuery: {
                sql = `SELECT table_name, index_name, 0, index_column_name FROM ${this.escape.id(schema)}.INFORMATION_SCHEMA.SEARCH_INDEX_COLUMNS;`
                break
            }
            // TODO: DuckDB currently can only get explicitly defined indexes, no good way to directly get the index list, leaving empty for now
            // Can query index table_name, index_name, is_constraint: SELECT * from duckdb_indexes;
            // Can query column_name: SELECT * from duckdb_constraints;
            case SqlDatabaseType.DuckDB:
            // ???
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.QuestDB:
            // Workers Analytics Engine not supported
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            // ManticoreSearch supports indexing, but this is not currently being considered.
            case SqlDatabaseType.ManticoreSearch: {
                return new Map()
            }
        }
        const rows = await this.select<[string, string, bigint | number, string]>(sql)
        const indexs: SchemaIndexs = new Map()
        for (const [tableName, indexName, unique, column] of rows) {
            if (!indexs.has(tableName)) {
                indexs.set(tableName, {})
            }
            const table = indexs.get(tableName)!
            if (table[indexName] === undefined) {
                table[indexName] = {
                    unique: unique === 1n || unique === 1,
                    columns: []
                }
            }
            table[indexName].columns.push(column)
        }
        return indexs
    }

    // Get all indexes of a table
    public async tableIndexs(entry: Entry): Promise<TableIndex[]> {
        const schema = this.escape.value(entry.schema)
        const table = this.escape.value(entry.table)
        let sql: string
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.CloudflareD1: {
                sql = `
SELECT
    l.name AS index_name,
    l."unique" AS is_unique,
    i.name AS column_name
FROM 
    pragma_index_list(${table}) as l, 
    pragma_index_info(l.name) as i;`
                break
            }
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB: {
                sql = `
SELECT
    index_name,
    IF(non_unique = 1, 0, 1),
    column_name
FROM
    INFORMATION_SCHEMA.STATISTICS
WHERE
    table_schema = ${schema}
    AND table_name = ${table}
ORDER BY
    seq_in_index;`
                break
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB: {
                sql = `
SELECT
    i.relname,
    CASE
        ix.indisunique
        WHEN TRUE THEN 1
        ELSE 0
    END,
    a.attname
FROM
    pg_class t,
    pg_class i,
    pg_index ix,
    pg_attribute a,
    pg_namespace n
WHERE
    t.oid = ix.indrelid
    AND i.oid = ix.indexrelid
    AND a.attrelid = t.oid
    AND a.attnum = ANY(ix.indkey)
    AND t.relkind = 'r'
    AND t.relname = ${table}
    AND n.nspname = ${schema}
ORDER BY
    array_position(ix.indkey, a.attnum);`
                break
            }
            case SqlDatabaseType.MsSql: {
                sql = `
SELECT
    i.name,
    IIF(i.is_unique = 1, 1, 0),
    c.name AS column_name
FROM
    sys.indexes i
    INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id
    AND i.index_id = ic.index_id
    INNER JOIN sys.columns c ON ic.object_id = c.object_id
    AND ic.column_id = c.column_id
    INNER JOIN sys.tables t ON i.object_id = t.object_id
WHERE
    t.name = ${table} AND SCHEMA_NAME(t.schema_id) = ${schema};`
                break
            }
            case SqlDatabaseType.BigQuery: {
                sql = `SELECT index_name, 0, index_column_name FROM ${this.escape.id(entry.schema)}.INFORMATION_SCHEMA.SEARCH_INDEX_COLUMNS WHERE table_name = ${table};`
                break
            }
            // TODO: DuckDB currently can only get explicitly defined indexes, no good way to directly get the index list, leaving empty for now
            case SqlDatabaseType.DuckDB:
            // ???
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.ManticoreSearch: {
                return []
            }
        }
        const rows = await this.select<[string, bigint | number, string]>(sql)
        const indexs: TableIndex[] = []
        for (const [indexName, unique, columnName] of rows) {
            const i = indexs.findIndex((item) => {
                return item.name === indexName
            })
            if (i >= 0) {
                indexs[i].columns.push({ name: columnName })
            } else {
                indexs.push({
                    name: indexName,
                    option: { unique: unique === 1n || unique === 1, condition: null },
                    columns: [{ name: columnName }]
                })
            }
        }
        return indexs
    }

    // Get all tables and columns under a specified schema
    public async schemaTables(schemaName: string): Promise<SchemaEntry[]> {
        const schema = this.escape.value(schemaName)
        type Rows = [string, TableType, string, string, bigint | number, string | null, bigint | number]
        let sql: string
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher: {
                sql = `
SELECT
    t.name AS table_name,
    t.type AS table_type,
    c.name AS column_name,
    c.type AS column_type,
    c."notnull" AS column_notnull,
    c.dflt_value AS column_default,
    c.pk AS column_pk
FROM sqlite_master AS t
JOIN pragma_table_info(t.name) AS c
WHERE t.type IN ('table', 'view') ORDER BY t.name, c.cid;`
                break
            }
            // D1 restricts the SQLite-like query above, loop through each table's column info here
            case SqlDatabaseType.CloudflareD1: {
                const tables = await this.select<[string, TableType]>(
                    `SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name != '_cf_KV' ORDER BY name;`
                )
                const tasks = tables.map(([tableName, tableType]) => {
                    return this.tableColumnsInfo(schemaName, tableName).then((columns): SchemaEntry => {
                        return {
                            tableName,
                            tableType,
                            columns
                        }
                    })
                })
                return await Promise.all(tasks)
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB: {
                sql = `
WITH primary_keys AS (
    SELECT
        table_schema,
        table_name,
        column_name
    FROM
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE
        constraint_name IN (
            SELECT
                constraint_name
            FROM
                INFORMATION_SCHEMA.TABLE_CONSTRAINTS
            WHERE
                constraint_type = 'PRIMARY KEY'
        )
)
SELECT 
    t.table_name,
    CASE WHEN t.table_type = 'VIEW' THEN 'view' ELSE 'table' END,
    c.column_name,
    c.udt_name,
    CASE WHEN c.is_nullable = 'YES' THEN 0 ELSE 1 END,
    c.column_default,
    CASE WHEN p.column_name IS NULL THEN 0 ELSE 1 END
    FROM 
        INFORMATION_SCHEMA.TABLES AS t
        LEFT JOIN INFORMATION_SCHEMA.COLUMNS AS c ON
            t.table_schema = c.table_schema AND 
            t.table_name = c.table_name
        LEFT JOIN primary_keys AS p ON 
            c.table_schema = p.table_schema AND 
            c.table_name = p.table_name AND 
            c.column_name = p.column_name
WHERE
    t.table_schema = ${schema}
ORDER BY
    c.table_name, c.ordinal_position;`
                break
            }
            case SqlDatabaseType.DuckDB: {
                sql = `
WITH primary_keys AS (
    SELECT
        k.table_catalog AS database_name,
        k.table_schema AS table_schema,
        k.table_name AS table_name,
        k.column_name AS column_name
    FROM
        INFORMATION_SCHEMA.TABLE_CONSTRAINTS t
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE k ON t.constraint_catalog = k.constraint_catalog
        AND t.constraint_schema = k.constraint_schema
        AND t.constraint_name = k.constraint_name
    WHERE
        t.constraint_type = 'PRIMARY KEY'
)
SELECT 
    t.table_name,
    if(t.table_type = 'VIEW', 'view', 'table'),
    c.column_name,
    c.data_type,
    if(c.is_nullable = 'YES', 0, 1),
    c.column_default,
    if(p.column_name IS NULL, 0, 1)
    FROM INFORMATION_SCHEMA.TABLES AS t
    LEFT JOIN INFORMATION_SCHEMA.COLUMNS AS c 
        ON
            t.table_catalog = c.table_catalog AND
            t.table_schema = c.table_schema AND
            t.table_name = c.table_name
    LEFT JOIN primary_keys AS p 
        ON 
            c.table_catalog = p.database_name AND 
            c.table_schema = p.table_schema AND 
            c.table_name = p.table_name AND 
            c.column_name = p.column_name
WHERE
    c.table_schema = ${schema} AND t.table_catalog = current_database()
ORDER BY t.table_name, c.ordinal_position;`
                break
            }
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB: {
                sql = `
SELECT 
    t.table_name,
    IF(t.table_type = 'VIEW', 'view', 'table'),
    c.column_name,
    c.column_type,
    IF(c.is_nullable = 'YES', 0, 1),
    c.column_default,
    IF(c.column_key = 'PRI', 1, 0)
FROM 
    INFORMATION_SCHEMA.TABLES AS t
    LEFT JOIN INFORMATION_SCHEMA.COLUMNS AS c
    ON
        t.table_schema = c.table_schema AND
        t.table_name = c.table_name
WHERE
    t.table_schema = ${schema}
ORDER BY
    c.table_name, c.ordinal_position;`
                break
            }
            case SqlDatabaseType.MsSql: {
                sql = `
SELECT 
    t.table_name,
    IIF(t.table_type = 'VIEW', 'view', 'table'),
    c.column_name,
    c.data_type,
    IIF(c.is_nullable = 'YES', 0, 1),
    c.column_default,
    IIF(p.column_name IS NULL, 0, 1)
FROM 
    INFORMATION_SCHEMA.TABLES AS t
    LEFT JOIN INFORMATION_SCHEMA.COLUMNS AS c ON
        t.table_schema = c.table_schema AND
        t.table_name = c.table_name
    LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS p ON
        OBJECTPROPERTY(OBJECT_ID(p.CONSTRAINT_SCHEMA + '.' + p.CONSTRAINT_NAME), 'IsPrimaryKey') = 1 AND
        c.table_schema = p.table_schema AND
        c.table_name = p.table_name AND
        c.column_name = p.column_name
WHERE
    t.table_schema = ${schema}
ORDER BY
    c.table_name, c.ordinal_position;`
                break
            }
            case SqlDatabaseType.ClickHouse: {
                sql = `
SELECT
    t.table_name,
    IF(t.table_type = 'VIEW', 'view', 'table'),
    c.name,
    c.type,
    c.type NOT LIKE 'Nullable(%',
    c.default_expression,
    c.is_in_primary_key
FROM INFORMATION_SCHEMA.TABLES AS t 
LEFT JOIN system.columns AS c ON 
    t.table_schema = c.database AND t.table_name = c.table
WHERE table_schema = ${schema}
ORDER BY c.table, c.position;`
                break
            }
            case SqlDatabaseType.Databend: {
                sql = `
SELECT 
    t.table_name,
    if(t.table_type = 'VIEW', 'view', 'table'),
    c.column_name,
    c.data_type,
    if(c.is_nullable = 'YES', 0, 1),
    c.default,
    0
FROM 
    INFORMATION_SCHEMA.TABLES AS t
LEFT JOIN INFORMATION_SCHEMA.COLUMNS AS c ON
    t.table_schema = c.table_schema AND t.table_name = c.table_name
WHERE t.table_schema = ${schema}
ORDER BY c.table_name, c.ordinal_position;`
                break
            }
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino: {
                sql = `
SELECT
    t.table_name,
    if(t.table_type = 'VIEW', 'view', 'table'),
    c.column_name,
    c.data_type,
    if(c.is_nullable = 'YES', 0, 1),
    c.column_default,
    0
FROM
    INFORMATION_SCHEMA.TABLES AS t
LEFT JOIN INFORMATION_SCHEMA.COLUMNS AS c ON
    t.table_schema = c.table_schema AND t.table_name = c.table_name
WHERE t.table_schema = ${schema}
ORDER BY c.table_name, c.ordinal_position;`
                break
            }
            case SqlDatabaseType.Databricks: {
                sql = `
SELECT
    t.table_name,
    if(t.table_type = 'VIEW', 'view', 'table'),
    c.column_name,
    c.data_type,
    if(c.is_nullable = 'YES', 0, 1),
    c.column_default,
    if(pk.column_name IS NOT NULL, 1, 0)
FROM
    INFORMATION_SCHEMA.TABLES AS t
LEFT JOIN INFORMATION_SCHEMA.COLUMNS AS c ON
    t.table_catalog = c.table_catalog AND t.table_schema = c.table_schema AND t.table_name = c.table_name
LEFT JOIN (
    SELECT kcu.table_catalog, kcu.table_schema, kcu.table_name, kcu.column_name
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS kcu
    JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc ON
        kcu.constraint_catalog = tc.constraint_catalog
        AND kcu.constraint_schema = tc.constraint_schema
        AND kcu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY' AND kcu.table_catalog = current_catalog()
) AS pk ON
    c.table_catalog = pk.table_catalog AND c.table_schema = pk.table_schema AND c.table_name = pk.table_name AND c.column_name = pk.column_name
WHERE t.table_catalog = current_catalog() AND t.table_schema = ${schema}
ORDER BY c.table_name, c.ordinal_position;`
                break
            }
            case SqlDatabaseType.BigQuery: {
                const schema = this.escape.id(schemaName)
                sql = `
SELECT 
    t.table_name,
    if(t.table_type = 'VIEW', 'view', 'table'),
    c.column_name,
    c.data_type,
    if(c.is_nullable = 'YES', 0, 1),
    c.column_default,
    if(p.column_name IS NULL, 0, 1)
FROM 
    ${schema}.INFORMATION_SCHEMA.TABLES AS t
LEFT JOIN ${schema}.INFORMATION_SCHEMA.COLUMNS AS c ON
    t.table_name = c.table_name
LEFT JOIN ${schema}.INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS p ON
    c.table_name = p.table_name AND c.column_name = p.column_name
ORDER BY c.table_name, c.ordinal_position;`
                break
            }
            case SqlDatabaseType.QuestDB: {
                sql = `
SELECT
    t.table_name,
    'table',
    c.column_name,
    c.data_type,
    0,
    null,
    0
FROM INFORMATION_SCHEMA.TABLES AS t
LEFT JOIN INFORMATION_SCHEMA.COLUMNS AS c ON t.table_name = c.table_name
ORDER BY c.table_name, c.ordinal_position;`
                break
            }
            case SqlDatabaseType.WorkersAnalyticsEngine: {
                const tables = await this.select<[string]>('SHOW TABLES')
                // Analytics Engine has no schema and columns are not table-specific, always returns the same fixed columns
                const columns = await this.tableColumnsInfo('', '')
                return tables.map(([tableName]) => {
                    return {
                        tableName,
                        tableType: TableType.Table,
                        columns
                    }
                })
            }
            case SqlDatabaseType.R2Sql: {
                const tables = await this.select<[string]>(`SHOW TABLES IN ${this.escape.id(schemaName)};`)
                const tasks = tables.map(async ([tableName]) => {
                    return {
                        tableName,
                        tableType: TableType.Table,
                        columns: await this.tableColumnsInfo(schemaName, tableName)
                    }
                })
                return Promise.all(tasks)
            }
            case SqlDatabaseType.ManticoreSearch: {
                const tables = Object.values(await this.tables())[0]
                const tasks = tables.map(async ({ name: tableName, type: tableType }) => {
                    const columns = await this.tableColumnsInfo('', tableName)
                    return { tableName, tableType, columns }
                })
                return Promise.all(tasks)
            }
        }
        const rows = await this.select<Rows>(sql)
        const entrys: SchemaEntry[] = []
        for (const [tableName, tableType, name, datatype, notNull, defaultValue, pk] of rows) {
            let i = -1
            for (let n = entrys.length - 1; n >= 0; n--) {
                if (entrys[n].tableName === tableName) {
                    i = n
                    break
                }
            }
            if (i < 0) {
                entrys.push({
                    tableName,
                    tableType,
                    columns: []
                })
                i = entrys.length - 1
            }
            entrys[i].columns.push({
                name,
                datatype,
                notNull: notNull != 0,
                defaultValue,
                primaryKey: pk != 0
            })
        }
        return entrys
    }

    public supportFunctions(): boolean {
        switch (this.type) {
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.MsSql: {
                return true
            }
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.DuckDB:
            // Uncertain
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.ManticoreSearch: {
                return false
            }
        }
    }

    // Get all functions under a specified schema
    public async schemaFunctions(schemaName: string): Promise<DbFunction[]> {
        let sql: string
        switch (this.type) {
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB: {
                sql = `
SELECT
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS args,
    t.typname AS return_type,
    p.prosrc AS function_sql
FROM
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    JOIN pg_type t ON p.prorettype = t.oid
WHERE
    n.nspname = ${this.escape.value(schemaName)}
    AND p.prokind = 'f'
ORDER BY
    p.proname;`
                break
            }
            // TODO: Haven't tested functions with the same name
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB: {
                sql = `
SELECT
    r.ROUTINE_NAME AS fn_name,
    GROUP_CONCAT(
        CONCAT(p.PARAMETER_NAME, ' ', p.DATA_TYPE)
        ORDER BY
            p.ORDINAL_POSITION SEPARATOR ', '
    ) AS fn_args,
    r.DATA_TYPE AS fn_return_type,
    r.ROUTINE_DEFINITION AS fn_sql
FROM
    INFORMATION_SCHEMA.ROUTINES AS r
    LEFT JOIN INFORMATION_SCHEMA.PARAMETERS AS p ON r.ROUTINE_SCHEMA = p.SPECIFIC_SCHEMA
    AND r.ROUTINE_NAME = p.SPECIFIC_NAME
    AND p.ROUTINE_TYPE = 'FUNCTION'
WHERE
    r.ROUTINE_TYPE = 'FUNCTION'
    AND r.ROUTINE_SCHEMA = ${this.escape.value(schemaName)}
GROUP BY
    r.ROUTINE_NAME,
    r.DATA_TYPE,
    r.ROUTINE_DEFINITION
ORDER BY
    r.ROUTINE_NAME;`
                break
            }
            // TODO: Missing args
            case SqlDatabaseType.MsSql: {
                sql = `
SELECT
    ROUTINE_NAME AS function_name,
    '' AS args,
    DATA_TYPE AS return_type,
    ROUTINE_DEFINITION AS function_sql
FROM
    INFORMATION_SCHEMA.ROUTINES
WHERE
    ROUTINE_TYPE = 'FUNCTION'
    AND ROUTINE_SCHEMA = ${this.escape.value(schemaName)}
ORDER BY ROUTINE_NAME;`
                break
            }
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.QuestDB:
            // ???
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.ManticoreSearch: {
                throw 'Unsupported'
            }
        }
        const rows = await this.select<[string, string | null, string | null, string]>(sql)
        return rows.map(([name, args, returnType, sql]) => {
            return {
                name,
                args: args ?? '',
                returnType: returnType ?? '',
                sql
            }
        })
    }

    public supportExtensions(): boolean {
        switch (this.type) {
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB: {
                return true
            }
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.ManticoreSearch:
            case SqlDatabaseType.MsSql:
            // TODO: DuckDB can actually support duckdb_extensions()
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.QuestDB: {
                return false
            }
        }
    }

    // Get all available extensions in the database
    public async extensions(): Promise<Extension[]> {
        switch (this.type) {
            case SqlDatabaseType.Postgres:
            // TODO: CockroachDB might not support querying this way
            case SqlDatabaseType.CockroachDB: {
                const sql = `
SELECT
    e.name,
    e.default_version,
    e.installed_version,
    e.comment,
    n.nspname
FROM
    pg_available_extensions e
    LEFT JOIN pg_extension i ON i.extname = e.name
    LEFT JOIN pg_namespace n ON n.oid = i.extnamespace
ORDER BY e.name;`
                const rows =
                    await this.select<[string, string, string | null, string | null, string | null]>(sql)
                return rows.map(([name, defaultVersion, installedVersion, comment, schema]) => {
                    return {
                        name,
                        defaultVersion,
                        installedVersion,
                        comment,
                        schema
                    }
                })
            }
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.ManticoreSearch:
            case SqlDatabaseType.MsSql:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.QuestDB: {
                throw 'Unsupported'
            }
        }
    }

    // Enable / Disable extension
    public async setupExtension({ name, schema }: SetupExtension): Promise<void> {
        if (schema === undefined) {
            // TODO: If this extension is in use, CASCADE may be required
            await this.execute(`DROP EXTENSION ${this.escape.id(name)};`)
        } else {
            if (schema === null) {
                await this.execute(`CREATE EXTENSION ${this.escape.id(name)} CASCADE;`)
            } else {
                await this.execute(
                    `CREATE EXTENSION ${this.escape.id(name)} SCHEMA ${this.escape.id(schema)} CASCADE;`
                )
            }
        }
    }

    public supportTriggers(): boolean {
        switch (this.type) {
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.MsSql: {
                return true
            }
            case SqlDatabaseType.CockroachDB:
            // DuckDB doesn't support triggers yet https://github.com/duckdb/duckdb/issues/750
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.ManticoreSearch: {
                return false
            }
        }
    }

    // Get all triggers under a specified schema
    public async schemaTriggers(schemaName: string): Promise<Trigger[]> {
        const schema = this.escape.value(schemaName)
        switch (this.type) {
            // TODO: Too much data missing, consider parsing from SQL
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.CloudflareD1: {
                const sql = `SELECT name, tbl_name, sql FROM sqlite_master WHERE type = 'trigger' ORDER BY tbl_name;`
                const rows = await this.select<[string, string, string]>(sql)
                return rows.map(([name, tableName, sql]) => {
                    return {
                        name,
                        tableName,
                        sql
                    }
                })
            }
            case SqlDatabaseType.Postgres: {
                const sql = `
SELECT
    t.tgname AS trigger_name,
    c.relname AS table_name,
    proname AS function_name,
    COALESCE(
        CASE WHEN (tgtype::int::bit(7) & b'0000010')::int = 0 THEN NULL ELSE 'BEFORE' END,
        CASE WHEN (tgtype:: int::bit(7) & b'0000010')::int = 0 THEN 'AFTER' ELSE NULL END,
        CASE WHEN (tgtype:: int::bit(7) & b'1000000')::int = 0 THEN NULL ELSE 'INSTEAD' END,
        ''
    )::text AS trigger_timing,
    (
        CASE WHEN (tgtype::int::bit(7) & b'0000100')::int = 0 THEN '' ELSE ' INSERT' END
    ) || (
        CASE WHEN (tgtype::int::bit(7) & b'0001000')::int = 0 THEN '' ELSE ' DELETE' END
    ) || (
        CASE WHEN (tgtype::int::bit(7) & b'0010000')::int = 0 THEN '' ELSE ' UPDATE' END
    ) || (
        CASE WHEN (tgtype::int::bit(7) & b'0100000')::int = 0 THEN '' ELSE ' TRUNCATE' END
    ) AS trigger_action,
    pg_get_triggerdef(t.oid) AS trigger_definition,
    CASE
        t.tgenabled
        WHEN 'O' THEN 'Origin / Local'
        WHEN 'D' THEN 'Disabled'
        WHEN 'R' THEN 'Replica'
        WHEN 'A' THEN 'Always'
        ELSE 'Unknown'
    END AS enabled_mode
FROM
    pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    JOIN pg_class c ON c.oid = t.tgrelid
WHERE
    c.relnamespace = (
        SELECT oid FROM pg_namespace WHERE nspname = ${schema}
    )
ORDER BY table_name;`
                const rows = await this.select<[string, string, string, string, string, string, string]>(sql)
                return rows.map(([name, tableName, functionName, timing, action, sql, enabledMode]) => {
                    return {
                        name,
                        tableName,
                        functionName,
                        timing,
                        action,
                        sql,
                        enabledMode
                    }
                })
            }
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB: {
                const sql = `
SELECT
    TRIGGER_NAME,
    EVENT_OBJECT_TABLE,
    ACTION_TIMING,
    EVENT_MANIPULATION,
    ACTION_STATEMENT
FROM
    INFORMATION_SCHEMA.TRIGGERS
WHERE
    TRIGGER_SCHEMA = ${schema}
ORDER BY
    EVENT_OBJECT_TABLE;`
                const rows = await this.select<[string, string, string, string, string]>(sql)
                return rows.map(([name, tableName, timing, acion, sql]) => {
                    return {
                        name,
                        tableName,
                        timing,
                        acion,
                        sql
                    }
                })
            }
            case SqlDatabaseType.MsSql: {
                const sql = `
SELECT
    t.name AS trigger_name,
    OBJECT_NAME(t.parent_id) AS table_name,
    OBJECT_NAME(t.object_id) AS function_name,
    CASE t.is_instead_of_trigger WHEN 1 THEN 'INSTEAD OF' WHEN 0 THEN 'AFTER' ELSE 'Unknown' END AS timing,
    CASE WHEN t.is_disabled = 1 THEN 'Disabled' ELSE 'Enabled' END AS enabled,
    s.definition as sql
FROM
    sys.triggers t
    LEFT JOIN sys.objects o ON t.parent_id = o.object_id
    LEFT JOIN sys.sql_modules s ON t.object_id = s.object_id
WHERE
    t.parent_class = 1 AND 
    SCHEMA_NAME(o.schema_id) = ${schema}
ORDER BY table_name;`
                const rows = await this.select<[string, string, string, string, string, string]>(sql)
                return rows.map(([name, tableName, functionName, timing, enabledMode, sql]) => {
                    return {
                        name,
                        tableName,
                        functionName,
                        timing,
                        enabledMode,
                        sql
                    }
                })
            }
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.ManticoreSearch: {
                throw 'Unsupported'
            }
        }
    }

    public whereSearchSQL(column: string, value: Value) {
        return this.escape.where([
            {
                column,
                value
            }
        ])
    }

    public tableFilterSQL(column: string, data: FilterData): string {
        const name = this.escape.id(column)
        const t = {
            [FilterType.IsNull]: 'IS NULL',
            [FilterType.IsNotNull]: 'IS NOT NULL',
            [FilterType.Equal]: '=',
            [FilterType.NotEqual]: '!=',
            [FilterType.GreaterThan]: '>',
            [FilterType.GreaterThanOrEqual]: '>=',
            [FilterType.LessThan]: '<',
            [FilterType.LessThanOrEqual]: '<='
        }
        switch (data.type) {
            case FilterType.IsNull:
            case FilterType.IsNotNull: {
                return `${name} ${t[data.type]}`
            }
            default: {
                return `${name} ${t[data.type]} ${this.escape.value(data.value)}`
            }
        }
    }

    // Edit table: add a column to a table
    public addTableColumnSQL(entry: Entry, column: TableColumn): string {
        const table = this.escape.entry(entry)
        const columnName = this.escape.id(column.name)
        let sql: string
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.ManticoreSearch:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino: {
                sql = `ALTER TABLE ${table} ADD COLUMN ${columnName} ${column.datatype}`
                break
            }
            case SqlDatabaseType.MsSql: {
                sql = `ALTER TABLE ${table} ADD ${columnName} ${column.datatype}`
                break
            }
        }
        if (column.notNull) {
            sql += ` NOT NULL`
        }
        if (column.unique) {
            sql += ` UNIQUE`
        }
        if (column.defaultValue !== null) {
            sql += ` DEFAULT ${column.defaultValue}`
        }
        if (column.primaryKey) {
            sql += ` PRIMARY KEY`
        }
        return sql + ';'
    }

    // Edit table: drop a column from a table
    public dropTableColumnSQL(tableName: Entry, columnName: string): string {
        const table = this.escape.entry(tableName)
        const column = this.escape.id(columnName)
        return `ALTER TABLE ${table} DROP COLUMN ${column};`
    }

    // Edit table: rename a column in a table
    public renameTableColumnSQL(entry: Entry, columnName: string, newColumnName: string): string {
        const column = this.escape.id(columnName)
        const newColumn = this.escape.id(newColumnName)
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.ManticoreSearch: {
                const table = this.escape.entry(entry)
                return `ALTER TABLE ${table} RENAME COLUMN ${column} TO ${newColumn};`
            }
            case SqlDatabaseType.MsSql: {
                const schema = this.escape.id(entry.schema)
                const table = this.escape.id(entry.table)
                return `SP_RENAME '${schema}.${table}.${column}', ${newColumn}, 'COLUMN';`
            }
        }
    }

    // Add an index to a table
    public addTableIndexSQL(entry: Entry, index: TableIndex): string {
        let unique = index.option.unique ? ' UNIQUE' : ''
        let name = index.name === null ? '' : ` ${this.escape.id(index.name)}`
        let columns = index.columns
            .map((item) => {
                return this.escape.id(item.name)
            })
            .join(',')
        let where = index.option.condition === null ? '' : ` WHERE ${index.option.condition}`
        return `CREATE${unique} INDEX${name} ON ${this.escape.entry(entry)}(${columns})${where};`
    }

    // Edit table: drop an index from a table
    public dropTableIndexSQL(entry: Entry, indexName: string): string {
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.CloudflareD1: {
                return `DROP INDEX ${this.escape.id(indexName)};`
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.DuckDB: {
                const schema = this.escape.id(entry.schema)
                const index = this.escape.id(indexName)
                return `DROP INDEX ${schema}.${index};`
            }
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB: {
                return `ALTER TABLE ${this.escape.entry(entry)} DROP INDEX ${this.escape.id(indexName)};`
            }
            case SqlDatabaseType.MsSql: {
                return `DROP INDEX ${this.escape.id(indexName)} ON ${this.escape.entry(entry)};`
            }
            case SqlDatabaseType.BigQuery: {
                return `DROP SEARCH INDEX ${this.escape.id(indexName)} ON ${this.escape.entry(entry)};`
            }
            // This should never be called
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.ManticoreSearch: {
                throw 'Unsupported'
            }
        }
    }

    // Edit table: whether renaming indexes is allowed
    public allowRenameIndex(): boolean {
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.ManticoreSearch:
            case SqlDatabaseType.MsSql:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.QuestDB: {
                return false
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB: {
                return true
            }
        }
    }

    // Edit table: rename an index in a table
    public renameTableIndexSQL(entry: Entry, indexName: string, newIndexName: string): string {
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.ManticoreSearch:
            case SqlDatabaseType.MsSql:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino: {
                throw 'Unsupported'
            }
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB: {
                const schema = this.escape.id(entry.schema)
                const index = this.escape.id(indexName)
                const newIndex = this.escape.id(newIndexName)
                return `ALTER INDEX ${schema}.${index} RENAME TO ${newIndex};`
            }
        }
    }

    // Delete data from table
    public deleteTableRowsSQL(entry: Entry, wheres: { column: string; value: Value }[][]): string {
        const table = this.escape.entry(entry)
        const filter = wheres
            .map((v) => {
                if (v.length === 1) {
                    return this.escape.where(v)
                } else {
                    return '(' + this.escape.where(v) + ')'
                }
            })
            .join(' OR ')
        return `DELETE FROM ${table} WHERE ${filter};`
    }

    public updateTableRowSql(
        entry: Entry,
        values: {
            [column: string]: EditValue
        },
        where: { column: string; value: Value }[]
    ): string {
        const t = this.escape.entry(entry)
        const v = Object.entries(values)
            .map(([column, value]) => {
                const c = this.escape.id(column)
                const v = this.escape.editValue(value)
                return `${c} = ${v}`
            })
            .join(', ')
        const w = this.escape.where(where)
        switch (this.type) {
            case SqlDatabaseType.Sqlite:
            case SqlDatabaseType.SqlCipher:
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.ManticoreSearch:
            case SqlDatabaseType.MsSql:
            case SqlDatabaseType.Turso:
            case SqlDatabaseType.DuckDB:
            case SqlDatabaseType.Rqlite:
            case SqlDatabaseType.EchoLite:
            case SqlDatabaseType.CloudflareD1:
            case SqlDatabaseType.WorkersAnalyticsEngine:
            case SqlDatabaseType.R2Sql:
            case SqlDatabaseType.Databend:
            case SqlDatabaseType.BigQuery:
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.QuestDB:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino: {
                return `UPDATE ${t} SET ${v} WHERE ${w};`
            }
            case SqlDatabaseType.ClickHouse: {
                return `ALTER TABLE ${t} UPDATE ${v} WHERE ${w};`
            }
        }
    }

    // Insert a row of data into a table
    public insertRowSql(entry: Entry, data: InsertRowData): string {
        const table = this.escape.entry(entry)
        const keys = Object.keys(data)
        if (keys.length === 0) {
            let defaultSQL: string
            switch (this.type) {
                case SqlDatabaseType.Sqlite:
                case SqlDatabaseType.Turso:
                case SqlDatabaseType.DuckDB:
                case SqlDatabaseType.Postgres:
                case SqlDatabaseType.CockroachDB:
                case SqlDatabaseType.MsSql:
                case SqlDatabaseType.SqlCipher:
                case SqlDatabaseType.Rqlite:
                case SqlDatabaseType.EchoLite:
                case SqlDatabaseType.CloudflareD1:
                case SqlDatabaseType.WorkersAnalyticsEngine:
                case SqlDatabaseType.R2Sql:
                case SqlDatabaseType.ClickHouse:
                case SqlDatabaseType.Databend:
                case SqlDatabaseType.BigQuery:
                case SqlDatabaseType.QuestDB:
                case SqlDatabaseType.Presto:
                case SqlDatabaseType.Trino: {
                    defaultSQL = `INSERT INTO ${table} DEFAULT VALUES;`
                    break
                }
                case SqlDatabaseType.MySql:
                case SqlDatabaseType.MariaDB:
                case SqlDatabaseType.ManticoreSearch: {
                    defaultSQL = `INSERT INTO ${table} VALUES();`
                    break
                }
                // TODO: If the table has multiple columns, multiple values need to be specified in VALUES, otherwise it will error
                case SqlDatabaseType.Databricks: {
                    defaultSQL = `INSERT INTO ${table} VALUES (DEFAULT);`
                    break
                }
            }
            return defaultSQL
        }
        const keysStr = keys.map((item) => this.escape.id(item)).join(',')
        const valuesStr = Object.values(data)
            .map((val) => this.escape.editValue(val))
            .join(',')
        return `INSERT INTO ${table} (${keysStr}) VALUES (${valuesStr});`
    }

    // SQL for inserting multiple rows into a table
    public insertRowsSql(entry: Entry, data: QueryData): string {
        const table = this.escape.entry(entry)
        const columns = data.columns
            .map((item) => {
                return this.escape.id(item.name)
            })
            .join(', ')
        const rows = data.rows
            .map((item) => {
                const values = item
                    .map((item) => {
                        return this.escape.value(item)
                    })
                    .join(', ')
                return `(${values})`
            })
            .join(',\n')
        return `INSERT INTO ${table} (${columns}) VALUES\n${rows};`
    }
}

export const db = new Db()
