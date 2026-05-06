import { Value } from '../../../tauri'
import { Entry } from '../hooks/use-store'

export interface Tables {
    [schema: string]: Table[]
}

export type Table = {
    name: string
    type: TableType
}

export const enum TableType {
    Table = 'table',
    View = 'view'
}

export enum DeleteTableType {
    Drop = 'Drop',
    Delete = 'Delete',
    Truncate = 'Truncate'
}

export interface Column {
    name: string
    datatype: string
    primaryKey: boolean
    notNull: boolean
    defaultValue: string | null
}

export const DEFAULT = Symbol('__DATABASE_DEFAULT_KEYWORD__')
export type EditValue = null | typeof DEFAULT | Uint8Array | { raw: boolean; value: string }

export type InsertRowData = Record<string, EditValue>

export type ForeignKeys = Record<string, ForeignKey[]>
export interface ForeignKey {
    toTable: Entry
    toColumn: string
}

export interface SchemaEntry {
    tableName: string
    tableType: TableType
    columns: Column[]
}

export interface SchemaForeignKey {
    fromTable: string
    fromColumn: string
    toTable: string
    toColumn: string
}

export type SchemaIndexs = Map<string, Record<string, { unique: boolean; columns: string[] }>>

export interface DatabaseStruct {
    schemas: string[]
    tables: string[]
    views: string[]
    indexs: string[]
    columns: string[]
}

export const enum FilterType {
    IsNull,
    IsNotNull,
    Equal,
    NotEqual,
    GreaterThan,
    GreaterThanOrEqual,
    LessThan,
    LessThanOrEqual
}

export type FilterData =
    | {
          type: FilterType.IsNull | FilterType.IsNotNull
      }
    | {
          type:
              | FilterType.Equal
              | FilterType.NotEqual
              | FilterType.GreaterThan
              | FilterType.GreaterThanOrEqual
              | FilterType.LessThan
              | FilterType.LessThanOrEqual
          value: Value
      }

export interface Trigger {
    name: string
    tableName: string
    functionName?: string
    timing?: string
    action?: string
    enabledMode?: string
    sql: string
}

export interface DbFunction {
    name: string
    args: string
    returnType: string
    sql: string
}

export interface Extension {
    name: string
    defaultVersion: string
    installedVersion: string | null
    comment: string | null
    schema: string | null
}

export interface SetupExtension {
    name: string
    schema?: string | null
}

export interface NewTableData {
    columns: TableColumn[]
    indexs: TableIndex[]
    checks: TableCheck[]
}

export interface TableColumn {
    name: string
    datatype: string
    defaultValue: string | null
    primaryKey: boolean
    notNull: boolean
    unique: boolean
    foreignKeys: TableForeignKey[]
}

export interface TableForeignKey {
    name: string | null
    schema: string
    table: string
    column: string
    onUpdate: TableForeignKeyAction
    onDelete: TableForeignKeyAction
}

export const enum TableForeignKeyAction {
    NoAction = 'NO ACTION',
    Restrict = 'RESTRICT',
    Cascade = 'CASCADE',
    SetNull = 'SET NULL',
    SetDefault = 'SET DEFAULT'
}

export interface TableIndex {
    name: string | null
    option: TableIndexOption
    columns: TableIndexColumn[]
}

export interface TableIndexOption {
    unique: boolean
    condition: string | null
}

export interface TableIndexColumn {
    name: string
}

export interface TableCheck {
    name: string | null
    expression: string
}
