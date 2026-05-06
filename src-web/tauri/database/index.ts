import { invoke } from '@tauri-apps/api/core'
import { DatabaseConfig } from './config'
import { decodeTask } from './fbon'
import { Keys, NameSpace, KvInput, KvOutput, Cursor, Key, GenericValue, CommandOutput } from './kv'
import { Query, Rows, Value, BatchInsertOptions } from './sql'

export * from './config'
export * from './kv'
export * from './sql'

export const Database = {
    test(config: DatabaseConfig): Promise<string | null> {
        return invoke('test', {
            config
        })
    },
    connect(config: DatabaseConfig): Promise<void> {
        return invoke('connect', {
            config
        })
    },
    close(): Promise<void> {
        return invoke('close', {})
    },
    sql: {
        select<R = Value[]>(sql: string): Promise<Rows<R>> {
            return invoke<ArrayBuffer>('sql_select', {
                sql
            }).then((bytes) => {
                return decodeTask.decode(bytes) as any
            })
        },
        query(sql: string): Promise<Query> {
            return invoke<ArrayBuffer>('sql_query', {
                sql
            }).then((bytes) => {
                return decodeTask.decode(bytes) as any
            })
        },
        async execute(sql: string): Promise<number> {
            const rowsAffected = await invoke<number>('sql_execute', {
                sql
            })
            return rowsAffected
        },
        async transaction(sqls: string[]): Promise<void> {
            await invoke<void>('sql_transaction', {
                sqls
            })
        },
        async batchInsert(options: BatchInsertOptions): Promise<void> {
            await invoke('sql_batch_insert', {
                options
            })
        },
        batchInsertPreview(options: BatchInsertOptions): Promise<string> {
            return invoke('sql_batch_insert_preview', {
                options
            })
        },
        exportBatchInsert(path: string, options: BatchInsertOptions): Promise<void> {
            return invoke('sql_export_batch_insert', {
                path,
                options
            })
        }
    },
    kv: {
        namespaces(): Promise<NameSpace[]> {
            return invoke('kv_namespaces', {})
        },
        keys(namespace: string, cursor: Cursor | null, search: string | null): Promise<Keys> {
            return invoke('kv_keys', {
                namespace,
                cursor,
                search
            })
        },
        get(namespace: string, key: Key): Promise<KvOutput> {
            return invoke('kv_get', {
                namespace,
                key
            })
        },
        getContent(namespace: string, key: Key): Promise<GenericValue> {
            return invoke('kv_get_content', {
                namespace,
                key
            })
        },
        downloadContent(namespace: string, key: Key, path: string): Promise<void> {
            return invoke('kv_download_content', {
                namespace,
                key,
                path
            })
        },
        set(namespace: string, key: Key, value: KvInput): Promise<void> {
            return invoke('kv_set', {
                namespace,
                key,
                value
            })
        },
        delete(namespace: string, key: Key): Promise<void> {
            return invoke('kv_delete', {
                namespace,
                key
            })
        },
        runCommand(namespace: string, command: string, readonly: boolean): Promise<CommandOutput> {
            return invoke('kv_run_command', {
                namespace,
                command,
                readonly
            })
        }
    }
}
