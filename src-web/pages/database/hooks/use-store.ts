import { create } from 'zustand'
import {
    Connection,
    DatabaseType,
    Key,
    KvDatabaseType,
    NameSpace,
    QueryItem,
    SqlDatabaseType
} from '../../../tauri'
import { db, TableType } from '../db/db'
import { tabEqual, TabsMru } from '../utils/tab'

let counterID = 0
export const useDbStore = create<{
    connectError: string | null
    connection: Connection
    // ID of last completed connection / regardless of success or failure
    connectID: number | null
    // ID of last successful connection
    connectedID: number | null
    // Whether the current connection is a KV database
    isKv: boolean
    connect: (connection: Connection) => Promise<void>
}>((set) => {
    return {
        connectError: null,
        // connect is called once when the page first loads, so this is safe
        connection: {} as Connection,
        connectID: null,
        connectedID: null,
        // connect is called once when the page first loads, so this is safe
        isKv: false,
        connect: async (connection) => {
            const connectID = (counterID += 1)
            set({
                connectError: null,
                connection,
                connectID: null,
                connectedID: null,
                isKv: isKv(connection.config.type)
            })
            try {
                await db.connect(connection.config)
                if (connectID == counterID) {
                    set({
                        connectError: null,
                        connectID,
                        connectedID: connectID
                    })
                }
            } catch (error: any) {
                if (connectID === counterID) {
                    set({
                        connectError: error,
                        connectID,
                        connectedID: null
                    })
                }
            }
        }
    }
})

export const useConnection = () => useDbStore((state) => state.connection)
export const useConnectID = () => useDbStore((state) => state.connectID)
export const useConnectedID = () => useDbStore((state) => state.connectedID)
export const useIsKv = () => useDbStore((state) => state.isKv)

const isKv = (type: DatabaseType): boolean => {
    switch (type) {
        case SqlDatabaseType.Sqlite:
        case SqlDatabaseType.SqlCipher:
        case SqlDatabaseType.Postgres:
        case SqlDatabaseType.CockroachDB:
        case SqlDatabaseType.QuestDB:
        case SqlDatabaseType.MySql:
        case SqlDatabaseType.MariaDB:
        case SqlDatabaseType.ManticoreSearch:
        case SqlDatabaseType.MsSql:
        case SqlDatabaseType.ClickHouse:
        case SqlDatabaseType.Databend:
        case SqlDatabaseType.Databricks:
        case SqlDatabaseType.BigQuery:
        case SqlDatabaseType.Presto:
        case SqlDatabaseType.Trino:
        case SqlDatabaseType.Turso:
        case SqlDatabaseType.DuckDB:
        case SqlDatabaseType.Rqlite:
        case SqlDatabaseType.EchoLite:
        case SqlDatabaseType.CloudflareD1:
        case SqlDatabaseType.WorkersAnalyticsEngine:
        case SqlDatabaseType.R2Sql: {
            return false
        }
        case KvDatabaseType.CloudflareWorkersKv:
        case KvDatabaseType.Redis:
        case KvDatabaseType.S3: {
            return true
        }
    }
}

export const enum TabType {
    Create,
    Preview,
    Edit,
    Query,
    Dashboard,
    SchemaManager,
    FunctionManager,
    TriggerManager,
    ExtensionManager,
    KeyDetail,
    KeyConsole
}

export interface Entry {
    schema: string
    table: string
}

export interface KeyEntry {
    namespace: NameSpace
    key: Key
}

export type TabData =
    | {
          type: TabType.Create
          defaultSchema?: string
      }
    | {
          type: TabType.Preview
          entry: Entry
          tableType: TableType
      }
    | {
          type: TabType.Edit
          entry: Entry
      }
    | {
          type: TabType.Query
          query: QueryItem
      }
    | {
          type: TabType.Dashboard
      }
    | {
          type: TabType.SchemaManager
          defaultSchema?: string
      }
    | {
          type: TabType.FunctionManager
      }
    | {
          type: TabType.TriggerManager
      }
    | {
          type: TabType.ExtensionManager
      }
    | {
          type: TabType.KeyDetail
          entry: KeyEntry
      }
    | {
          type: TabType.KeyConsole
      }

type Replace = {
    from: TabData
    to: TabData
}

export const enum TabNavigate {
    Prev = -2,
    Next = -1
}

