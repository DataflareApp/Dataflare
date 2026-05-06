import { Root, Portal, Content, Title } from '@radix-ui/react-dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { FormEvent, KeyboardEvent, useState } from 'react'
import { useSearch } from '../../../hooks/use-search'
import { useTranslation } from '../../../i18n'
import { newDatabaseWindow, showBackupWindow, showConnectionsWindow } from '../../../tauri'
import { Message, VirtualList } from '../../../ui'
import { useChatPanel } from '../ai'
import { useCreateQuery } from '../hooks/use-querys'
import { TabType, useConnection, useDbStore, useTabsStore } from '../hooks/use-store'
import { useSearchItems } from './search-items'
import { SearchItem, SearchType } from './search-types'

export default function CommnadSearchPopup({ onClose }: { onClose: () => void }) {
    const { t } = useTranslation()
    const switchTabTo = useTabsStore((state) => state.switchTabTo)
    const createQuery = useCreateQuery()
    const connection = useConnection()
    const connect = useDbStore((state) => state.connect)
    const toggleChatPanel = useChatPanel((state) => state.toggleChatPanel)

    const { displaySearch, search, setSearch } = useSearch('', 200)
    const [selected, setSelected] = useState<number | null>(null)

    const list = useSearchItems(search)

    if (selected === null) {
        if (list.length > 0) {
            setSelected(0)
        }
    } else {
        if (selected >= list.length) {
            setSelected(null)
        }
    }

    const onClickSelected = (e?: FormEvent<HTMLFormElement>) => {
        e?.preventDefault()
        if (selected === null) {
            return
        }
        onClose()
        const current = list[selected]
        switch (current.type) {
            case SearchType.NewTable: {
                return switchTabTo({
                    type: TabType.Create
                })
            }
            case SearchType.NewQuery: {
                return createQuery('SQL Query')
            }
            case SearchType.AiAssistant: {
                return toggleChatPanel()
            }
            case SearchType.ManageConnection: {
                return showConnectionsWindow()
            }
            case SearchType.Dashboard: {
                return switchTabTo({ type: TabType.Dashboard })
            }
            case SearchType.SchemaManager: {
                return switchTabTo({ type: TabType.SchemaManager })
            }
            case SearchType.FunctionManager: {
                return switchTabTo({ type: TabType.FunctionManager })
            }
            case SearchType.TriggerManager: {
                return switchTabTo({ type: TabType.TriggerManager })
            }
            case SearchType.ExtensionManager: {
                return switchTabTo({ type: TabType.ExtensionManager })
            }
            case SearchType.KeyConsole: {
                return switchTabTo({ type: TabType.KeyConsole })
            }
            case SearchType.Table: {
                return switchTabTo({
                    type: TabType.Preview,
                    entry: current.data,
                    tableType: current.tableType
                })
            }
            case SearchType.Query: {
                return switchTabTo({ type: TabType.Query, query: current.data })
            }
            case SearchType.Connection: {
                if (current.data.cid === connection.cid) {
                    return connect(current.data)
                }
                return newDatabaseWindow(current.data, false, false)
            }
            case SearchType.Reconnect: {
                return connect(connection)
            }
            case SearchType.BackupDatabase: {
                return showBackupWindow(connection)
            }
        }
    }

    const onKeyDown = (e: KeyboardEvent) => {
        let i: number | null = null
        if (e.key === 'ArrowUp') {
            e.preventDefault()
            if (selected === null) {
                i = list.length - 1
            } else if (selected > 0) {
                i = selected - 1
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (selected === null) {
                i = 0
            } else if (selected + 1 < list.length) {
                i = selected + 1
            }
        }
        if (i !== null) {
            setSelected(i)
            const el = document.getElementById(`command-item-${i}`)
            el && el.scrollIntoView({ block: 'nearest', behavior: 'instant' })
        }
    }

    return (
        <Root open onOpenChange={onClose}>
            <Portal>
                <Content
                    className='fixed left-1/2 top-1/2 z-10 flex h-[400px] w-[480px] animate-dialogIn flex-col rounded-md border border-separator bg-main shadow-lg outline-none'
                    aria-describedby={undefined}
                    // When the popup appears, block other keyboard shortcuts
                    onKeyDown={(e) => {
                        if (e.key !== 'Escape') {
                            e.stopPropagation()
                        }
                    }}
                >
                    <VisuallyHidden>
                        <Title>{t('search')}</Title>
                    </VisuallyHidden>
                    <form onSubmit={onClickSelected}>
                        <input
                            spellCheck='false'
                            autoComplete='off'
                            autoCapitalize='none'
                            className='h-11 w-full border-b border-separator bg-transparent px-4 text-secondary placeholder-quarternary !outline-0'
                            placeholder={t('search')}
                            value={displaySearch}
                            onChange={(e) => {
                                setSelected(null)
                                setSearch(e.target.value)
                                const el = document.getElementById('command-search-list')
                                el?.scrollTo({ top: 0, behavior: 'instant' })
                            }}
                            onKeyDown={onKeyDown}
                        />
                    </form>

                    <VirtualList
                        viewportElementID='command-search-list'
                        className='flex-1'
                        axis='y'
                        data={list}
                        itemHeight={36}
                        prepareCount={6}
                        paddingTop={8}
                        paddingBottom={8}
                        emptyElement={<Message text={t('noSearchResult')} />}
                        renderItem={(i, top, item) => {
                            return (
                                <Item
                                    id={`command-item-${i}`}
                                    key={i}
                                    top={top}
                                    value={item}
                                    selected={i === selected}
                                    onSetSelected={() => setSelected(i)}
                                    onClick={onClickSelected}
                                />
                            )
                        }}
                    />
                </Content>
            </Portal>
        </Root>
    )
}

interface ItemProps {
    id: string
    top: number
    value: SearchItem
    selected: boolean
    onSetSelected: () => void
    onClick: () => void
}

const Item = (props: ItemProps) => {
    return (
        <div
            id={props.id}
            data-selected={props.selected || undefined}
            className='absolute inset-x-2 flex h-9 items-center gap-1 rounded px-2 data-[selected]:bg-neutral-300/60 data-[selected]:dark:bg-zinc-800/60'
            style={{ top: props.top }}
            onMouseEnter={props.onSetSelected}
            onMouseDown={(e) => e.preventDefault()}
            onClick={props.onClick}
        >
            {props.value.icon}
            <span className='flex-1 truncate text-sm text-secondary'>{props.value.title}</span>
        </div>
    )
}
