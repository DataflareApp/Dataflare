import { Connection, QueryItem } from '../../../tauri'
import { TableType } from '../db/db'
import { Entry } from '../hooks/use-store'

export enum SearchType {
    NewTable,
    NewQuery,
    AiAssistant,
    ManageConnection,
    Dashboard,
    SchemaManager,
    FunctionManager,
    TriggerManager,
    ExtensionManager,
    Table,
    Query,
    Connection,
    Reconnect,
    KeyConsole,
    BackupDatabase
}

export type SearchItem = (
    | {
          type: SearchType.NewTable
      }
    | {
          type: SearchType.NewQuery
      }
    | {
          type: SearchType.AiAssistant
      }
    | {
          type: SearchType.ManageConnection
      }
    | {
          type: SearchType.Dashboard
      }
    | {
          type: SearchType.SchemaManager
      }
    | {
          type: SearchType.FunctionManager
      }
    | {
          type: SearchType.TriggerManager
      }
    | {
          type: SearchType.ExtensionManager
      }
    | {
          type: SearchType.Table
          data: Entry
          tableType: TableType
      }
    | {
          type: SearchType.Query
          data: QueryItem
      }
    | {
          type: SearchType.Connection
          data: Connection
      }
    | {
          type: SearchType.Reconnect
      }
    | {
          type: SearchType.KeyConsole
      }
    | {
          type: SearchType.BackupDatabase
      }
) & {
    title: string
    icon: JSX.Element
}
