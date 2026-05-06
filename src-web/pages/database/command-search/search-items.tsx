import { IconDatabase, IconPlugConnected, IconPlugConnectedX, IconMessage } from '@tabler/icons-react'
import { useEffect, useMemo } from 'react'
import useSWR from 'swr'
import { useFuzzySearch } from '../../../hooks/use-fuzzy-search'
import { useTranslation } from '../../../i18n'
import { ClientData, REFRESH_CONNECTIONS, TauriGlobalEvent } from '../../../tauri'
import { ConnectionIcon } from '../../../ui'
import { db } from '../db/db'
import { useQuerys } from '../hooks/use-querys'
import { useIsKv } from '../hooks/use-store'
import { useTables } from '../hooks/use-tables'
import {
    DashboardIcon,
    ExtensionIcon,
    FunctionIcon,
    NewTableIcon,
    QueryIcon,
    SchemaIcon,
    TableIcon,
    TriggerIcon
} from '../icon'
import { SearchItem, SearchType } from './search-types'

// TODO:
// For performance, a new connectionList API should be added that only returns names and database types
// When a connection is needed, call the connectionDetail API to get detailed info
const useConnections = () => {
    const { data, mutate } = useSWR('connections', () => {
        return ClientData.connectionList()
    })
    useEffect(() => {
        const un = TauriGlobalEvent.listen(REFRESH_CONNECTIONS, () => {
            mutate(undefined)
        })
        return () => {
            un.then((un) => un())
        }
    }, [])
    return data ?? []
}

export const useSearchItems = (search: string) => {
    const isKv = useIsKv()
    // This is safe because the database type is immutable; once the window opens, the database type won't change
    return isKv ? useKvList(search) : useSqlList(search)
}

const useSqlList = (search: string) => {
    const { t, tf } = useTranslation()
    const connections = useConnections()
    const { data: tables } = useTables()
    const { data: querys } = useQuerys()

    const all = useMemo(() => {
        const suggestions: SearchItem[] = [
            {
                type: SearchType.NewQuery,
                title: t('newQuery'),
                icon: <QueryIcon />
            },
            {
                type: SearchType.NewTable,
                title: t('newTable'),
                icon: <NewTableIcon />
            },
            {
                type: SearchType.AiAssistant,
                title: t('aiAssistant'),
                icon: <IconMessage size={16} strokeWidth={1.5} />
            },
            {
                type: SearchType.ManageConnection,
                title: t('manageConnection'),
                icon: <IconPlugConnected className='text-primary' size={16} strokeWidth={1.5} />
            },
            {
                type: SearchType.Reconnect,
                title: t('reconnect'),
                icon: <IconPlugConnectedX className='text-primary' size={16} strokeWidth={1.5} />
            },
            {
                type: SearchType.Dashboard,
                title: t('dashboard'),
                icon: <DashboardIcon />
            },
            {
                type: SearchType.SchemaManager,
                title: t('schemaManager'),
                icon: <SchemaIcon />
            },
            ...[
                {
                    type: SearchType.FunctionManager,
                    title: t('functionManager'),
                    icon: <FunctionIcon />
                } as SearchItem
            ].filter(() => db.supportFunctions()),
            ...[
                {
                    type: SearchType.TriggerManager,
                    title: t('triggerManager'),
                    icon: <TriggerIcon />
                } as SearchItem
            ].filter(() => db.supportTriggers()),
            ...[
                {
                    type: SearchType.ExtensionManager,
                    title: t('extensionManager'),
                    icon: <ExtensionIcon />
                } as SearchItem
            ].filter(() => db.supportExtensions()),
            {
                type: SearchType.BackupDatabase,
                title: t('backupDatabase'),
                icon: <IconDatabase size={16} strokeWidth={1.5} />
            },
            ...connections.map((item): SearchItem => {
                return {
                    type: SearchType.Connection,
                    title: tf('connectTo', item.name),
                    data: item,
                    icon: <ConnectionIcon type={item.config.type} />
                }
            })
        ]
        return [
            ...suggestions,
            ...Object.keys(tables ?? {})
                .map((schema) => {
                    return tables![schema].map((table): SearchItem => {
                        return {
                            type: SearchType.Table,
                            title: `${schema}.${table.name}`,
                            icon: <TableIcon type={table.type} />,
                            data: {
                                schema,
                                table: table.name
                            },
                            tableType: table.type
                        }
                    })
                })
                .flat(),
            ...(querys ?? []).map((item): SearchItem => {
                return {
                    type: SearchType.Query,
                    title: item.name,
                    icon: <QueryIcon />,
                    data: item
                }
            })
        ]
    }, [tables, querys, connections])

    const filtered = useFuzzySearch(all, search, (item) => item.title)
    return filtered
}

const useKvList = (search: string) => {
    const { t, tf } = useTranslation()
    const connections = useConnections()

    const all = useMemo(() => {
        const suggestions: SearchItem[] = [
            {
                type: SearchType.KeyConsole,
                title: t('console'),
                icon: <QueryIcon />
            },
            {
                type: SearchType.AiAssistant,
                title: t('aiAssistant'),
                icon: <IconMessage size={16} strokeWidth={1.5} />
            },
            {
                type: SearchType.ManageConnection,
                title: t('manageConnection'),
                icon: <IconPlugConnected className='text-primary' size={16} strokeWidth={1.5} />
            },
            {
                type: SearchType.Reconnect,
                title: t('reconnect'),
                icon: <IconPlugConnectedX className='text-primary' size={16} strokeWidth={1.5} />
            },
            {
                type: SearchType.BackupDatabase,
                title: t('backupDatabase'),
                icon: <IconDatabase size={16} strokeWidth={1.5} />
            },
            ...connections.map((item): SearchItem => {
                return {
                    type: SearchType.Connection,
                    title: tf('connectTo', item.name),
                    data: item,
                    icon: <ConnectionIcon type={item.config.type} />
                }
            })
        ]
        return suggestions
    }, [connections])

    const filtered = useFuzzySearch(all, search, (item) => item.title)
    return filtered
}
