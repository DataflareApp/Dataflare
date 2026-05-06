import { IconArrowBackUp, IconChevronDown, IconChevronUp, IconKey } from '@tabler/icons-react'
import { RefCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '../../../i18n'
import {
    Query,
    QueryData,
    readClipboardText,
    SettingsTab,
    showContextMenu,
    showSettingsWindow,
    Value,
    writeClipboardText
} from '../../../tauri'
import {
    DropdownMenu,
    DropdownMenuItem,
    ErrorMessage,
    IconButton,
    Loading,
    Popover,
    ScrollView
} from '../../../ui'
import { db } from '../db/db'
import { DEFAULT, EditValue, FilterData, FilterType, ForeignKey, ForeignKeys } from '../db/db-types'
import { useBytesFormat } from '../hooks/use-bytes-format'
import { useColumnTransformStore } from '../hooks/use-column-transform'
import { DEFAULT_FONT_FAMILY } from '../hooks/use-sql-editor-options'
import { Entry } from '../hooks/use-store'
import { EditType } from '../preview/edit-row'
import { Sort, SortType } from '../preview/sort'
import { CellEditor } from './cell-editor'
import { getSavedSize, ResizeView, saveSize, SizeMap } from './resize'
import {
    calcColumnHeaderTextWidth,
    copyColumnValue,
    copyRowsContent,
    CopyRowsFormat,
    displayDatabaseValue,
    editValueChanged,
    matchTimestampRules,
    valueToEditValue
} from './utils'
import {
    Cell,
    DEFAULT_COLUMN_WIDTH,
    DEFAULT_INDEX_WIDTH,
    MIN_COLUMN_WIDTH,
    Rect,
    VirtualTable
} from './virtual-table'

export interface TableProps {
    entry?: Entry
    readonly: boolean
    error: string | undefined
    data: QueryData | undefined
    startNumber?: number
    reserveSizeY?: number
    primaryKeys?: string[]
    deletedRows?: ReadonlySet<number>
    updatedCells?: ReadonlyMap<number, EditValue>
    onDeleteRows?: (rows: ReadonlySet<number>) => void
    onUpdateCell?: (index: number, value: EditValue | undefined) => void
    saveColumnSizeID: string
    sort?: Sort | null
    onChangeSort?: (sort: Sort | null) => void
    onEditRow?: (rowIndex: number, type: EditType) => void
    foreignKeys?: ForeignKeys
    reverseForeignKeys?: ForeignKeys
    onClickForeignKey?: (fk: ForeignKey, value: Value) => void
    setWhereSql?: (sql: string) => void
    elementRef?: RefCallback<HTMLDivElement>
}

type TableOptions = Omit<TableProps, 'data'> & {
    data: QueryData
}

export const Table = (props: TableProps) => {
    if (props.error !== undefined) {
        return <ErrorMessage text={props.error} />
    }

    if (props.data === undefined) {
        return <Loading />
    }

    return <TableImpl {...(props as TableOptions)} />
}

const TableImpl = ({
    entry,
    readonly,
    data,
    startNumber,
    reserveSizeY,
    deletedRows,
    updatedCells,
    saveColumnSizeID,
    sort,
    primaryKeys,
    onDeleteRows,
    onUpdateCell,
    onChangeSort,
    onEditRow,
    foreignKeys,
    reverseForeignKeys,
    onClickForeignKey,
    setWhereSql,
    elementRef
}: TableOptions) => {
    const { t, tableNumberUtil, language } = useTranslation()
    const { bytesFormat } = useBytesFormat()
    const rules = useColumnTransformStore((state) => state.rules)

    const headerRef = useRef<HTMLDivElement | null>(null)
    const tableRef = useRef<HTMLDivElement | null>(null)
    const table = useRef<VirtualTable>()

    const [columnSizes, setColumnSizes] = useState(() => getSavedSize(saveColumnSizeID))

    const defaultColumns = useMemo(() => {
        return [
            { name: '#', defaultSize: DEFAULT_INDEX_WIDTH, minSize: DEFAULT_INDEX_WIDTH },
            ...data.columns.map((item) => {
                const primaryKeyWidth = primaryKeys?.includes(item.name) ? 16 + 8 : 0 // icon: 16 margin-left: 8
                const textWidth = calcColumnHeaderTextWidth(item) + 8 * 3 // padding-left + gap + padding-right
                return {
                    name: item.name,
                    defaultSize: Math.max(primaryKeyWidth + textWidth, DEFAULT_COLUMN_WIDTH),
                    minSize: MIN_COLUMN_WIDTH
                }
            })
        ]
    }, [data.columns, primaryKeys])

    useEffect(() => {
        if (tableRef.current === null) {
            return
        }
        table.current = new VirtualTable(tableRef.current, {
            monospaceFont: DEFAULT_FONT_FAMILY,
            reserveSizeY,
            columnSizes: {
                changed: columnSizes,
                defaultWidth: defaultColumns.map((c) => c.defaultSize)
            },
            query: data
        })
        table.current.onChangeColumnSizes = (sizes) => {
            setColumnSizes(sizes)
            saveSize(saveColumnSizeID, sizes)
        }
        table.current.onScrollHorizontal = (left) => {
            if (headerRef.current) {
                headerRef.current.scrollLeft = left
            }
        }
        elementRef?.(tableRef.current)
        return () => {
            table.current?.destroy()
        }
    }, [])

    useEffect(() => {
        table.current?.updateColumnSizes({
            changed: columnSizes,
            defaultWidth: defaultColumns.map((c) => c.defaultSize)
        })
    }, [columnSizes, defaultColumns])

    const timestampColumns = useMemo(() => {
        return matchTimestampRules(entry, data, rules)
    }, [entry, data.columns, rules])

    useEffect(() => {
        table.current?.updateQuery(data)
        table.current?.updateForeignKeys(foreignKeys)
        table.current?.updateReverseForeignKeys(reverseForeignKeys)
        table.current?.updateStartNumber(startNumber)
        table.current?.updateNoRowsText(t('noRows'))
        table.current?.updateBytesFormat(bytesFormat)
        table.current?.updateNumberFormat(tableNumberUtil)
        table.current?.updateTimestampColumns(timestampColumns)
        table.current?.updateDeletedRows(deletedRows)
        table.current?.updateUpdatedCells(updatedCells)
    }, [
        data,
        foreignKeys,
        reverseForeignKeys,
        startNumber,
        language,
        tableNumberUtil,
        bytesFormat,
        timestampColumns,
        deletedRows,
        updatedCells
    ])

    type FkState = {
        x: number
        y: number
        cell: Cell
        fk: ForeignKeys[keyof ForeignKeys]
    }
    const [fkState, setFkState] = useState<FkState | null>(null)

    type CellState = Rect & {
        cell: Cell
        index: number
        discard: boolean
        datatype: string
        value: EditValue
    }
    const [cellState, setCellState] = useState<CellState | null>(null)

    useEffect(() => {
        if (!table.current) {
            return
        }

        const onCellCopy = (cell: Cell) => {
            const value = data.rows[cell.row][cell.col]
            writeClipboardText(displayDatabaseValue(value))
        }

        const onRowsCopy = (format: CopyRowsFormat) => {
            if (table.current) {
                const rows = table.current.getSelectedRowsArray().map((i) => data.rows[i])
                copyRowsContent(format, { ...data, rows }, entry)
            }
        }

        const _onDeleteRows = onDeleteRows
            ? () => {
                  if (readonly) {
                      return
                  }
                  const rows = table.current?.getSelectedRowsSet()
                  if (rows === undefined || rows.size === 0) {
                      return
                  }
                  onDeleteRows(rows)
              }
            : undefined

        table.current.onCellCopy = onCellCopy

        table.current.onRowsCopy = () => onRowsCopy(CopyRowsFormat.Text)

        table.current.onRowsDelete = _onDeleteRows

        table.current.onRowView = onEditRow ? (i) => onEditRow(i, EditType.Update) : undefined

        table.current.onForeignKeyClick = onClickForeignKey
            ? (cell, { x, y, height }, fk) => {
                  if (fk.length === 1) {
                      onClickForeignKey(fk[0], data.rows[cell.row][cell.col])
                      return
                  }
                  setFkState({ x, y: y + height, cell, fk })
              }
            : undefined

        table.current.onCellView = (cell) => {
            const rect = table.current?.getCellPosition(cell)
            if (!tableRef.current || !rect) {
                return
            }
            const index = cell.row * data.columns.length + cell.col
            const editValue = updatedCells?.get(index)
            // prettier-ignore
            const value = editValue !== undefined ? editValue : valueToEditValue(data.rows[cell.row][cell.col])
            setCellState({
                x: Math.min(Math.max(rect.x, 6), tableRef.current.clientWidth - 6),
                y: Math.min(Math.max(rect.y + rect.height, 6), tableRef.current.clientHeight - 6),
                width: rect.width,
                height: rect.height,
                cell,
                index,
                discard: editValue !== undefined,
                datatype: data.columns[cell.col].datatype,
                value
            })
        }

        table.current.onContextMenu = (cell: Cell) => {
            const colName = data.columns[cell.col].name
            const value = data.rows[cell.row][cell.col]
            const filter = (data: FilterData) => {
                setWhereSql!(db.tableFilterSQL(colName, data))
            }
            const onCopyColumns = () => {
                const rows = table.current?.getSelectedRowsArray() ?? []
                const values = rows.map((i) => data.rows[i][cell.col])
                copyColumnValue(values)
            }
            const updateIndex = cell.row * data.columns.length + cell.col
            const singleRowSelected = table.current?.getSelectedRowsSet().size === 1
            showContextMenu([
                {
                    label: t('copyCell'),
                    onClick: () => onCellCopy(cell)
                },
                {
                    label: t('copyRowsAs'),
                    subitems: [
                        {
                            label: CopyRowsFormat.Text,
                            onClick: () => onRowsCopy(CopyRowsFormat.Text)
                        },
                        {
                            separator: true,
                            label: CopyRowsFormat.Csv,
                            onClick: () => onRowsCopy(CopyRowsFormat.Csv)
                        },
                        {
                            label: CopyRowsFormat.CsvWithHeader,
                            onClick: () => onRowsCopy(CopyRowsFormat.CsvWithHeader)
                        },
                        {
                            separator: true,
                            label: CopyRowsFormat.Json,
                            onClick: () => onRowsCopy(CopyRowsFormat.Json)
                        },
                        {
                            separator: true,
                            label: CopyRowsFormat.InsertSQL,
                            onClick: () => onRowsCopy(CopyRowsFormat.InsertSQL)
                        }
                    ]
                },
                {
                    label: t('copyColumnValues'),
                    onClick: onCopyColumns
                },
                {
                    label: t('filter'),
                    separator: true,
                    hidden: setWhereSql === undefined,
                    subitems: [
                        {
                            label: t('fromCipboard'),
                            async onClick() {
                                const v = await readClipboardText()
                                if (typeof v === 'string' && v.length > 0) {
                                    filter({
                                        type: FilterType.Equal,
                                        value: await readClipboardText()
                                    })
                                }
                            }
                        },
                        {
                            separator: true,
                            label: 'IS NULL',
                            onClick: () => filter({ type: FilterType.IsNull })
                        },
                        {
                            label: 'IS NOT NULL',
                            onClick: () => filter({ type: FilterType.IsNotNull })
                        },
                        {
                            label: '=',
                            separator: true,
                            onClick: () =>
                                filter({
                                    type: FilterType.Equal,
                                    value: value
                                })
                        },
                        {
                            label: '!=',
                            onClick: () =>
                                filter({
                                    type: FilterType.NotEqual,
                                    value: value
                                })
                        },
                        {
                            label: '>',
                            onClick: () =>
                                filter({
                                    type: FilterType.GreaterThan,
                                    value: value
                                })
                        },
                        {
                            label: '>=',
                            onClick: () =>
                                filter({
                                    type: FilterType.GreaterThanOrEqual,
                                    value: value
                                })
                        },
                        {
                            label: '<',
                            onClick: () =>
                                filter({
                                    type: FilterType.LessThan,
                                    value: value
                                })
                        },
                        {
                            label: '<=',
                            onClick: () =>
                                filter({
                                    type: FilterType.LessThanOrEqual,
                                    value: value
                                })
                        }
                        // TODO: LIKE / NOT LIKE / LIKE `prefix` / LIKE `suffix`
                    ]
                },
                {
                    label: t('updateCellAs'),
                    separator: true,
                    hidden: onUpdateCell === undefined,
                    disabled: readonly,
                    subitems: [
                        {
                            label: 'Null',
                            onClick: () => onUpdateCell!(updateIndex, null)
                        },
                        {
                            label: 'Default',
                            onClick: () => onUpdateCell!(updateIndex, DEFAULT)
                        },
                        {
                            label: 'Empty',
                            separator: true,
                            // prettier-ignore
                            onClick: () => onUpdateCell!(updateIndex, { raw: false, value: '' })
                        }
                    ]
                },
                {
                    label: t('editRow'),
                    hidden: onEditRow === undefined,
                    separator: true,
                    disabled: readonly,
                    onClick: () => onEditRow!(cell.row, EditType.Update)
                },
                {
                    label: t('duplicateRow'),
                    hidden: onEditRow === undefined,
                    disabled: readonly,
                    onClick: () => onEditRow!(cell.row, EditType.Insert)
                },
                {
                    label: singleRowSelected ? t('deleteRow') : t('deleteRows'),
                    hidden: _onDeleteRows === undefined,
                    separator: true,
                    disabled: readonly,
                    onClick: _onDeleteRows!
                }
            ])
        }
    }, [entry, readonly, data, setWhereSql, onUpdateCell, onDeleteRows, onEditRow, onClickForeignKey])

    const onClickHeader = (columnName: string) => {
        if (onChangeSort === undefined) {
            return
        }
        if (sort === null || sort?.name !== columnName) {
            return onChangeSort({
                name: columnName,
                type: SortType.Ascending
            })
        }
        if (sort.type === SortType.Ascending) {
            return onChangeSort({
                name: columnName,
                type: SortType.Descending
            })
        }
        onChangeSort(null)
    }

    const onHeaderContextMenu = (
        e: React.MouseEvent<HTMLDivElement>,
        column: Query['columns'][number],
        i: number
    ) => {
        e.stopPropagation()
        e.preventDefault()
        const updateColumnWidth = (minimum: boolean) => {
            let width = MIN_COLUMN_WIDTH
            if (!minimum) {
                width = table.current?.getColumnContentSize(i) ?? DEFAULT_COLUMN_WIDTH
            }
            const values = { ...columnSizes, [data.columns[i].name]: width }
            setColumnSizes(values)
            saveSize(saveColumnSizeID, values)
        }
        showContextMenu(
            [
                {
                    label: t('copyColumnName'),
                    onClick: () => writeClipboardText(column.name)
                },
                {
                    label: t('copyDataType'),
                    disabled: column.datatype === '',
                    onClick: () => writeClipboardText(column.datatype)
                },
                {
                    separator: true,
                    label: t('columnTransform'),
                    onClick: () => showSettingsWindow(SettingsTab.Table)
                },
                {
                    label: t('resizeColumnToFixContent'),
                    separator: true,
                    onClick: () => updateColumnWidth(false)
                },
                {
                    label: t('resizeColumnToMinimum'),
                    onClick: () => updateColumnWidth(true)
                },
                // TODO: Hidden Column
                {
                    label: t('sortNone'),
                    hidden: onChangeSort === undefined,
                    disabled: sort === null || (sort?.type === undefined && column.name === sort?.name),
                    separator: true,
                    onClick: () => onChangeSort!(null)
                },
                {
                    label: t('sortAscending'),
                    hidden: onChangeSort === undefined,
                    disabled: column.name === sort?.name && sort?.type === SortType.Ascending,
                    onClick: () =>
                        onChangeSort!({
                            name: column.name,
                            type: SortType.Ascending
                        })
                },
                {
                    label: t('sortDescending'),
                    hidden: onChangeSort === undefined,
                    disabled: column.name === sort?.name && sort?.type === SortType.Descending,
                    onClick: () =>
                        onChangeSort!({
                            name: column.name,
                            type: SortType.Descending
                        })
                }
            ],
            () => {
                table.current?.focus()
            }
        )
    }

    const onHeaderChangeSize = (sizes: SizeMap) => {
        setColumnSizes(sizes)
        table.current?.focus()
    }

    if (table.current) {
        if (cellState !== null || fkState !== null) {
            if (
                table.current.getQuery() !== data ||
                table.current.getForeignKeys() !== foreignKeys ||
                table.current.getReverseForeignKeys() !== reverseForeignKeys
            ) {
                setCellState(null)
                setFkState(null)
            }
        }
        table.current.onCellPositionChange = cellState
            ? () => {
                  const rect = table.current?.getCellPosition({ ...cellState.cell })
                  if (!tableRef.current || !rect) {
                      setCellState(null)
                      return
                  }
                  setCellState({
                      ...cellState,
                      x: Math.min(Math.max(rect.x, 6), tableRef.current.clientWidth - 6),
                      y: Math.min(Math.max(rect.y + rect.height, 6), tableRef.current.clientHeight - 6)
                  })
              }
            : undefined
    }

    return (
        <div className='relative flex flex-1 flex-col overflow-hidden'>
            <ResizeView
                ref={headerRef}
                columns={defaultColumns}
                sizes={columnSizes}
                onChangeSize={onHeaderChangeSize}
                saveName={saveColumnSizeID}
            >
                <div className='px-2 leading-8'>
                    <span className='text-sm text-quarternary'>#</span>
                </div>
                {data.columns.map((item, i) => {
                    return (
                        <div
                            key={i}
                            className='flex items-center'
                            onContextMenu={(e) => onHeaderContextMenu(e, item, i)}
                            onClick={() => onClickHeader(item.name)}
                        >
                            {primaryKeys?.includes(item.name) && (
                                <IconKey size={16} stroke={1.5} className='ml-2 text-yellow-600' />
                            )}
                            <div
                                title={`${item.name} [${item.datatype}]`}
                                className='flex-1 truncate px-2 leading-8 text-quarternary'
                            >
                                <span className='mr-2 text-sm text-primary'>{item.name}</span>
                                <span className='text-xs'>{item.datatype}</span>
                            </div>
                            {onChangeSort !== undefined && sort?.name === item.name && (
                                <ColumnSortIcon type={sort.type} />
                            )}
                        </div>
                    )
                })}
            </ResizeView>

            <div className='relative min-h-0 flex-1'>
                <div ref={tableRef} />
            </div>

            {cellState !== null && (
                <Popover
                    sideOffset={-4}
                    open
                    anchor={
                        <div
                            style={{
                                position: 'absolute',
                                left: cellState.x,
                                top: cellState.y,
                                width: cellState.width,
                                height: cellState.height
                            }}
                        />
                    }
                    onOpenChange={() => {
                        setCellState(null)
                        table.current?.focus()
                    }}
                >
                    <CellEditor
                        readonly={readonly || onUpdateCell === undefined}
                        savedCellSizeID={`CellEditor-${saveColumnSizeID}.${data.columns[cellState.cell.col].name}`}
                        datatype={cellState.datatype}
                        originValue={data.rows[cellState.cell.row][cellState.cell.col]}
                        editValue={cellState.value}
                        onClose={() => setCellState(null)}
                        onSubmit={(val) => {
                            // prettier-ignore
                            const { cell: { row, col }, index } = cellState
                            if (editValueChanged(data.rows[row][col], val)) {
                                onUpdateCell!(index, val)
                            } else if (updatedCells?.has(index)) {
                                onUpdateCell!(index, undefined)
                            }
                            table.current?.focus()
                        }}
                    >
                        {cellState.discard && (
                            <IconButton
                                title={t('discardChanges')}
                                onClick={() => {
                                    setCellState(null)
                                    onUpdateCell?.(cellState.index, undefined)
                                }}
                            >
                                <IconArrowBackUp size={16} strokeWidth={1.5} />
                            </IconButton>
                        )}
                    </CellEditor>
                </Popover>
            )}

            {fkState !== null && onClickForeignKey !== undefined && (
                <DropdownMenu
                    open
                    onOpenChange={() => {
                        setFkState(null)
                        setTimeout(() => table.current?.focus())
                    }}
                    sideOffset={0}
                    trigger={
                        <div
                            style={{
                                position: 'fixed',
                                left: fkState.x,
                                top: fkState.y
                            }}
                        />
                    }
                    className='!p-0'
                >
                    <ScrollView axis='y' viewportClassName='max-h-60 p-1'>
                        {fkState.fk.map((f, i) => {
                            return (
                                <DropdownMenuItem
                                    key={i}
                                    onClick={() => {
                                        onClickForeignKey(f, data.rows[fkState.cell.row][fkState.cell.col])
                                    }}
                                >
                                    {f.toTable.table}.{f.toColumn}
                                    {/* TODO: Display schema */}
                                    {/* <span className='ml-2 rounded border border-lime-600 px-1 text-[10px] text-lime-600'>
                                        {f.toTable.schema}
                                    </span> */}
                                </DropdownMenuItem>
                            )
                        })}
                    </ScrollView>
                </DropdownMenu>
            )}
        </div>
    )
}

const ColumnSortIcon = ({ type }: { type: SortType }) => {
    if (type === SortType.Descending) {
        return <IconChevronDown size={16} stroke={1.8} className='mr-2 text-primary' />
    } else {
        return <IconChevronUp size={16} stroke={1.8} className='mr-2 text-primary' />
    }
}
