import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { TableCheck, TableColumn, TableIndex, db } from '../db/db'
import { useDatabaseDataType } from '../hooks/use-db'
import { useConnectedID } from '../hooks/use-store'
import { useTables } from '../hooks/use-tables'

export type Column = TableColumn & {
    id: number
}

type UpdateColumn = <K extends keyof Column>(i: number, key: K, value: Column[K]) => void
type UpdateIndex = <K extends keyof TableIndex>(i: number, key: K, value: TableIndex[K]) => void
type UpdateCheck = <K extends keyof TableCheck>(i: number, key: K, value: TableCheck[K]) => void

export interface DataUpdater {
    tableData: {
        columns: Column[]
        indexs: TableIndex[]
        checks: TableCheck[]
    }
    updateColumn: UpdateColumn
    addColumn: () => void
    deleteColumn: (i: number) => void
    setColumns: (columns: Column[]) => void
    updateIndex: UpdateIndex
    addIndex: () => void
    deleteIndex: (i: number) => void
    updateCheck: UpdateCheck
    addCheck: () => void
    deleteCheck: (i: number) => void
}

const defaultColumn = (columnID: number, datatypes: string[]): Column => {
    return {
        id: columnID,
        name: 'id',
        datatype: datatypes[0],
        defaultValue: null,
        primaryKey: true,
        notNull: true,
        unique: false,
        foreignKeys: []
    }
}

export const useNewTableData = (): DataUpdater => {
    const datatypes = useDatabaseDataType()
    const columnID = useRef(0)
    const [columns, setColumns] = useState<Column[]>(() => {
        return datatypes.length === 0 ? [] : [defaultColumn(columnID.current, datatypes)]
    })
    const [indexs, setIndexs] = useState<TableIndex[]>([])
    const [checks, setChecks] = useState<TableCheck[]>([])

    // If datatypes are loaded for the first time, the initializer won't add a default column
    // Need to add it here
    useEffect(() => {
        if (datatypes.length === 0 || columns.length !== 0) return
        setColumns([defaultColumn(columnID.current, datatypes)])
    }, [datatypes])

    const updateColumn: UpdateColumn = (i, key, value) => {
        const newColumns = [...columns]
        newColumns[i][key] = value
        setColumns(newColumns)
    }

    const addColumn = () => {
        columnID.current += 1
        setColumns([
            ...columns,
            {
                id: columnID.current,
                name: '',
                datatype: '',
                defaultValue: null,
                primaryKey: false,
                notNull: false,
                unique: false,
                foreignKeys: []
            }
        ])
    }

    const deleteColumn = (i: number) => {
        const newColumns = [...columns]
        newColumns.splice(i, 1)
        setColumns(newColumns)
    }

    const updateIndex: UpdateIndex = (i, key, value) => {
        const newColumns = [...indexs]
        newColumns[i][key] = value
        setIndexs(newColumns)
    }

    const addIndex = () => {
        setIndexs([
            ...indexs,
            {
                name: null,
                option: {
                    unique: false,
                    condition: null
                },
                columns: []
            }
        ])
    }

    const deleteIndex = (i: number) => {
        const newIndexs = [...indexs]
        newIndexs.splice(i, 1)
        setIndexs(newIndexs)
    }

    const updateCheck: UpdateCheck = (i, key, value) => {
        const newChecks = [...checks]
        newChecks[i][key] = value
        setChecks(newChecks)
    }

    const addCheck = () => {
        setChecks([
            ...checks,
            {
                name: null,
                expression: ''
            }
        ])
    }

    const deleteCheck = (i: number) => {
        const newChecks = [...checks]
        newChecks.splice(i, 1)
        setChecks(newChecks)
    }

    return {
        tableData: {
            columns,
            indexs,
            checks
        },
        updateColumn,
        addColumn,
        deleteColumn,
        setColumns,
        updateIndex,
        addIndex,
        deleteIndex,
        updateCheck,
        addCheck,
        deleteCheck
    }
}

// Column suggestions for foreign keys
export const useTableColumns = (schema: string, table: string) => {
    const { data: tables } = useTables()
    const connectedID = useConnectedID()
    const key = useMemo(() => {
        if (connectedID !== null && tables !== undefined && schema !== '' && table !== '') {
            const has = (tables[schema] ?? []).some((item) => item.name === table)
            if (has) {
                return ['new-table-columns', connectedID, schema, table] as const
            }
        }
        return null
    }, [connectedID, tables, schema, table])
    return useSWR(key, async () => {
        const cols = await db.tableColumnsInfo(schema, table)
        return cols.map((item) => item.name)
    })
}

// Column suggestions for indexes
export const useIndexColumnSuggestions = (columns: TableColumn[]) => {
    return useMemo(() => {
        return columns
            .map((item) => item.name)
            .filter((item, index, arr) => {
                return item !== '' && arr.indexOf(item, 0) === index
            })
    }, [columns])
}
