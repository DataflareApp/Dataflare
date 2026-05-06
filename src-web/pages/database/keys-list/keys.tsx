import { IconChevronDown } from '@tabler/icons-react'
import { Fragment, useMemo, useState } from 'react'
import { useSearch } from '../../../hooks/use-search'
import { useTranslation } from '../../../i18n'
import { Key, NameSpace, showContextMenu, writeClipboardText } from '../../../tauri'
import { ListItem, Message, VirtualList, DropdownMenuItem, Loading, SearchInput, Button } from '../../../ui'
import { useReadonly } from '../hooks/use-db'
import { useDelete, useKeys, useNamespaceOptions, useNamespaces } from '../hooks/use-kv'
import { TabType, useConnectedID, useTabsStore } from '../hooks/use-store'
import { KeyIcon } from '../icon'
import { Header } from '../layout/header'
import { ListMenu } from '../layout/menu'
import { ErrorTry } from '../query-list/error-try'
import { keyEq, splitPrefix } from '../utils/kv'

export default function KeysList() {
    const { t } = useTranslation()
    const readonly = useReadonly()
    const activeTab = useTabsStore((s) => s.activeTab)
    const switchTabTo = useTabsStore((s) => s.switchTabTo)
    const connectedID = useConnectedID()
    const [contextMenuKey, setContextMenuKey] = useState<Key | null>(null)
    const deleteKey = useDelete()

    const { data: namespaces, isValidating, isLoading, error, mutate: refreshNamespaces } = useNamespaces()

    const { displaySearch, search, setSearch } = useSearch('', 1000)
    const [namespace, setNamespace] = useState<NameSpace | null>(null)

    const options = useNamespaceOptions()

    const {
        data: keysData,
        isValidating: keysIsValidating,
        isLoading: keysIsLoading,
        error: keysError,
        mutate: refreshKeys,
        setSize
    } = useKeys(namespace?.id ?? null, search)

    const keys = useMemo(() => {
        if (keysData === undefined) {
            return undefined
        }
        return keysData.flatMap((page) => page.keys)
    }, [keysData])

    const isReachingEnd =
        keysData === undefined || keysData.length === 0 ? true : keysData[keysData.length - 1].cursor === null

    const tabActiveKey = useMemo(() => {
        if (
            activeTab === null ||
            activeTab.type !== TabType.KeyDetail ||
            activeTab.entry.namespace.id !== namespace?.id
        ) {
            return null
        }
        return activeTab.entry.key
    }, [activeTab, namespace])

    if (namespaces !== undefined && namespaces.length > 0) {
        if (namespace === null) {
            setNamespace(namespaces[0])
        }
    }
    if (namespace !== null) {
        let ns = namespaces?.find((ns) => ns.id === namespace.id)
        if (ns === undefined) {
            setNamespace(null)
        }
    }

    const onContextMenu = (key: Key) => {
        if (namespace === null) {
            return
        }
        setContextMenuKey(key)
        showContextMenu(
            [
                {
                    label: t('copyKey'),
                    onClick: () => writeClipboardText(key.value)
                },
                {
                    separator: true,
                    label: t('search'),
                    subitems: [
                        {
                            label: t('fullKeyName'),
                            onClick: () => {
                                // TODO
                                setSearch(key.value, true)
                            }
                        },
                        ...splitPrefix(key.value)
                            .map((prefixs) => {
                                return prefixs.map((item, i) => {
                                    return {
                                        separator: i === 0,
                                        label: item,
                                        onClick: () => setSearch(item, true)
                                    }
                                })
                            })
                            .flat()
                    ]
                },
                // TODO
                // {
                //     separator: true,
                //     label: t('duplicate'),
                //     disabled: readonly,
                //     onClick() {}
                // },
                {
                    separator: true,
                    label: t('delete'),
                    disabled: readonly,
                    onClick: () => deleteKey(namespace, key, () => refreshKeys())
                }
            ],
            () => setContextMenuKey(null)
        )
    }

    return (
        <>
            <Header />
            <SearchInput className='mx-4' value={displaySearch} onChange={setSearch} includeShiftKeyToFocus />

            {connectedID !== null &&
                (isLoading ? (
                    <Loading />
                ) : !isValidating && error !== undefined ? (
                    <ErrorTry error={error} onClick={() => refreshNamespaces()} />
                ) : (
                    <>
                        <ListMenu
                            name={namespace?.title ?? namespace?.id ?? ''}
                            selectOptions={options}
                            selectValue={namespace?.id ?? ''}
                            onChange={(id) => {
                                const ns = namespaces?.find((ns) => ns.id === id) ?? null
                                setNamespace(ns)
                            }}
                            refreshing={isValidating || keysIsValidating}
                            onRefresh={async () => {
                                setSize(1)
                                await refreshNamespaces()
                                await refreshKeys()
                            }}
                        >
                            <DropdownMenuItem onClick={() => switchTabTo({ type: TabType.KeyConsole })}>
                                {t('console')}
                            </DropdownMenuItem>
                        </ListMenu>

                        {keysIsLoading ? (
                            <Loading />
                        ) : !keysIsValidating && keysError !== undefined ? (
                            <ErrorTry error={keysError} onClick={() => refreshKeys()} />
                        ) : (
                            <VirtualList
                                className='min-h-0 flex-1'
                                axis='y'
                                data={keys ?? []}
                                itemHeight={28}
                                prepareCount={6}
                                paddingBottom={isReachingEnd ? 16 : 28 + 6 + 16}
                                emptyElement={<Message text={t('noSearchResult')} />}
                                renderItem={(i, top, item) => {
                                    return (
                                        <Fragment key={item.value}>
                                            <ListItem
                                                top={top}
                                                selected={keyEq(item, tabActiveKey)}
                                                highlight={contextMenuKey === item}
                                                onClick={() => {
                                                    switchTabTo({
                                                        type: TabType.KeyDetail,
                                                        entry: {
                                                            namespace: namespace!,
                                                            key: item
                                                        }
                                                    })
                                                }}
                                                onContextMenu={() => onContextMenu(item)}
                                                icon={<KeyIcon />}
                                                label={item.value}
                                            />
                                            {!isReachingEnd && i === keys!.length - 1 && (
                                                <Button
                                                    style={{ top: top + 28 + 6 }}
                                                    className='absolute inset-x-4'
                                                    loading={keysIsLoading || keysIsValidating}
                                                    onClick={() => setSize((size) => size + 1)}
                                                >
                                                    <IconChevronDown size={16} />
                                                </Button>
                                            )}
                                        </Fragment>
                                    )
                                }}
                            />
                        )}
                    </>
                ))}
        </>
    )
}
