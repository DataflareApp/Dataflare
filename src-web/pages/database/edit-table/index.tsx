import clsx from 'clsx'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { useScrollUtils } from '../../../hooks/use-scroll'
import { useTranslation } from '../../../i18n'
import {
    Button,
    RefreshButton,
    ViewSqlButton,
    Autocomplete,
    TextInput,
    showMessageBox,
    Popover,
    ScrollView,
    Loading,
    ErrorMessage,
    popoverSize,
    Tooltip
} from '../../../ui'
import {
    AddIndexColumn,
    AddItem,
    DeleteColumn,
    NotNull,
    PrimaryKey,
    RestoreColumn,
    Unique
} from '../create-table/buttons'
import { ColumnHeader } from '../create-table/columns'
import { useIndexColumnSuggestions } from '../create-table/hooks'
import { IndexHeader } from '../create-table/indexs'
import { IndexColumn } from '../create-table/indexs-columns'
import { IndexOption } from '../create-table/indexs-option'
import { db, TableColumn, TableIndex } from '../db/db'
import { useDatabaseDataType, useReadonly } from '../hooks/use-db'
import { Entry, useConnectID } from '../hooks/use-store'
import { PreviewEventType, previewListener } from '../preview/utils'
import { SqlPreview } from '../sql-preview'

interface Props {
    entry: Entry
    hidden: boolean
}

