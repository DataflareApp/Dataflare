import init, { FuzzySearch } from '@wyhaya/fuzzy-search'
import { useMemo } from 'react'
import { create } from 'zustand'

const useWasm = create<{
    initialized: boolean
    loadWasm: () => void
}>((set, get) => {
    let initPromise = null as Promise<void> | null
    return {
        initialized: false,
        loadWasm: () => {
            if (initPromise !== null) {
                return
            }
            initPromise = init().then(() => {
                set({ initialized: true })
            })
        }
    }
})

// prettier-ignore
export function useFuzzySearch(list: string[] | undefined, search: string | null): string[]
// prettier-ignore
export function useFuzzySearch<T>(list: T[] | undefined, search: string | null, getSearchItem: (item: T) => string): T[]
// prettier-ignore
export function useFuzzySearch<T>(list: T[] | undefined, search: string | null, getSearchItem?: (item: T) => string): T[] {
    const { initialized, loadWasm } = useWasm()

    const fuzzy = useMemo(() => {
        // For simplicity, we don't actively call .free() on useEffect unmount here
        // wasm-bindgen supports automatic memory release via FinalizationRegistry
        return initialized ? new FuzzySearch() : null
    }, [initialized])

    useMemo(() => {
        if (fuzzy === null) {
            return
        }
        if (list === undefined || list.length === 0) {
            fuzzy.clear_items()
        } else {
            const items = getSearchItem === undefined ? (list as string[]) : list.map(getSearchItem)
            fuzzy.update_items(items)
        }
    }, [fuzzy, list])

    const filtered = useMemo(() => {
        if (list === undefined || search === null || search === '') {
            return list ?? []
        }
        if (fuzzy === null) {
            loadWasm()
            return list ?? []
        }
        const results = fuzzy.search(search)
        const sorted = Array.from(results).map((i) => list[i])
        return sorted
    }, [fuzzy, list, search])

    return filtered
}
