import { IconDotsVertical, IconTrash } from '@tabler/icons-react'
import React from 'react'
import { useTranslation } from '../../../i18n'
import { Chat, ClientData } from '../../../tauri'
import { DropdownMenu, DropdownMenuItem, dropdownMenuSize, IconButton, ScrollView } from '../../../ui'
import { formatTimeAgo } from '../../../utils/format'
import { useConnection } from '../hooks/use-store'
import { useChats } from './hooks'

interface ChatListProps {
    chat: Chat | null
    setChat: (chat: Chat | null) => void
}

export const ChatList = ({ chat, setChat }: ChatListProps) => {
    const { t, relativeTimeUtil } = useTranslation()
    const cid = useConnection().cid
    const { chats, mutate, onUpdateChat } = useChats()

    const onDeleteAllChats = async () => {
        if (chats === undefined) {
            return
        }
        const newChat = await ClientData.deleteAllChats(cid)
        setChat(newChat)
        mutate([newChat], { revalidate: false })
    }

    const onDeleteChat = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation()
        if (chats === undefined) {
            return
        }
        if (chats.length === 1) {
            return onDeleteAllChats()
        }
        await ClientData.deleteChat(id)
        const newChats = chats.filter((c) => c.id !== id)
        await mutate(newChats, { revalidate: false })
        if (id === chat?.id) {
            setChat(null)
        }
    }

    const onSwitchChat = (item: Chat) => {
        setChat(item)
        onUpdateChat(item.id, 'lastAccessedAt', Date.now())
    }

    return (
        <ScrollView axis='y' viewportClassName='px-1 pb-1' style={dropdownMenuSize}>
            <div className='mb-1 flex h-10 items-center justify-between border-b border-separator pl-4 pr-2'>
                <span className='text-sm text-primary'>{t('chats')}</span>
                <DropdownMenu
                    trigger={
                        <IconButton title={t('deleteAllChats')}>
                            <IconDotsVertical size={16} strokeWidth={1.5} />
                        </IconButton>
                    }
                >
                    <DropdownMenuItem onClick={onDeleteAllChats} className='hover:text-red-500'>
                        {t('deleteAllChats')}
                    </DropdownMenuItem>
                </DropdownMenu>
            </div>
            {chats?.map((item) => {
                const selected = item.id === chat?.id
                return (
                    <DropdownMenuItem key={item.id} onClick={() => onSwitchChat(item)} className='gap-2'>
                        <div
                            data-selected={selected || undefined}
                            className='aspect-square w-2 rounded-full data-[selected]:bg-green-500'
                        />
                        <div title={item.name} className='min-w-24 max-w-96 truncate'>
                            {item.name === '' ? t('newChat') : item.name}
                        </div>
                        <span className='ml-auto text-xs text-tertiary'>
                            {formatTimeAgo(item.lastMessageAt, t, relativeTimeUtil)}
                        </span>
                        <IconButton
                            title={t('delete')}
                            className='-mx-2 hover:text-red-500'
                            onClick={(e) => onDeleteChat(e, item.id)}
                        >
                            <IconTrash size={16} strokeWidth={1.5} />
                        </IconButton>
                    </DropdownMenuItem>
                )
            })}
        </ScrollView>
    )
}
