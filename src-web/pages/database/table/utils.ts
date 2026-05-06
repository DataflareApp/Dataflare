import { writeClipboardText, Value, Query, QueryData, toSafeJsonValue, SafeJsonValue } from '../../../tauri'
import { writeFile } from '../../../utils/fs'
import { db, DEFAULT, EditValue } from '../db/db'
import { ColumnTransformRule, TransformRule } from '../hooks/use-column-transform'
import { Entry } from '../hooks/use-store'
import { TableData } from '../preview/hooks'
import { DEFAULT_COLUMN_WIDTH, TimestampFormatOptions, TimestampType, TimeZone } from './virtual-table'

export const copyColumnValue = (values: Value[]): Promise<void> => {
    const str = values.map((val) => displayDatabaseValue(val)).join('\n')
    return writeClipboardText(str)
}

export const enum CopyRowsFormat {
    Text = 'Text',
    Csv = 'CSV',
    CsvWithHeader = 'CSV with Header',
    Json = 'JSON',
    InsertSQL = 'INSERT SQL'
}

export const copyRowsContent = (format: CopyRowsFormat, data: QueryData, entry?: Entry): Promise<void> => {
    let content: string
    switch (format) {
        case CopyRowsFormat.Text: {
            content = ExportTable.generateText(data)
            break
        }
        case CopyRowsFormat.Csv: {
            content = ExportTable.generateCSV(data, false)
            break
        }
        case CopyRowsFormat.CsvWithHeader: {
            content = ExportTable.generateCSV(data, true)
            break
        }
        case CopyRowsFormat.Json: {
            content = ExportTable.generateJSON(data)
            break
        }
        case CopyRowsFormat.InsertSQL: {
            content = ExportTable.generateInsertSQL(data, entry)
        }
    }
    return writeClipboardText(content)
}

export const displayDatabaseValue = (value: Value): string => {
    if (value === null) {
        return 'null'
    }
    if (
        typeof value === 'string' ||
        typeof value === 'boolean' ||
        typeof value === 'number' ||
        typeof value === 'bigint'
    ) {
        return value.toString()
    }
    return db.escapeBytes(value)
}

export const enum ExportFormat {
    CSV = 'csv',
    JSON = 'json',
    SQL = 'sql'
}

export const DEFAULT_EXPORT_FORMAT = ExportFormat.CSV
export const ALL_EXPORT_FORMAT = [ExportFormat.CSV, ExportFormat.JSON, ExportFormat.SQL]

// TODO: Consider running in a Web Worker
export class ExportTable {
    public static write(path: string, data: QueryData, format: ExportFormat, entry?: Entry) {
        switch (format) {
            case ExportFormat.CSV: {
                const content = this.generateCSV(data, true)
                return writeFile(path, content)
            }
            case ExportFormat.JSON: {
                const content = this.generateJSON(data)
                return writeFile(path, content)
            }
            case ExportFormat.SQL: {
                const content = this.generateInsertSQL(data, entry)
                return writeFile(path, content)
            }
        }
    }

    static generateText(data: QueryData): string {
        const rst: string[] = []
        for (const row of data.rows) {
            const record: string[] = []
            for (const col of row) {
                record.push(displayDatabaseValue(col))
            }
            rst.push(record.join('\t'))
        }
        return rst.join('\n')
    }

    // CSV: https://datatracker.ietf.org/doc/html/rfc4180
    static generateCSV(data: QueryData, withHeader: boolean): string {
        const rst: string[] = []
        if (withHeader) {
            const header = data.columns
                .map((item) => {
                    return this.toCsvValue(item.name)
                })
                .join(',')
            rst.push(header)
        }
        for (const row of data.rows) {
            const record: string[] = []
            for (const col of row) {
                record.push(this.toCsvValue(col))
            }
            rst.push(record.join(','))
        }
        return rst.join('\n')
    }

    private static toCsvValue(value: Value): string {
        if (value === null) {
            return ''
        }
        if (typeof value === 'number' || typeof value === 'bigint') {
            return value.toString()
        }
        if (typeof value === 'boolean') {
            return value ? 'true' : 'false'
        }
        if (value instanceof Uint8Array) {
            return db.escapeBytes(value)
        }
        if (value.includes(`"`) || value.includes(`,`) || value.includes('\n')) {
            return `"${value.replace(/"/g, `""`)}"`
        }
        return value
    }

    static generateJSON(data: QueryData): string {
        let cols = data.columns.map((item) => item.name)
        let rows = data.rows.map((item) => {
            const row: Record<string, SafeJsonValue> = {}
            for (let i = 0; i < item.length; i++) {
                row[cols[i]] = toSafeJsonValue(item[i])
            }
            return row
        })
        return JSON.stringify(rows, null, 2)
    }

