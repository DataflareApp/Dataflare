import { IconCarCrash, IconHistory, IconPlus } from '@tabler/icons-react'
import React, { memo, useEffect, useState } from 'react'
import { useTranslation } from '../../../i18n'
import { Chat, ClientData } from '../../../tauri'
import { DropdownMenu, IconButton, showRenameDialog } from '../../../ui'
import { useConnection, useIsKv } from '../hooks/use-store'
import { ChatView } from './chat'
import { ChatList } from './chat-list'
import { useChats } from './hooks'
import { ToolSettings } from './tool-settings'

const UnsupportedPanel = () => {
    const { t } = useTranslation()
    return (
        <div className='flex size-full flex-col items-center justify-center px-4'>
            <IconCarCrash size={64} strokeWidth={1.5} className='text-tertiary' />
            <p className='mt-3 text-base text-tertiary'>{t('aiAssistant')}</p>
            <p className='mt-1 text-center text-xs text-quarternary'>{t('onlySupportSqlDatabase')}</p>
        </div>
    )
}

const ChatPanel = memo(() => {
    const { t } = useTranslation()
    const cid = useConnection().cid
    const [chat, setChat] = useState<Chat | null>(null)
    const { chats, mutate, onUpdateChat } = useChats()

    // If there are no sessions, automatically create a new one
    useEffect(() => {
        chats && chats.length === 0 && onCreateChat()
    }, [chats])

    if (chats !== undefined) {
        if (chat !== null && chats.length === 0) {
            setChat(null)
        }
        // By default, open the most recently accessed session
        if (chat === null && chats.length > 0) {
            const mostRecentChat = chats.reduce((prev, current) => {
                return current.lastAccessedAt > prev.lastAccessedAt ? current : prev
            })
            setChat(mostRecentChat)
        }
    }

    const onCreateChat = async () => {
        if (chats === undefined) {
            return
        }
        const id = await ClientData.createChat(cid)
        const now = Date.now()
        const newChat: Chat = { id, name: '', lastMessageAt: now, lastAccessedAt: now }
        setChat(newChat)
        mutate([newChat, ...chats], { revalidate: false })
    }

    const onRenameChat = () => {
        if (chat === null || chats === undefined) {
            return
        }
        showRenameDialog({
            from: chat.name,
            onHandler: (to) => ClientData.updateChatName(chat.id, to),
            onSuccess: (name) => {
                onUpdateChat(chat.id, 'name', name)
                setChat({ ...chat, name })
            }
        })
    }

    const chatName = chat?.name === '' ? t('newChat') : chat?.name

    return (
        <div className='flex size-full flex-col'>
            <div
                className='flex h-10 items-center border-b border-separator bg-zinc-100 px-4 dark:bg-zinc-900'
                data-tauri-drag-region
            >
                <IconButton
                    className='-ml-2 flex-1 truncate text-left text-sm'
                    title={t('rename')}
                    onClick={onRenameChat}
                >
                    {chatName}
                </IconButton>
                <IconButton title={t('newChat')} onClick={() => onCreateChat()}>
                    <IconPlus size={16} strokeWidth={1.5} />
                </IconButton>
                <DropdownMenu
                    trigger={
                        <IconButton title={t('chats')}>
                            <IconHistory size={16} strokeWidth={1.5} />
                        </IconButton>
                    }
                    className='!p-0'
                >
                    <ChatList chat={chat} setChat={setChat} />
                </DropdownMenu>
                <ToolSettings />
            </div>
            {chat !== null && (
                <ChatView
                    key={chat.id}
                    chatID={chat.id}
                    setChat={setChat as React.Dispatch<React.SetStateAction<Chat>>}
                />
            )}
        </div>
    )
})

const Panel = () => {
    const kv = useIsKv()
    return kv ? <UnsupportedPanel /> : <ChatPanel />
}

export default Panel
