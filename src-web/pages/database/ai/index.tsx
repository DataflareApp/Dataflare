import { lazy, Suspense } from 'react'
import { create } from 'zustand'
import { ClientData, z } from '../../../tauri'
import { useDbStore } from '../hooks/use-store'

const KEY = 'chatPanel'
export const useChatPanel = create<{
    chatPanelOpened: boolean
    toggleChatPanel: (open?: boolean) => void
}>((set, get) => {
    return {
        chatPanelOpened: false,
        toggleChatPanel: (open) => {
            const cid = useDbStore.getState().connection.cid
            const newState = open === undefined ? !get().chatPanelOpened : open
            set({ chatPanelOpened: newState })
            ClientData.setStorage(cid, KEY, newState)
        }
    }
})

export const initChatPanelStatus = async (cid: string) => {
    const chatPanelOpened = await ClientData.getStorage(cid, KEY, z.boolean())
    if (chatPanelOpened !== null) {
        useChatPanel.setState({ chatPanelOpened })
    }
}

const LazyChatPanel = lazy(() => import('./panel'))

export const ChatPanel = () => {
    return (
        <Suspense>
            <LazyChatPanel />
        </Suspense>
    )
}
