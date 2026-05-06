import { t } from '../../../i18n'
import { TabData, TabType } from '../hooks/use-store'
import { keyEq } from './kv'

export const tabEqual = (a: TabData, b: TabData | null): boolean => {
    if (a.type !== b?.type) {
        return false
    }
    switch (a.type) {
        case TabType.Create:
        case TabType.Dashboard:
        case TabType.SchemaManager:
        case TabType.FunctionManager:
        case TabType.TriggerManager:
        case TabType.ExtensionManager:
        case TabType.KeyConsole:
            return true
        case TabType.Preview: {
            return (
                b.type === TabType.Preview &&
                a.entry.schema === b.entry.schema &&
                a.entry.table === b.entry.table &&
                a.tableType === b.tableType
            )
        }
        case TabType.Edit: {
            return (
                b.type === TabType.Edit &&
                a.entry.schema === b.entry.schema &&
                a.entry.table === b.entry.table
            )
        }
        case TabType.Query: {
            return b.type === TabType.Query && a.query.qid === b.query.qid
        }
        case TabType.KeyDetail: {
            return (
                b.type === TabType.KeyDetail &&
                a.entry.namespace.id === b.entry.namespace.id &&
                keyEq(a.entry.key, b.entry.key)
            )
        }
    }
}

export const getTabName = (data: TabData): string => {
    switch (data.type) {
        case TabType.Preview:
        case TabType.Edit: {
            return data.entry.table
        }
        case TabType.Query: {
            return data.query.name
        }
        case TabType.Create: {
            return t('newTable')
        }
        case TabType.SchemaManager: {
            return t('schemaManager')
        }
        case TabType.Dashboard: {
            return t('dashboard')
        }
        case TabType.FunctionManager: {
            return t('functionManager')
        }
        case TabType.TriggerManager: {
            return t('triggerManager')
        }
        case TabType.ExtensionManager: {
            return t('extensionManager')
        }
        case TabType.KeyDetail: {
            return data.entry.key.value
        }
        case TabType.KeyConsole: {
            return t('console')
        }
    }
}

export const getTabTitle = (data: TabData): string => {
    switch (data.type) {
        case TabType.Preview: {
            return data.entry.schema + '.' + data.entry.table
        }
        case TabType.Edit: {
            return data.entry.schema + '.' + data.entry.table
        }
        case TabType.Query: {
            return data.query.name
        }
        case TabType.Create: {
            return t('newTable')
        }
        case TabType.SchemaManager: {
            return t('schemaManager')
        }
        case TabType.Dashboard: {
            return t('dashboard')
        }
        case TabType.FunctionManager: {
            return t('functionManager')
        }
        case TabType.TriggerManager: {
            return t('triggerManager')
        }
        case TabType.ExtensionManager: {
            return t('extensionManager')
        }
        case TabType.KeyConsole: {
            return t('console')
        }
        case TabType.KeyDetail: {
            const namespace = data.entry.namespace.title ?? data.entry.namespace.id
            return namespace + ' -> ' + data.entry.key.value
        }
    }
}

export const getTabId = (data: TabData): string => {
    switch (data.type) {
        case TabType.Create: {
            return 'NewTable'
        }
        case TabType.Query: {
            return data.query.qid
        }
        case TabType.Preview: {
            return `${data.tableType}:${data.entry.schema}.${data.entry.table}`
        }
        case TabType.Edit: {
            return `edit:${data.entry.schema}.${data.entry.table}`
        }
        case TabType.SchemaManager: {
            return `SchemaManager`
        }
        case TabType.Dashboard: {
            return `Dashboard`
        }
        case TabType.FunctionManager: {
            return `FunctionManager`
        }
        case TabType.TriggerManager: {
            return `TriggerManager`
        }
        case TabType.ExtensionManager: {
            return 'ExtensionManager'
        }
        case TabType.KeyDetail: {
            return `kv:${data.entry.namespace.id}.${data.entry.key.value}`
        }
        case TabType.KeyConsole: {
            return 'KeyConsole'
        }
    }
}

export class TabsMru {
    private list: TabData[]
    constructor() {
        this.list = []
    }

    public clear(): void {
        this.list = []
    }

    public remove(data: TabData | TabData[]): void {
        if (Array.isArray(data)) {
            for (const item of data) {
                this.remove(item)
            }
            return
        }
        const index = this.list.findIndex((item) => tabEqual(item, data))
        if (index >= 0) {
            this.list.splice(index, 1)
        }
    }

    public insert(data: TabData): void {
        this.remove(data)
        this.list.push(data)
    }

    public replace(from: TabData, to: TabData) {
        const index = this.list.findIndex((item) => tabEqual(item, from))
        if (index >= 0) {
            this.list[index] = to
        }
    }

    public get latest(): TabData | null {
        if (this.list.length > 0) {
            return this.list[this.list.length - 1]
        }
        return null
    }
}