    static generateInsertSQL(data: QueryData, entry: Entry | undefined): string {
        if (entry === undefined) {
            return db.insertRowsSql({ schema: '', table: '' }, data)
        }
        return db.insertRowsSql(entry, data)
    }
}

const BODY_FONT_FAMILY = getComputedStyle(document.body).fontFamily
let canvas = null as HTMLCanvasElement | null
let context = null as CanvasRenderingContext2D | null

// Calculate the text width in the table header
export const calcColumnHeaderTextWidth = (column: Query['columns'][number]): number => {
    if (canvas === null) {
        canvas = document.createElement('canvas')
    }
    if (context === null) {
        context = canvas.getContext('2d')
    }
    if (context === null) {
        return DEFAULT_COLUMN_WIDTH
    }
    context.font = `14px ${BODY_FONT_FAMILY}`
    const nameWidth = context.measureText(column.name).width
    context.font = `12px ${BODY_FONT_FAMILY}`
    const datatypeWidth = context.measureText(column.datatype).width
    return Math.ceil(nameWidth + datatypeWidth)
}

export const matchTimestampRules = (
    entry: Entry | undefined,
    query: QueryData,
    rules: ColumnTransformRule[]
) => {
    if (rules.length === 0 || query.rows.length == 0 || query.columns.length === 0) {
        return undefined
    }
    const findRule = (column: string) => {
        for (const rule of rules) {
            if (rule.table !== null) {
                if (entry === undefined) {
                    continue
                }
                if (!rule.table.test(entry.table)) {
                    continue
                }
            }
            if (rule.column.test(column)) {
                return rule
            }
        }
        return null
    }
    const ruleToOptions = (rule: ColumnTransformRule): TimestampFormatOptions => {
        switch (rule.type) {
            case TransformRule.enum.MS_TO_UTC: {
                return { type: TimestampType.MS, timeZone: TimeZone.UTC }
            }
            case TransformRule.enum.MS_TO_LOCAL: {
                return { type: TimestampType.MS, timeZone: TimeZone.Local }
            }
            case TransformRule.enum.S_TO_UTC: {
                return { type: TimestampType.S, timeZone: TimeZone.UTC }
            }
            case TransformRule.enum.S_TO_LOCAL: {
                return { type: TimestampType.S, timeZone: TimeZone.Local }
            }
        }
    }
    const map = new Map<number, TimestampFormatOptions>()
    for (let i = 0; i < query.columns.length; i++) {
        const rule = findRule(query.columns[i].name)
        if (rule !== null) {
            map.set(i, ruleToOptions(rule))
        }
    }
    return map.size === 0 ? undefined : map
}

export const valueToEditValue = (value: Value): EditValue => {
    if (value === null || value instanceof Uint8Array) {
        return value
    }
    if (typeof value === 'string') {
        return {
            raw: false,
            value
        }
    }
    // number | bigint | boolean
    return {
        raw: false,
        value: value.toString()
    }
}

export const editValueToRenderedValue = (v: EditValue): Value => {
    if (v === null || v instanceof Uint8Array) {
        return v
    }
    if (v === DEFAULT) {
        return 'DEFAULT'
    }
    return v.value
}

export const editValueChanged = (before: Value, after: EditValue): boolean => {
    if (after === null) {
        return before !== null
    }
    // before's value comes from the database and will never be DEFAULT, so this should always be true
    if (after === DEFAULT) {
        return true
    }
    if (after instanceof Uint8Array) {
        return before !== after
    }
    if (!after.raw) {
        if (
            typeof before === 'string' ||
            typeof before === 'number' ||
            typeof before === 'bigint' ||
            typeof before === 'boolean'
        ) {
            return before.toString() !== after.value
        }
    }
    return true
}

// Merge changes into table data for optimistic update
export const commitChangesTable = (
    data: TableData,
    updatedCells: ReadonlyMap<number, EditValue> | undefined,
    deletedRows: ReadonlySet<number> | undefined
): TableData => {
    const table = structuredClone(data)
    if (updatedCells !== undefined && updatedCells.size > 0) {
        for (const [i, v] of updatedCells) {
            let row = Math.floor(i / table.data.columns.length)
            let col = i % table.data.columns.length
            table.data.rows[row][col] = editValueToRenderedValue(v)
        }
    }
    if (deletedRows !== undefined && deletedRows.size > 0) {
        const rows = Array.from(deletedRows).sort((a, b) => b - a)
        for (const row of rows) {
            table.data.rows.splice(row, 1)
        }
    }
    return table
}
