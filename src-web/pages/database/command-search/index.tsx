import { lazy, Suspense } from 'react'
import { create } from 'zustand'
import { useShortcutMeta } from '../../../hooks/use-shortcut'

export const useCommandSearch = create<{
    show: boolean
    showCommandSearch: () => void
    hideCommandSearch: () => void
}>((set) => {
    return {
        show: false,
        showCommandSearch: () => set({ show: true }),
        hideCommandSearch: () => set({ show: false })
    }
})

const LazyCommnadSearch = lazy(() => import('./command-search'))

export const CommnadSearch = () => {
    const { show, showCommandSearch, hideCommandSearch } = useCommandSearch()

    useShortcutMeta('p', (_, shift) => {
        !shift && showCommandSearch()
    })

    if (!show) {
        return null
    }

    return (
        <Suspense>
            <LazyCommnadSearch onClose={hideCommandSearch} />
        </Suspense>
    )
}