export const TableEdit = memo(({ entry, hidden }: Props) => {
    const { t } = useTranslation()
    const readonly = useReadonly()
    const ref = useScrollUtils()
    const datatypes = useDatabaseDataType()
    const connectID = useConnectID()
    // Columns
    const [columns, setColumns] = useState<TableColumn[]>([])
    // Indexes
    const [indexs, setIndexs] = useState<TableIndex[]>([])
    // Original data
    const oldColumns = useRef<TableColumn[]>([])
    const oldIndexs = useRef<TableIndex[]>([])
    // Columns to be deleted
    const [deletedColumns, setDeletedColumns] = useState<number[]>([])
    // Indexes to be deleted
    const [deletedIndexs, setDeletedIndexs] = useState<number[]>([])

    const {
        data,
        isLoading,
        isValidating,
        mutate: refresh,
        error
    } = useSWR(['edit-table-struct', connectID, entry.schema, entry.table], () => {
        return Promise.all([db.tableColumnsInfo(entry.schema, entry.table), db.tableIndexs(entry)])
    })

    useEffect(() => {
        if (data === undefined) return
        const [cs, inxs] = data
        const columns = cs.map((item): TableColumn => {
            return {
                ...item,
                unique: false,
                foreignKeys: []
            }
        })
        oldColumns.current = structuredClone(columns)
        oldIndexs.current = structuredClone(inxs)
        setColumns(columns)
        setIndexs(inxs)
        setDeletedColumns([])
        setDeletedIndexs([])
    }, [data])

    const indexColumnSuggestions = useIndexColumnSuggestions(columns)

    const sqls = useMemo(() => {
        const sqls: string[] = []
        columns.forEach((item, i) => {
            if (i < oldColumns.current.length) {
                // Previous column
                if (deletedColumns.includes(i)) {
                    // Delete column
                    sqls.push(db.dropTableColumnSQL(entry, oldColumns.current[i].name))
                } else {
                    if (columnDiff(item, oldColumns.current[i])) {
                        // Modify column
                        sqls.push(db.renameTableColumnSQL(entry, oldColumns.current[i].name, item.name))
                    }
                }
            } else {
                // Newly added column
                sqls.push(db.addTableColumnSQL(entry, item))
            }
        })
        indexs.forEach((item, i) => {
            if (i < oldIndexs.current.length) {
                // Previous index
                if (deletedIndexs.includes(i)) {
                    // Delete index
                    sqls.push(db.dropTableIndexSQL(entry, item.name!))
                } else {
                    if (indexDiff(item, oldIndexs.current[i])) {
                        // Modify index
                        sqls.push(db.renameTableIndexSQL(entry, oldIndexs.current[i].name!, item.name!))
                    }
                }
            } else {
                // Newly added index
                sqls.push(db.addTableIndexSQL(entry, item))
            }
        })
        return sqls
    }, [columns, indexs, deletedColumns, deletedIndexs, entry])

    const { isMutating: saveing, trigger: save } = useSWRMutation(
        ['edit-table-save', entry.schema, entry.table],
        () => {
            return db.transaction(sqls)
        }
    )

    const wantRefresh = () => {
        if (sqls.length === 0) {
            return refresh()
        }
        if (readonly) {
            return refresh(undefined)
        }
        showMessageBox(t('discardChanges'), t('discardChangesMessage'), 'warning', {
            primary: true,
            label: t('discard'),
            onClick: () => {
                refresh(undefined)
            }
        })
    }

    if (hidden) {
        return null
    }

    const updateColumn = <K extends keyof TableColumn>(i: number, key: K, value: TableColumn[K]) => {
        const newColumns = [...columns]
        newColumns[i][key] = value
        setColumns(newColumns)
    }

    const updateIndex = <K extends keyof TableIndex>(i: number, key: K, value: TableIndex[K]) => {
        const newIndexs = [...indexs]
        newIndexs[i][key] = value
        setIndexs(newIndexs)
    }

    const onSubmit = async () => {
        try {
            await save()
            previewListener.send(entry, { type: PreviewEventType.Refresh })
        } catch (err: any) {
            showMessageBox(t('saveFailed'), err, 'error')
        }
        refresh()
    }

    const sql = sqls.length > 0 ? sqls.join('\n') : '-- No changes'

    return (
        <div className='flex flex-1 flex-col overflow-hidden'>
            <div className='flex h-11 min-w-max items-center gap-2 px-4'>
                <RefreshButton className='mr-auto' refreshing={isValidating} onRefresh={wantRefresh} />
                <Popover trigger={<ViewSqlButton />} side='left'>
                    <SqlPreview value={sql} className='px-4 py-2' style={popoverSize} />
                </Popover>
                {!readonly && (
                    <Button
                        className='w-24'
                        primary
                        disabled={sqls.length === 0}
                        loading={saveing}
                        onClick={onSubmit}
                    >
                        {t('save')}
                    </Button>
                )}
            </div>

            {isLoading ? (
                <Loading />
            ) : error !== undefined ? (
                <ErrorMessage text={error} />
            ) : (
                <ScrollView axis='both' border className='flex-1 pb-4' ref={ref}>
                    <div className='flex min-w-min flex-col gap-2'>
                        <ColumnHeader />
                        {columns.map((column, i) => {
                            const readonly = i < oldColumns.current.length
                            return (
                                <div key={i} className='flex items-center gap-2 bg-main px-4'>
                                    <Status
                                        type={
                                            i > oldColumns.current.length - 1
                                                ? 'Added'
                                                : deletedColumns.includes(i)
                                                  ? 'Deleted'
                                                  : columnDiff(oldColumns.current[i], column)
                                                    ? 'Changed'
                                                    : undefined
                                        }
                                    />
                                    <TextInput
                                        className='w-32'
                                        value={column.name}
                                        onChange={(val) => updateColumn(i, 'name', val)}
                                    />
                                    <Autocomplete
                                        className='w-32'
                                        suggestions={datatypes}
                                        value={column.datatype}
                                        onChange={(val) => {
                                            !readonly && updateColumn(i, 'datatype', val)
                                        }}
                                    />
                                    <TextInput
                                        className='w-32'
                                        value={column.defaultValue ?? ''}
                                        onChange={(val) =>
                                            !readonly &&
                                            updateColumn(i, 'defaultValue', val === '' ? null : val)
                                        }
                                    />
                                    <div className='flex h-7 flex-1 items-center gap-2'>
                                        <PrimaryKey
                                            highlight={column.primaryKey}
                                            onClick={() =>
                                                !readonly && updateColumn(i, 'primaryKey', !column.primaryKey)
                                            }
                                        />
                                        <NotNull
                                            highlight={column.notNull}
                                            onClick={() =>
                                                !readonly && updateColumn(i, 'notNull', !column.notNull)
                                            }
                                        />
                                        {!readonly && (
                                            <Unique
                                                highlight={column.unique}
                                                onClick={() => updateColumn(i, 'unique', !column.unique)}
                                            />
                                        )}
                                    </div>
                                    {deletedColumns.includes(i) ? (
                                        <RestoreColumn
                                            onClick={() => {
                                                setDeletedColumns(deletedColumns.filter((item) => item !== i))
                                            }}
                                        />
                                    ) : (
                                        <DeleteColumn
                                            onClick={() => {
                                                if (i >= oldColumns.current.length) {
                                                    const newColumns = [...columns]
                                                    newColumns.splice(i, 1)
                                                    setColumns(newColumns)
                                                } else {
                                                    setDeletedColumns([...deletedColumns, i])
                                                }
                                            }}
                                        />
                                    )}
                                </div>
                            )
                        })}
                        <AddItem
                            name={t('column')}
                            onClick={() => {
                                setColumns([
                                    ...columns,
                                    {
                                        name: '',
                                        datatype: '',
                                        defaultValue: null,
                                        primaryKey: false,
                                        notNull: false,
                                        unique: false,
                                        foreignKeys: []
                                    }
                                ])
                            }}
                        />

                        <IndexHeader />
                        {indexs.map((index, i) => {
                            const readonly = i < oldIndexs.current.length
                            return (
                                <div key={i} className='flex items-center gap-2 bg-main pl-4 pr-4'>
                                    <Status
                                        type={
                                            i > oldIndexs.current.length - 1
                                                ? 'Added'
                                                : deletedIndexs.includes(i)
                                                  ? 'Deleted'
                                                  : indexDiff(oldIndexs.current[i], index)
                                                    ? 'Changed'
                                                    : undefined
                                        }
                                    />
                                    <TextInput
                                        className='w-32'
                                        value={index.name ?? ''}
                                        onChange={(val) => {
                                            if (!readonly || db.allowRenameIndex()) {
                                                updateIndex(i, 'name', val === '' ? null : val)
                                            }
                                        }}
                                    />
                                    <div className='h-5 w-32 px-2'>
                                        <IndexOption
                                            option={index.option}
                                            onChange={(val) => !readonly && updateIndex(i, 'option', val)}
                                        />
                                    </div>
                                    <div className='flex h-7 flex-1 items-center gap-2 px-2'>
                                        {index.columns.map((item, ci) => {
                                            return (
                                                <IndexColumn
                                                    key={ci}
                                                    column={item}
                                                    columnSuggestions={indexColumnSuggestions}
                                                    onChange={(val) => {
                                                        if (!readonly) {
                                                            const newColumns = [...index.columns]
                                                            newColumns[ci] = val
                                                            updateIndex(i, 'columns', newColumns)
                                                        }
                                                    }}
                                                    onDelete={() => {
                                                        if (!readonly) {
                                                            const newColumns = [...index.columns]
                                                            newColumns.splice(ci, 1)
                                                            updateIndex(i, 'columns', newColumns)
                                                        }
                                                    }}
                                                />
                                            )
                                        })}
                                        {!readonly && (
                                            <AddIndexColumn
                                                onClick={() => {
                                                    updateIndex(i, 'columns', [
                                                        ...index.columns,
                                                        {
                                                            name: ''
                                                        }
                                                    ])
                                                }}
                                            />
                                        )}
                                    </div>
                                    {deletedIndexs.includes(i) ? (
                                        <RestoreColumn
                                            onClick={() => {
                                                setDeletedIndexs(deletedIndexs.filter((item) => item !== i))
                                            }}
                                        />
                                    ) : (
                                        <DeleteColumn
                                            onClick={() => {
                                                if (i >= oldIndexs.current.length) {
                                                    const newIndexs = [...indexs]
                                                    newIndexs.splice(i, 1)
                                                    setIndexs(newIndexs)
                                                } else {
                                                    setDeletedIndexs([...deletedIndexs, i])
                                                }
                                            }}
                                        />
                                    )}
                                </div>
                            )
                        })}
                        <AddItem
                            name={t('index')}
                            onClick={() => {
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
                            }}
                        />
                    </div>
                </ScrollView>
            )}
        </div>
    )
})

const Status = ({ type }: { type: 'Added' | 'Deleted' | 'Changed' | undefined }) => {
    return (
        <div className='flex h-7 w-6 items-center justify-center pr-2'>
            {type !== undefined && (
                <Tooltip title={type} delay={100}>
                    <div
                        className={clsx(
                            'h-2 w-2 rounded-full hover:scale-125',
                            type === 'Added' && 'bg-green-500',
                            type === 'Deleted' && 'bg-red-500',
                            type === 'Changed' && 'bg-theme'
                        )}
                    />
                </Tooltip>
            )}
        </div>
    )
}

const columnDiff = (a: TableColumn, b: TableColumn): boolean => {
    return (
        a.name !== b.name ||
        a.datatype !== b.datatype ||
        a.defaultValue !== b.defaultValue ||
        a.primaryKey !== b.primaryKey ||
        a.notNull !== b.notNull ||
        a.unique !== b.unique
    )
}

const indexDiff = (a: TableIndex, b: TableIndex): boolean => {
    return a.name !== b.name
}
