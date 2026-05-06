import { IconTableOptions } from '@tabler/icons-react'
import { useMemo, useState, memo, useCallback, useEffect } from 'react'
import { useScrollUtils } from '../../../hooks/use-scroll'
import { useShortcutMeta } from '../../../hooks/use-shortcut'
import { useTranslation } from '../../../i18n'
import { Value } from '../../../tauri'
import { Button, RefreshButton, showMessageBox, Direction, Persistent, Pin, SplitView } from '../../../ui'
import { isMacOS } from '../../../utils/os'
import { EditValue, ForeignKey, InsertRowData, TableType, db } from '../db/db'
import { useReadonly } from '../hooks/use-db'
import { TabType, Entry, TabData, useTabsStore } from '../hooks/use-store'
import { Table } from '../table'
import { TableFooter } from '../table/footer'
import { commitChangesTable, valueToEditValue } from '../table/utils'
import { ColumnsFilter } from './columns'
import { Commit } from './commit'
import { DataGeneration } from './data-generation'
import { EditRowButton, EditData, EditType, EditRow } from './edit-row'
import { useTableRowsCount, useTableRows, useTableColumns, usePreviewListener, useForeignKeys } from './hooks'
import { Pagination } from './pagination'
import { Preview } from './preview'
import { ColumnsSort, Sort } from './sort'
import {
    PreviewEventData,
    PreviewEventType,
    previewListener,
    LimitStorage,
    whereItems,
    mergeSelectedSet
} from './utils'
import { Where } from './where'

interface Props {
    hidden: boolean
    entry: Entry
    type: TableType
}

export const TablePreview = memo((props: Props) => {
    const [defaultLimit, setDefaultLimit] = useState<number | null>(null)

    useEffect(() => {
        LimitStorage.get(props.entry).then(setDefaultLimit)
    }, [props.entry])

    if (defaultLimit === null) {
        return null
    }

    return <TablePreviewInner {...props} defaultLimit={defaultLimit} />
})

