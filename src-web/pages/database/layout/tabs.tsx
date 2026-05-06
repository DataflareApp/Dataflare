import { IconX, IconTableOptions } from '@tabler/icons-react'
import { Reorder } from 'framer-motion'
import { useEffect } from 'react'
import { useTranslation } from '../../../i18n'
import { showContextMenu } from '../../../tauri'
import { IconButton, Tooltip } from '../../../ui'
import { KeyModifier, keyboardTitleChars } from '../../../utils/keyboard-char'
import { TabData, TabType, useTabsStore } from '../hooks/use-store'
import {
    DashboardIcon,
    ExtensionIcon,
    FunctionIcon,
    KeyIcon,
    NewTableIcon,
    QueryIcon,
    SchemaIcon,
    TableIcon,
    TriggerIcon
} from '../icon'
import { getTabId, getTabName, getTabTitle, tabEqual } from '../utils/tab'

const TITLE_NUMBER = Array.from({ length: 9 }).map((_, i) => {
    return keyboardTitleChars('', [KeyModifier.Meta, `${i + 1}`])
})

export const Tabs = () => {
    const { t } = useTranslation()
    const { activeTab, setActiveTab, closeTab, tabsData, setTabsData, resetTabs, closeOtherTabs } =
        useTabsStore()

    useEffect(() => {
        if (activeTab === null) return
        for (let i = 0; i < tabsData.length; i++) {
            if (tabEqual(tabsData[i], activeTab)) {
                const el = document.getElementById(`tab-${i}`)
                el?.scrollIntoView()
                break
            }
        }
    }, [activeTab])

    const onContextMenu = (item: TabData) => {
        setActiveTab(item)
        showContextMenu([
            {
                label: t('close'),
                onClick: () => closeTab(item)
            },
            {
                label: t('closeAllTab'),
                onClick: resetTabs
            },
            {
                label: t('closeOtherTabs'),
                disabled: tabsData.length <= 1,
                onClick: () => closeOtherTabs(item)
            }
        ])
    }

    return (
        <div className='relative h-10 shrink-0 bg-zinc-100 dark:bg-zinc-900'>
            <div className='absolute inset-x-0 bottom-0 z-10 h-px border-t border-separator' />
            <Reorder.Group
                axis='x'
                layoutScroll
                values={tabsData}
                onReorder={setTabsData}
                className='scrollbar-hide flex h-full overflow-x-auto'
                data-tauri-drag-region
            >
                {tabsData.map((item, i) => {
                    const actived = tabEqual(item, activeTab) || undefined
                    let title = getTabTitle(item)
                    if (i < 9) {
                        title += TITLE_NUMBER[i]
                    }
                    return (
                        <Tooltip key={getTabId(item)} title={title}>
                            <Reorder.Item
                                value={item}
                                id={`tab-${i}`}
                                data-actived={actived}
                                className='group relative flex h-full items-center gap-1 border-r border-separator bg-zinc-100 pl-[10px] pr-2 text-tertiary after:absolute after:inset-x-0 after:bottom-0 after:z-10 after:h-px data-[actived]:bg-main data-[actived]:text-primary data-[actived]:after:bg-main dark:bg-zinc-900'
                                onContextMenu={() => onContextMenu(item)}
                                onPointerDown={(e: MouseEvent) => {
                                    e.button === 1 ? closeTab(item) : setActiveTab(item)
                                }}
                            >
                                <TabIcon data={item} />
                                <span className='max-w-[120px] truncate text-sm'>{getTabName(item)}</span>
                                <IconButton
                                    title={keyboardTitleChars(t('close'), [KeyModifier.Meta, 'W'])}
                                    data-actived={actived}
                                    className='!px-0.5 opacity-0 group-hover:opacity-100 data-[actived]:opacity-100'
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        closeTab(item)
                                    }}
                                >
                                    <IconX className='transform-gpu' size={16} strokeWidth={1.8} />
                                </IconButton>
                            </Reorder.Item>
                        </Tooltip>
                    )
                })}
            </Reorder.Group>
        </div>
    )
}

const TabIcon = ({ data }: { data: TabData }): JSX.Element => {
    switch (data.type) {
        case TabType.Create: {
            return <NewTableIcon />
        }
        case TabType.Preview: {
            return <TableIcon type={data.tableType} />
        }
        case TabType.Edit: {
            return <IconTableOptions className='text-yellow-500' size={16} stroke={1.7} />
        }
        case TabType.Query:
        case TabType.KeyConsole: {
            return <QueryIcon />
        }
        case TabType.Dashboard: {
            return <DashboardIcon />
        }
        case TabType.SchemaManager: {
            return <SchemaIcon />
        }
        case TabType.FunctionManager: {
            return <FunctionIcon />
        }
        case TabType.TriggerManager: {
            return <TriggerIcon />
        }
        case TabType.ExtensionManager: {
            return <ExtensionIcon />
        }
        case TabType.KeyDetail: {
            return <KeyIcon />
        }
    }
}
