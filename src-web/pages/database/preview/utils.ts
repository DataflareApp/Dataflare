import { tf } from '../../../i18n'
import { ClientData, Query, Value, z } from '../../../tauri'
import { Entry, useDbStore } from '../hooks/use-store'

export const enum PreviewEventType {
    Listen,
    Refresh,
    SetSearch
}

export type PreviewEventData =
    | {
          type: PreviewEventType.Listen
      }
    | {
          type: PreviewEventType.Refresh
      }
    | {
          type: PreviewEventType.SetSearch
          searchValue: string
      }

type Events = Map<
    number,
    {
        entry: Entry
        fn: (data: PreviewEventData) => void
    }
>

class PreviewListener {
    events: Events
    id: number

    constructor() {
        this.events = new Map()
        this.id = 0
    }

    listen(entry: Entry, fn: (data: PreviewEventData) => void) {
        this.id += 1
        this.events.set(this.id, { entry, fn })
        this.send(entry, { type: PreviewEventType.Listen }, this.id)
        return this.id
    }

    remove(id: number) {
        this.events.delete(id)
    }

    send(entry: Entry, data: PreviewEventData, exclude?: number) {
        for (const [id, evt] of this.events.entries()) {
            if (id !== exclude) {
                if (evt.entry.schema === entry.schema && evt.entry.table === entry.table) {
                    evt.fn(data)
                }
            }
        }
    }
}

export const previewListener = new PreviewListener()

export const LimitStorage = {
    default: 100,

    key(entry: Entry) {
        return `limit:${entry.schema}.${entry.table}`
    },

    async get(entry: Entry): Promise<number> {
        let cid = useDbStore.getState().connection.cid
        const value = await ClientData.getStorage(cid, this.key(entry), z.number().positive())
        return value ?? this.default
    },

    set(entry: Entry, limit: number): Promise<void> {
        let cid = useDbStore.getState().connection.cid
        return ClientData.setStorage(cid, this.key(entry), limit, this.default)
    }
}

// prettier-ignore
export function whereItems(rowIndex: number, primaryKeys: string[], data: Query): { column: string; value: Value }[]
// prettier-ignore
export function whereItems(rowIndex: ReadonlySet<number>, primaryKeys: string[], data: Query): { column: string; value: Value }[][]
// prettier-ignore
export function whereItems(rowIndex: number | ReadonlySet<number>, primaryKeys: string[], data: Query) {
    const colIndexs = primaryKeys.map((column) => {
        const colIndex = data.columns.findIndex(({ name }) => name === column)
        if (colIndex < 0) {
            throw tf('hidenPrimaryColumnMsg', column)
        }
        return colIndex
    })
    if (typeof rowIndex === 'number') {
        return colIndexs.map((x) => {
            return {
                column: data.columns[x].name,
                value: data.rows[rowIndex][x]
            }
        })
    }
    return Array.from(rowIndex).map((y) => {
        return colIndexs.map((x) => {
            return {
                column: data.columns[x].name,
                value: data.rows[y][x]
            }
        })
    })
}

export const mergeSelectedSet = (current: ReadonlySet<number> | undefined, selected: ReadonlySet<number>) => {
    // Polyfill
    const isSubsetOf = <T>(a: ReadonlySet<T>, b: ReadonlySet<T>) => {
        if (a.isSubsetOf !== undefined) {
            return a.isSubsetOf(b)
        }
        if (a.size > b.size) {
            return false
        }
        for (const v of a) {
            if (!b.has(v)) {
                return false
            }
        }
        return true
    }
    const difference = <T>(a: ReadonlySet<T>, b: ReadonlySet<T>) => {
        if (a.difference !== undefined) {
            return a.difference(b)
        }
        const result = new Set<T>()
        for (const v of a) {
            if (!b.has(v)) {
                result.add(v)
            }
        }
        return result
    }
    const union = <T>(a: ReadonlySet<T>, b: ReadonlySet<T>) => {
        if (a.union !== undefined) {
            return a.union(b)
        }
        const [larger, smaller] = a.size >= b.size ? [a, b] : [b, a]
        const result = new Set<T>(larger)
        for (const v of smaller) {
            result.add(v)
        }
        return result
    }

    const a = current ?? new Set<number>()
    if (isSubsetOf(selected, a)) {
        return difference(a, selected)
    } else {
        return union(a, selected)
    }
}