export const TablePreviewInner = ({
    entry,
    hidden,
    type,
    defaultLimit
}: Props & { defaultLimit: number }) => {
    const { t } = useTranslation()
    const readonly = useReadonly()

    const switchTabTo = useTabsStore((state) => state.switchTabTo)
    const tabExist = useTabsStore((state) => state.tabExist)

    const tableRef = useScrollUtils()
    const editRowRef = useScrollUtils()

    // WHERE
    const [whereSql, setWhereSql] = useState('')
    // LIMIT
    const [limit, setLimit] = useState(defaultLimit)
    // OFFSET
    const [page, setPage] = useState(1)
    const offset = (page - 1) * limit
    // Sort
    const [sortColumn, setSortColumn] = useState<Sort | null>(null)
    // Columns
    const [selectedColumns, setSelectedColumns] = useState<string[] | null>(null)
    // Edit row / Insert row
    const [editRowData, setEditRowData] = useState<EditData | null>(null)
    // Deleted rows
    const [deletedRows, setDeletedRows] = useState<ReadonlySet<number>>()
    // Updated cells
    const [updatedCells, setUpdatedCells] = useState<ReadonlyMap<number, EditValue>>()

    // SQL
    const [sql, exportAllRowsSQL] = useMemo(() => {
        const sql = db.queryTableSql(entry, { limit, offset }, whereSql, selectedColumns, sortColumn)
        const exportSql = db.queryTableSql(entry, null, whereSql, selectedColumns, sortColumn)
        return [sql, exportSql]
    }, [entry, limit, page, whereSql, selectedColumns, sortColumn])

    const { isValidating, mutate: refreshRows, data: tableData, error: tableError } = useTableRows(sql)

    // prettier-ignore
    const { data: columnsData, mutate: refreshColumns, isValidating: columnsIsValidating, error: columnsError } = useTableColumns(entry)

    const primaryKeys = useMemo(() => {
        return columnsData?.filter((item) => item.primaryKey).map((item) => item.name)
    }, [columnsData])

    // prettier-ignore
    const { data: count, mutate: refreshCount, isValidating: countIsValidating, error: countError } = useTableRowsCount(entry, whereSql)

    // prettier-ignore
    const { data: foreignKeys, mutate: refreshForeignKeys, isValidating: foreignKeysIsValidating, error: foreignKeysError } = useForeignKeys(entry)

    const errors = useMemo(() => {
        const list = [
            { title: 'Columns', message: columnsError, loading: columnsIsValidating },
            {
                title: 'Foreign keys',
                message: foreignKeysError,
                loading: foreignKeysIsValidating
            },
            { title: 'Rows count', message: countError, loading: countIsValidating }
        ].filter((item) => {
            return !item.loading && item.message !== undefined
        })
        return list
    }, [
        columnsIsValidating,
        columnsError,
        foreignKeysIsValidating,
        foreignKeysError,
        countIsValidating,
        countError
    ])

    const onUpdateWhere = useCallback((val: string) => {
        setPage(1)
        setWhereSql(val)
    }, [])

    const refreshAll = useCallback(() => {
        setDeletedRows(undefined)
        setUpdatedCells(undefined)
        refreshRows()
        refreshColumns()
        refreshForeignKeys()
        refreshCount()
    }, [])

    const listener = useCallback(
        (data: PreviewEventData) => {
            switch (data.type) {
                case PreviewEventType.Refresh:
                    refreshAll()
                    break
                case PreviewEventType.SetSearch:
                    onUpdateWhere(data.searchValue)
                    setDeletedRows(undefined)
                    setUpdatedCells(undefined)
                    refreshRows()
                    refreshCount()
                    break
            }
        },
        [entry]
    )
    usePreviewListener(entry, listener)

    const onClickEditRowButton = () => {
        setEditRowData(editRowData === null ? { type: EditType.Insert, values: {} } : null)
    }

    useShortcutMeta(
        'i',
        (_, shift) => {
            !shift && onClickEditRowButton()
        },
        hidden
    )

    // Column sorting
    if (sortColumn !== null) {
        if (columnsData === undefined) {
            setSortColumn(null)
        } else {
            const allColumns = columnsData.map((item) => item.name)
            if (!allColumns.includes(sortColumn.name)) {
                setSortColumn(null)
            }
        }
    }
    // Column filtering
    if (selectedColumns !== null) {
        if (columnsData === undefined) {
            setSelectedColumns(null)
        } else {
            const allColumns = columnsData.map((item) => item.name)
            const all = selectedColumns.every((item) => allColumns.includes(item))
            if (!all || allColumns.length === selectedColumns.length) {
                setSelectedColumns(null)
            }
        }
    }
    // deletedRows / updatedCells bounds check
    if (tableData !== undefined) {
        if (deletedRows !== undefined && deletedRows.size > 0) {
            const max = Math.max(...deletedRows)
            if (max >= tableData.data.rows.length) {
                setDeletedRows(undefined)
            }
        }
        if (updatedCells !== undefined && updatedCells.size > 0) {
            const maxRow = tableData.data.rows.length
            const maxCol = tableData.data.columns.length
            const i = Math.max(...updatedCells.keys())
            const row = Math.floor(i / maxCol)
            const col = i % maxCol
            if (row >= maxRow || col >= maxCol) {
                setUpdatedCells(undefined)
            }
        }
    }

    const onDeleteRows = useCallback(
        (indexs: ReadonlySet<number>) => {
            setDeletedRows(mergeSelectedSet(deletedRows, indexs))
        },
        [deletedRows]
    )

    // Update cell data
    const onUpdateCell = useCallback(
        (index: number, newValue: EditValue | undefined) => {
            const map = new Map(updatedCells)
            if (newValue === undefined) {
                map.delete(index)
            } else {
                map.set(index, newValue)
            }
            setUpdatedCells(map)
        },
        [updatedCells]
    )

    // Copy row / Edit row
    const onEditRow = useCallback(
        (rowIndex: number, type: EditType) => {
            if (tableData === undefined) {
                return
            }
            const values: InsertRowData = {}
            const { rows, columns } = tableData.data
            rows[rowIndex].forEach((val, col) => {
                values[columns[col].name] = valueToEditValue(val)
            })
            if (type === EditType.Insert) {
                setEditRowData({
                    type,
                    values
                })
                return
            }
            try {
                if (primaryKeys === undefined) {
                    throw t('primaryKeyNotFound')
                }
                setEditRowData({
                    type,
                    where: whereItems(rowIndex, primaryKeys, tableData.data),
                    oldValue: values,
                    values
                })
            } catch (err: any) {
                showMessageBox(t('error'), err, 'error')
            }
        },
        [tableData, primaryKeys]
    )

    // Click foreign key
    const onClickForeignKey = useCallback(
        (fk: ForeignKey, value: Value) => {
            const toTab: TabData = {
                type: TabType.Preview,
                entry: fk.toTable,
                // NOTE: Currently navigating directly to the table, but cannot guarantee the foreign key doesn't reference a view
                tableType: TableType.Table
            }
            const searchValue = db.whereSearchSQL(fk.toColumn, value)
            if (tabExist(toTab)) {
                previewListener.send(fk.toTable, {
                    type: PreviewEventType.SetSearch,
                    searchValue
                })
            } else {
                const id = previewListener.listen(fk.toTable, (e) => {
                    if (e.type === PreviewEventType.Listen) {
                        previewListener.send(fk.toTable, {
                            type: PreviewEventType.SetSearch,
                            searchValue
                        })
                        previewListener.remove(id)
                    }
                })
            }
            switchTabTo(toTab)
        },
        [tabExist]
    )

    const onEditRowSuccess = () => {
        setEditRowData(null)
        refreshAll()
    }

    if (hidden) {
        return null
    }

    const saveColumnSizeID = `${entry.schema}.${entry.table}`

    const onSwitchPage = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!(isMacOS ? e.metaKey : e.ctrlKey)) {
            return
        }
        switch (e.key.toLowerCase()) {
            case 'arrowleft': {
                e.preventDefault()
                setPage(e.shiftKey ? 1 : Math.max(1, page - 1))
                break
            }
            case 'arrowright': {
                e.preventDefault()
                setPage(e.shiftKey ? Math.max(Math.ceil((count ?? 0) / limit), 1) : page + 1)
                break
            }
        }
    }

    // prettier-ignore
    const showCommit = tableData !== undefined && ((deletedRows !== undefined && deletedRows.size > 0) || (updatedCells !== undefined && updatedCells.size > 0))

    const onCommitSuccess = () => {
        if (tableData !== undefined) {
            const data = commitChangesTable(tableData, updatedCells, deletedRows)
            refreshRows(data, { revalidate: false })
        }
        refreshAll()
    }

    return (
        <>
            <div className='flex h-11 min-w-max shrink-0 items-center gap-2 border-b border-separator px-4'>
                <Where value={whereSql} onChange={onUpdateWhere} columns={columnsData} />
                <RefreshButton refreshing={isValidating} onRefresh={refreshAll} />
                <ColumnsSort columns={columnsData} sort={sortColumn} onChange={setSortColumn} />
                <ColumnsFilter
                    columns={columnsData}
                    selected={selectedColumns}
                    onChange={(val) => setSelectedColumns(val)}
                />
                {type === TableType.Table && (
                    <Button
                        title={t('editTable')}
                        onClick={() =>
                            switchTabTo({
                                type: TabType.Edit,
                                entry
                            })
                        }
                    >
                        <IconTableOptions size={16} stroke={1.5} />
                    </Button>
                )}
                <EditRowButton
                    type={editRowData?.type ?? EditType.Insert}
                    primary={editRowData !== null}
                    onClick={onClickEditRowButton}
                />
                <DataGeneration columns={columnsData} entry={entry} onRefresh={refreshAll} />
                <Preview sql={sql} />
            </div>
            <SplitView
                className='flex-1 overflow-hidden'
                direction={Direction.Horizontal}
                pin={Pin.Last}
                minPinSize={172}
                defaultPinSize={250}
                maxPinSize={500}
                id='InsertRow'
                persistent={Persistent.Permanent}
            >
                <div
                    className='relative flex h-full flex-col'
                    // TODO: Ideally events should be handled inside Table; currently this adds a second focus target alongside Table
                    // If only this div has focus, keyboard events won't propagate into Table
                    tabIndex={0}
                    onKeyDown={onSwitchPage}
                >
                    <Table
                        entry={entry}
                        elementRef={tableRef}
                        saveColumnSizeID={saveColumnSizeID}
                        data={tableData?.data}
                        readonly={readonly}
                        error={tableError?.error}
                        startNumber={offset + 1}
                        deletedRows={deletedRows}
                        updatedCells={updatedCells}
                        sort={sortColumn}
                        primaryKeys={primaryKeys}
                        onDeleteRows={onDeleteRows}
                        onUpdateCell={onUpdateCell}
                        onChangeSort={setSortColumn}
                        onEditRow={onEditRow}
                        foreignKeys={foreignKeys?.foreignKeys}
                        reverseForeignKeys={foreignKeys?.reverseForeignKeys}
                        onClickForeignKey={onClickForeignKey}
                        setWhereSql={onUpdateWhere}
                    />

                    <TableFooter
                        duration={isValidating ? undefined : tableData?.data.duration}
                        queryTime={isValidating ? undefined : tableError?.queryTime || tableData?.queryTime}
                        rowCount={count}
                        colCount={tableData?.data.columns.length}
                        entry={entry}
                        tableData={isValidating ? undefined : tableData?.data}
                        exportAllRowsSQL={exportAllRowsSQL}
                        errors={errors}
                    >
                        <Pagination
                            page={page}
                            limit={limit}
                            rowCount={count}
                            onChange={(page, limit) => {
                                setPage(page)
                                setLimit(limit)
                                LimitStorage.set(entry, limit)
                            }}
                        />
                    </TableFooter>

                    {showCommit && (
                        <Commit
                            entry={entry}
                            data={tableData.data}
                            primaryKeys={primaryKeys}
                            deleted={deletedRows}
                            updated={updatedCells}
                            onDiscard={() => {
                                setDeletedRows(undefined)
                                setUpdatedCells(undefined)
                            }}
                            onCommitSuccess={onCommitSuccess}
                        />
                    )}
                </div>
                {editRowData !== null && columnsData !== undefined && (
                    <EditRow
                        ref={editRowRef}
                        saveColumnSizeID={saveColumnSizeID}
                        entry={entry}
                        data={editRowData}
                        onChangeData={setEditRowData}
                        columns={columnsData}
                        onEditSuccess={onEditRowSuccess}
                    />
                )}
            </SplitView>
        </>
    )
}
