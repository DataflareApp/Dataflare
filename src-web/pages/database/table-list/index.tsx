import { lazy, useMemo, useState, Suspense } from 'react'
import { useFuzzySearch } from '../../../hooks/use-fuzzy-search'
import { useSearch } from '../../../hooks/use-search'
import { useTranslation } from '../../../i18n'
import { writeClipboardText, showContextMenu } from '../../../tauri'
import {
    ListItem,
    showMessageBox,
    showRenameDialog,
    Loading,
    Message,
    VirtualList,
    SearchInput
} from '../../../ui'
import { db, Table, TableType } from '../db/db'
import { useReadonly, useSchemaOptions } from '../hooks/use-db'
import { useCreateQuery } from '../hooks/use-querys'
import { Entry, TabData, TabType, useConnectedID, useTabsStore } from '../hooks/use-store'
import { useDeleteTable, useRefreshTables, useRenameTable, useTables } from '../hooks/use-tables'
import { TableIcon } from '../icon'
import { Header } from '../layout/header'
import { ErrorTry } from '../query-list/error-try'
import { tabEqual } from '../utils/tab'
import { SchemaMenu } from './schema-menu'

const DuplicateTable = lazy(() => import('./duplicate'))

export const TableList = () => {
    const { t } = useTranslation()
    const { data: tables, error, isValidating, isLoading } = useTables()
    const deleteTable = useDeleteTable()
    const createQuery = useCreateQuery()
    const readonly = useReadonly()
    const connectedID = useConnectedID()
    const activeTab = useTabsStore((state) => state.activeTab)
    const switchTabTo = useTabsStore((state) => state.switchTabTo)
    const renameTable = useRenameTable()
    const refreshTable = useRefreshTables()
    const [schema, setSchema] = useState('')
    const [contextMenuTableSelected, setContextMenuTableSelected] = useState<string | null>(null)
    const [duplicate, setDuplicate] = useState<Entry | null>(null)
    const { displaySearch, search, setSearch } = useSearch('', 300)
    const { schemas, selectOptions } = useSchemaOptions(tables)

    if (schemas.length === 0) {
        if (schema !== '') {
            setSchema('')
        }
    } else {
        if (!schemas.includes(schema)) {
            setSchema(schemas[0])
        }
    }

    const filterTables = useFuzzySearch(tables?.[schema], search, (item) => item.name)

    const onMoveTable = async (entry: Entry, toSchema: string) => {
        try {
            await db.moveTable(entry.table, entry.schema, toSchema)
            refreshTable()
            // TODO: Update opened tabs
        } catch (err: any) {
            showMessageBox(t('error'), err, 'error')
        }
    }

    const showError = !isValidating && error !== undefined
    const deleteTypes = db.allowDeleteTableTypes()

    const onContextMenu = (entry: Entry, type: TableType) => {
        const isView = type === TableType.View
        setContextMenuTableSelected(entry.table)
        showContextMenu(
            [
                {
                    label: t('newQuery'),
                    onClick() {
                        createQuery(entry.table, db.defaultQuerySql(entry))
                    }
                },
                {
                    label: t('copyTableName'),
                    separator: true,
                    onClick() {
                        writeClipboardText(entry.table)
                    }
                },
                {
                    label: t('rename'),
                    separator: true,
                    disabled: readonly,
                    hidden: isView,
                    onClick: () => {
                        showRenameDialog({
                            from: entry.table,
                            onHandler: (to) => {
                                return db.renameTable(entry, to)
                            },
                            onSuccess: (newName) => {
                                renameTable(entry, newName)
                            }
                        })
                    }
                },
                {
                    label: t('editTable'),
                    hidden: isView,
                    onClick() {
                        switchTabTo({
                            type: TabType.Edit,
                            entry
                        })
                    }
                },
                {
                    label: t('moveTo'),
                    hidden: !db.allowMoveTable() || isView,
                    disabled: readonly,
                    subitems: schemas
                        .filter((item) => item !== schema)
                        .map((s) => {
                            return {
                                label: s,
                                onClick: () => onMoveTable(entry, s)
                            }
                        })
                },
                {
                    label: t('duplicate'),
                    disabled: readonly,
                    hidden: !db.supportDuplicateTable(),
                    onClick() {
                        setDuplicate(entry)
                    }
                },
                {
                    label: t('delete'),
                    separator: true,
                    disabled: readonly,
                    hidden: isView,
                    subitems: deleteTypes.map((type) => {
                        return {
                            label: type,
                            onClick: () => deleteTable(entry, type)
                        }
                    })
                }
            ],
            () => setContextMenuTableSelected(null)
        )
    }

    return (
        <div className='group flex size-full flex-col'>
            <Header />
            <SearchInput className='mx-4' value={displaySearch} onChange={setSearch} includeShiftKeyToFocus />

            {isLoading ? (
                <Loading />
            ) : showError ? (
                <ErrorTry error={error} onClick={() => refreshTable()} />
            ) : (
                <>
                    {connectedID !== null && (
                        <SchemaMenu schema={schema} setSchema={setSchema} options={selectOptions} />
                    )}
                    {tables !== undefined && (
                        <VirtualList
                            className='min-h-0 flex-1'
                            axis='y'
                            data={filterTables}
                            itemHeight={28}
                            prepareCount={10}
                            paddingBottom={16}
                            emptyElement={<Message text={t('noTable')} />}
                            renderItem={(_, top, table: Table) => {
                                const entry: Entry = { schema, table: table.name }
                                const tabData: TabData = {
                                    type: TabType.Preview,
                                    entry,
                                    tableType: table.type
                                }
                                const selected = tabEqual(tabData, activeTab)
                                const highlight = contextMenuTableSelected === table.name
                                return (
                                    <ListItem
                                        key={table.name}
                                        top={top}
                                        selected={selected}
                                        highlight={highlight}
                                        onClick={() => switchTabTo(tabData)}
                                        onContextMenu={() => onContextMenu(entry, table.type)}
                                        icon={<TableIcon type={table.type} />}
                                        label={table.name}
                                    />
                                )
                            }}
                        />
                    )}
                </>
            )}

            {duplicate !== null && (
                <Suspense>
                    <DuplicateTable entry={duplicate} onClose={() => setDuplicate(null)} />
                </Suspense>
            )}
        </div>
    )
}