// Tabs
const TABS_HISTORY = new TabsMru()
export const useTabsStore = create<{
    activeTab: TabData | null
    setActiveTab: (data: TabData) => void
    tabsData: TabData[]
    setTabsData: (tabsData: TabData[]) => void
    resetTabs: () => void
    tabExist: (tab: TabData) => boolean
    switchTabTo: (tab: TabData | TabNavigate | number) => void
    replaceTab: (tab: Replace | Replace[]) => void
    closeTab: (tab: TabData | TabData[]) => void
    closeOtherTabs: (tab: TabData) => void
}>((set, get) => {
    return {
        activeTab: null,
        tabsData: [],
        resetTabs: () => {
            set({
                activeTab: null,
                tabsData: []
            })
            TABS_HISTORY.clear()
        },
        setActiveTab: (data) => {
            set({
                activeTab: data
            })
            TABS_HISTORY.insert(data)
        },
        setTabsData: (tabsData) => {
            set({
                tabsData
            })
        },
        tabExist: (tab) => {
            return get().tabsData.some((item) => {
                return tabEqual(item, tab)
            })
        },
        switchTabTo: (tab) => {
            const store = get()
            // Previous / Next
            if (tab === TabNavigate.Prev || tab === TabNavigate.Next) {
                const current = store.tabsData.findIndex((item) => tabEqual(item, store.activeTab))
                if (current >= 0) {
                    const i =
                        tab === TabNavigate.Next
                            ? (current + 1) % store.tabsData.length
                            : current === 0
                              ? store.tabsData.length - 1
                              : (current - 1) % store.tabsData.length
                    store.setActiveTab(store.tabsData[i])
                }
                return
            }
            // Switch by index
            if (typeof tab === 'number') {
                if (tab > 0 && tab <= store.tabsData.length) {
                    store.setActiveTab(store.tabsData[tab - 1])
                }
                return
            }
            // Does not exist, create a new one
            if (!store.tabExist(tab)) {
                // Create new Tab
                const current = store.tabsData.findIndex((item) => tabEqual(item, store.activeTab))
                if (current >= 0) {
                    store.tabsData.splice(current + 1, 0, tab)
                    store.setTabsData(store.tabsData)
                } else {
                    store.setTabsData([...store.tabsData, tab])
                }
                store.setActiveTab(tab)
                return
            }
            // Already exists, switch to it directly
            store.setActiveTab(tab)
        },
        replaceTab: (tab) => {
            const store = get()
            const tabs = Array.isArray(tab) ? tab : [tab]
            const indexs = tabs.map((item) => {
                return store.tabsData.findIndex((v) => tabEqual(v, item.from))
            })
            const needReplace = indexs.filter((item) => item >= 0)
            if (needReplace.length === 0) {
                return
            }
            const beforeActive = store.tabsData.findIndex((item) => tabEqual(item, store.activeTab))
            const newTabsData = [...store.tabsData]
            tabs.forEach((v, i) => {
                if (indexs[i] >= 0) {
                    newTabsData[indexs[i]] = v.to
                    TABS_HISTORY.replace(v.from, v.to)
                }
            })
            store.setTabsData(newTabsData)
            if (beforeActive >= 0) {
                if (needReplace.includes(beforeActive)) {
                    store.setActiveTab(newTabsData[beforeActive])
                }
            }
        },
        closeTab: (tab) => {
            const store = get()
            const tabs = Array.isArray(tab) ? tab : [tab]
            const indexs = tabs.map((item) => {
                return store.tabsData.findIndex((v) => tabEqual(v, item))
            })
            const needDelete = indexs.filter((item) => item >= 0)
            if (needDelete.length === 0) {
                return
            }
            const newTabsData: (TabData | null)[] = [...store.tabsData]
            tabs.forEach((v, i) => {
                if (indexs[i] >= 0) {
                    newTabsData[indexs[i]] = null
                }
            })
            const lastTabs = newTabsData.filter((item) => item !== null) as TabData[]
            // No tabs left after deletion
            if (lastTabs.length === 0) {
                store.resetTabs()
                return
            }
            store.setTabsData(lastTabs)
            // Remove deleted tabs from history
            TABS_HISTORY.remove(tabs)
            // The tab being deleted is not the currently active one
            let i = tabs.findIndex((item) => tabEqual(item, store.activeTab))
            if (i < 0) {
                return
            }
            // The tab being deleted is the currently active one
            if (TABS_HISTORY.latest !== null) {
                set({
                    activeTab: TABS_HISTORY.latest
                })
            }
        },
        closeOtherTabs: (tab) => {
            set({
                tabsData: [tab],
                activeTab: tab
            })
            TABS_HISTORY.clear()
            TABS_HISTORY.insert(tab)
        }
    }
})
