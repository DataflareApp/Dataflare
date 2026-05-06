import { Reorder } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useFuzzySearch } from '../../hooks/use-fuzzy-search'
import { useSearch } from '../../hooks/use-search'
import { t, tf } from '../../i18n/index'
import {
    ClientData,
    Connection,
    writeClipboardText,
    showContextMenu,
    newDatabaseWindow,
    setConnectionsSearch,
    getConnectionsSearch,
    TauriGlobalEvent,
    REFRESH_CONNECTIONS,
    showBackupWindow
} from '../../tauri'
import { ConnectionIcon, SearchInput, showMessageBox, ScrollView, Message } from '../../ui'
import { isMacOS } from '../../utils/os'
import { useConnections } from './hooks'

interface Props {
    select: string | null
    onChangeSelect: (config: Connection) => void
    onDelete: (connectionId: string) => void
}

export const ConnectionList = ({ select, onChangeSelect, onDelete }: Props) => {
    const { data: connections, mutate, isLoading } = useConnections()
    const [contextMenuSelect, setContextMenuSelect] = useState<string | null>(null)
    const { displaySearch, search, setSearch } = useSearch(null, 200, setConnectionsSearch)
    const listRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        getConnectionsSearch().then((value) => {
            setSearch(value, true)
        })
        // After opening a database via URL/Path, if it doesn't exist, a new connection is auto-created; refresh here
        const promise = TauriGlobalEvent.listen(REFRESH_CONNECTIONS, () => mutate())
        return () => {
            promise.then((un) => un())
        }
    }, [])

    useEffect(() => {
        listRef.current?.scrollTo({ top: 0 })
        setContextMenuSelect(null)
    }, [search])

    useEffect(() => {
        setContextMenuSelect(null)
        scrollTo(select)
    }, [select])

    useEffect(() => {
        scrollTo(contextMenuSelect)
    }, [contextMenuSelect])

    const filterConnections = useFuzzySearch(connections, search, (item) => item.name)

    const scrollTo = (cid: string | null) => {
        if (cid !== null && cid !== '') {
            const el = document.getElementById(cid)?.parentElement
            el?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
        }
    }

    const deleteConnection = async (connection: Connection) => {
        showMessageBox(t('deleteConnection'), tf('deleteMessage', connection.name), 'delete', {
            label: t('delete'),
            primary: true,
            onClick: () => onDelete(connection.cid)
        })
    }

    const duplicateConnection = async (connection: Connection) => {
        const newName = connection.name + ' Copy'
        const newCid = await ClientData.createConnection(newName, connection.config)
        const newConnections = [...connections!]
        const i = newConnections.findIndex((item) => item.cid === connection.cid)
        newConnections.splice(i + 1, 0, { ...connection, cid: newCid, name: newName })
        mutate(newConnections, {
            revalidate: false
        })
        await ClientData.connectionSort(newConnections.map((item) => item.cid))
    }

    const onSortEnd = (newConnections: Connection[]) => {
        if (search !== '') return
        mutate(newConnections, {
            revalidate: false
        })
        ClientData.connectionSort(newConnections.map((item) => item.cid))
    }

    const onContextMenu = (conn: Connection) => {
        setContextMenuSelect(conn.cid)
        showContextMenu(
            [
                {
                    label: t('connectInNewWindow'),
                    onClick: () => newDatabaseWindow(conn, false, true)
                },
                {
                    label: t('duplicate'),
                    separator: true,
                    onClick: () => duplicateConnection(conn)
                },
                {
                    label: t('copyAsURL'),
                    onClick: () => {
                        import('./utils')
                            .then((module) => module.toConnectionURL(conn))
                            .then(writeClipboardText)
                            .catch((err: any) => {
                                showMessageBox(t('error'), err.toString(), 'error')
                            })
                    }
                },
                {
                    separator: true,
                    label: t('backup'),
                    onClick: () => showBackupWindow(conn)
                },
                {
                    label: t('delete'),
                    separator: true,
                    onClick: () => deleteConnection(conn)
                }
            ],
            () => setContextMenuSelect(null)
        )
    }

    const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (filterConnections.length === 0) {
            return
        }
        switch (e.key) {
            case 'Enter': {
                e.preventDefault()
                if (contextMenuSelect === null) return
                const conn = filterConnections.find((item) => item.cid === contextMenuSelect)
                if (conn === undefined) return
                newDatabaseWindow(conn, !(isMacOS ? e.metaKey : e.ctrlKey), true)
                break
            }
            case 'ArrowDown': {
                e.preventDefault()
                const i = filterConnections.findIndex((item) => item.cid === contextMenuSelect)
                if (i < filterConnections.length - 1) {
                    setContextMenuSelect(filterConnections[i + 1].cid)
                }
                break
            }
            case 'ArrowUp': {
                e.preventDefault()
                const i = filterConnections.findIndex((item) => item.cid === contextMenuSelect)
                if (i > 0) {
                    setContextMenuSelect(filterConnections[i - 1].cid)
                }
                break
            }
        }
    }

    return (
        <>
            <div className='mb-2 px-4'>
                <SearchInput
                    autoFocus
                    className='w-full'
                    value={displaySearch ?? ''}
                    onChange={setSearch}
                    onBlur={() => setContextMenuSelect(null)}
                    onKeyDown={onSearchKeyDown}
                />
            </div>

            {isLoading || search === null ? (
                <div className='grow' />
            ) : filterConnections.length === 0 ? (
                <Message text={t('noConnections')} />
            ) : (
                <ScrollView
                    axis='y'
                    className='-mt-1 grow'
                    viewportClassName='px-4 pb-2 pt-1 outline-none'
                    ref={listRef}
                >
                    <Reorder.Group axis='y' layoutScroll values={filterConnections} onReorder={onSortEnd}>
                        {filterConnections.map((item) => {
                            const selected = select === item.cid
                            return (
                                <Reorder.Item
                                    key={item.cid}
                                    value={item}
                                    onContextMenu={() => onContextMenu(item)}
                                    whileDrag={{
                                        boxShadow:
                                            '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
                                    }}
                                    data-selected={selected || undefined}
                                    data-context-menu={contextMenuSelect === item.cid || undefined}
                                    className='mb-1 flex h-9 items-center gap-2 rounded bg-zinc-100 px-3 text-sm outline-1 outline-offset-2 outline-theme data-[selected]:bg-theme data-[context-menu]:outline dark:bg-neutral-800'
                                    title={item.name}
                                    onClick={(e: React.MouseEvent<HTMLLIElement, MouseEvent>) => {
                                        if (isMacOS ? e.metaKey : e.ctrlKey) {
                                            return newDatabaseWindow(item, false, true)
                                        }
                                        onChangeSelect(item)
                                    }}
                                    onDoubleClick={() => newDatabaseWindow(item, true, true)}
                                >
                                    <ConnectionIcon type={item.config.type} isSelected={selected} />
                                    <span
                                        // This ID is for scrolling the selected connection into view when it changes
                                        id={item.cid}
                                        data-selected={selected || undefined}
                                        className='truncate text-secondary data-[selected]:text-white'
                                    >
                                        {item.name}
                                    </span>
                                </Reorder.Item>
                            )
                        })}
                    </Reorder.Group>
                </ScrollView>
            )}
        </>
    )
}
