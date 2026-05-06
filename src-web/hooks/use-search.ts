import { useCallback, useRef, useState } from 'react'

export interface Search<T> {
    displaySearch: T
    search: T
    setSearch: (value: string, nodelay?: boolean) => void
}

// prettier-ignore
export function useSearch(init: string, delay: number): Search<string>
// prettier-ignore
export function useSearch(init: string | null, delay: number, updateCallback?: (value: string) => void): Search<string | null>
// prettier-ignore
export function useSearch(init: string | null, delay: number, updateCallback?: (value: string) => void): Search<string | null> {
    const [displaySearch, setDisplaySearch] = useState(init)
    const [search, setSearch] = useState(displaySearch)
    const timer = useRef<number>()

    const update = useCallback(
        (value: string, nodelay?: boolean) => {
            setDisplaySearch(value)
            clearTimeout(timer.current)
            if (nodelay || value === '') {
                setSearch(value)
                updateCallback?.(value)
                return
            }
            timer.current = setTimeout(() => {
                setSearch(value)
                updateCallback?.(value)
            }, delay)
        },
        [delay, updateCallback]
    )

    return {
        displaySearch,
        search,
        setSearch: update
    }
}
