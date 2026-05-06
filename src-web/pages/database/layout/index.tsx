import { IconMessage, IconMessageFilled } from '@tabler/icons-react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { memo, useMemo } from 'react'
import { useShortcutMeta, useShortcutMetaNumber } from '../../../hooks/use-shortcut'
import { useTranslation } from '../../../i18n'
import { Connection, showConnectionsWindow } from '../../../tauri'
import { Direction, IconButton, Persistent, Pin, SplitView, Titlebar } from '../../../ui'
import { keyboardTitleChars, KeyModifier } from '../../../utils/keyboard-char'
import { ChatPanel, initChatPanelStatus, useChatPanel } from '../ai'
import { CommnadSearch } from '../command-search'
import { TabNavigate, useConnection, useDbStore, useIsKv, useTabsStore } from '../hooks/use-store'
import { KeysList } from '../keys-list'
import { QueryList } from '../query-list'
import { Settings } from '../settings'
import { TableList } from '../table-list'
import { getTabTitle } from '../utils/tab'
import { Right } from './right'

const conn = JSON.parse((window as any)['__CONNECTION'] as string) as Connection
if (import.meta.env.DEV) {
    console.log(conn)
}
useDbStore.getState().connect(conn)

initChatPanelStatus(conn.cid)

export const Main = () => {
    const { t } = useTranslation()
    const connection = useConnection()
    const closeTab = useTabsStore((state) => state.closeTab)
    const switchTabTo = useTabsStore((state) => state.switchTabTo)
    const activeTab = useTabsStore((state) => state.activeTab)
    const resetTabs = useTabsStore((state) => state.resetTabs)
    const { chatPanelOpened, toggleChatPanel } = useChatPanel()

    const title = useMemo(() => {
        if (activeTab === null) {
            return connection.name
        }
        return `${getTabTitle(activeTab)} — ${connection.name}`
    }, [activeTab, connection])

    useShortcutMeta('w,n,i,[,]', (key, shift) => {
        switch (key) {
            case 'w': {
                if (activeTab === null) {
                    getCurrentWindow().close()
                } else {
                    shift ? resetTabs() : closeTab(activeTab)
                }
                break
            }
            case 'n': {
                !shift && showConnectionsWindow()
                break
            }
            case 'i': {
                shift && toggleChatPanel()
                break
            }
            case '[': {
                !shift && switchTabTo(TabNavigate.Prev)
                break
            }
            case ']': {
                !shift && switchTabTo(TabNavigate.Next)
                break
            }
        }
    })

    useShortcutMetaNumber(switchTabTo)

    const chatTitle = keyboardTitleChars(t('aiAssistant'), [KeyModifier.Shift, KeyModifier.Meta, 'I'])

    return (
        <div className='flex h-full flex-col'>
            <Titlebar title={title} titleSemibold={false}>
                <IconButton title={chatTitle} onClick={() => toggleChatPanel()}>
                    {chatPanelOpened ? (
                        <IconMessageFilled size={16} strokeWidth={1.5} />
                    ) : (
                        <IconMessage size={16} strokeWidth={1.5} />
                    )}
                </IconButton>
            </Titlebar>

            <SplitView
                direction={Direction.Horizontal}
                pin={Pin.First}
                defaultPinSize={220}
                minPinSize={180}
                maxPinSize={520}
                className='flex-1 overflow-hidden'
                id='main'
                persistent={Persistent.Permanent}
            >
                <div className='flex size-full flex-col bg-zinc-100 dark:bg-zinc-900'>
                    <Left />
                    <Settings />
                </div>
                <SplitView
                    className='h-full'
                    id='chatPanel'
                    direction={Direction.Horizontal}
                    persistent={Persistent.Permanent}
                    pin={Pin.Last}
                    minPinSize={200}
                    defaultPinSize={320}
                    maxPinSize={720}
                    minFlexSize={192}
                >
                    <div className='flex h-full flex-col overflow-hidden'>
                        <Right />
                    </div>
                    {chatPanelOpened && <ChatPanel />}
                </SplitView>
            </SplitView>

            <CommnadSearch />
        </div>
    )
}

const Left = memo(() => {
    const isKv = useIsKv()

    return isKv ? (
        <div className='group flex min-h-0 flex-1 flex-col'>
            <KeysList />
        </div>
    ) : (
        <SplitView
            direction={Direction.Vertical}
            pin={Pin.Last}
            defaultPinSize={220}
            minPinSize={160}
            minFlexSize={200}
            className='min-h-0 flex-1'
            id='list'
            persistent={Persistent.Permanent}
        >
            <TableList />
            <QueryList />
        </SplitView>
    )
})
