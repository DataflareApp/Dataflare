import { useRef, useState } from 'react'

export const useSelectedRows = (rows: number) => {
    const [selectedRows, setSelectedRows] = useState(() => {
        return new Set<number>()
    })
    const maxIndex = useRef<number | null>(null)
    const lastIndex = useRef<number | null>(null)

    if (
        selectedRows.size > rows ||
        (maxIndex.current === null && selectedRows.size > 0) ||
        (maxIndex.current !== null && maxIndex.current > rows - 1) ||
        (lastIndex.current === null && selectedRows.size > 0) ||
        (lastIndex.current !== null && lastIndex.current > rows - 1)
    ) {
        maxIndex.current = null
        lastIndex.current = null
        setSelectedRows(new Set())
    }

    return {
        selectedRows,

        selectAllRows: () => {
            const indexs = Array.from({ length: rows }, (_, i) => i)
            maxIndex.current = indexs.length - 1
            setSelectedRows(new Set(indexs))
        },

        cancelAllSelectedRows: () => {
            maxIndex.current = null
            lastIndex.current = null
            setSelectedRows(new Set())
        },

        toggleSelectedRow: (i: number) => {
            const set = new Set<number>(selectedRows)
            if (set.has(i)) {
                set.delete(i)
            } else {
                set.add(i)
                lastIndex.current = i
            }
            maxIndex.current = set.size === 0 ? null : Math.max(...set)
            setSelectedRows(set)
        },

        rangeSelectRows: (i: number) => {
            if (lastIndex.current === null) {
                return
            }
            const start = Math.min(lastIndex.current, i)
            const end = Math.max(lastIndex.current, i)
            maxIndex.current = end
            const set = new Set<number>()
            for (let idx = start; idx <= end; idx++) {
                set.add(idx)
            }
            setSelectedRows(set)
        },

        changeSelectedRow: (i: number) => {
            maxIndex.current = i
            lastIndex.current = i
            const set = new Set<number>([i])
            setSelectedRows(set)
        },

        contextMenuChangeSelected: (i: number) => {
            if (selectedRows.has(i)) {
                return
            }
            maxIndex.current = i
            lastIndex.current = i
            setSelectedRows(new Set([i]))
        }
    } as const
}
