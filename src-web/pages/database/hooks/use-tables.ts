import { KeyedMutator } from 'swr'
import useSWRImmutable from 'swr/immutable'
import { useTranslation } from '../../../i18n'
import { MessageAction, showMessageBox } from '../../../ui'
import { db, DeleteTableType, Tables, TableType } from '../db/db'
import { PreviewEventType, previewListener } from '../preview/utils'
import { Entry, TabType, useConnectedID, useTabsStore } from './use-store'

export const useTables = () => {
    const connectedID = useConnectedID()
    const key = connectedID === null ? null : (['tables', connectedID] as const)
    return useSWRImmutable(key, () => {
        return db.tables()
    })
}

export const useRefreshTables = (): KeyedMutator<Tables> => {
    const { mutate } = useTables()
    return mutate
}

type DeleteTableFn = (entry: Entry, type: DeleteTableType) => void

export const useDeleteTable = (): DeleteTableFn => {
    const { t } = useTranslation()
    const { mutate } = useTables()
    const closeTab = useTabsStore((state) => state.closeTab)
    return (entry, type) => {
        const run = async (cascade: boolean) => {
            try {
                await db.deleteTable(entry, type, cascade)
            } catch (err: any) {
                showMessageBox(t('error'), err, 'error')
                return
            }
            if (type === DeleteTableType.Drop) {
                closeTab([
                    {
                        type: TabType.Preview,
                        entry,
                        // TODO: Deleting views in the UI is not yet supported
                        tableType: TableType.Table
                    },
                    {
                        type: TabType.Edit,
                        entry
                    }
                ])
                mutate()
            } else {
                previewListener.send(entry, { type: PreviewEventType.Refresh })
            }
        }
        const actions: MessageAction[] = [
            {
                label: type,
                primary: true,
                onClick: () => run(false)
            }
        ]
        if (
            (type === DeleteTableType.Drop && db.allowCascadeDropTable()) ||
            (type === DeleteTableType.Truncate && db.allowCascadeTruncateTable())
        ) {
            actions.unshift({
                label: `${type} (Cascade)`,
                onClick: () => run(true)
            })
        }
        // TODO: Need to support i18n here
        showMessageBox(
            `${type} Table`,
            `Are you sure you want to ${type.toLocaleLowerCase()} table '${entry.table}'?`,
            'warning',
            actions
        )
    }
}

// Rename Table
export const useRenameTable = () => {
    const { mutate, data: tables } = useTables()
    const replaceTab = useTabsStore((state) => state.replaceTab)

    // TODO: Renaming views in the UI is not yet supported
    return (entry: Entry, newTableName: string) => {
        if (tables !== undefined) {
            for (let i = 0; i < tables[entry.schema].length; i++) {
                if (tables[entry.schema][i].name === entry.table) {
                    tables[entry.schema][i].name = newTableName
                    break
                }
            }
            mutate(tables)
        } else {
            mutate()
        }
        const toEntry = {
            schema: entry.schema,
            table: newTableName
        }
        replaceTab([
            {
                from: {
                    type: TabType.Preview,
                    entry,
                    tableType: TableType.Table
                },
                to: {
                    type: TabType.Preview,
                    entry: toEntry,
                    tableType: TableType.Table
                }
            },
            {
                from: {
                    type: TabType.Edit,
                    entry
                },
                to: {
                    type: TabType.Edit,
                    entry: toEntry
                }
            }
        ])
    }
}
