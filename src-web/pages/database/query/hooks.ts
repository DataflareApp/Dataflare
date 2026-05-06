import { useCallback, useEffect, useRef, useState } from 'react'
import useSWRImmutable from 'swr/immutable'
import { t, useTranslation } from '../../../i18n'
import { ClientData, Query, Sql, SqlConnection, SqlDatabaseType, StatementPosition } from '../../../tauri'
import { showMessageBox } from '../../../ui'
import { db } from '../db/db'
import { useReadonly } from '../hooks/use-db'
import { useConnectedID, useConnectID, useConnection } from '../hooks/use-store'
import { Completion, getValuesInRanges, EditorUtils, GetSqlType } from '../sql-editor'

export const useQueryContent = (queryId: string) => {
    const { t } = useTranslation()
    const [queryContent, setQueryContent] = useState<undefined | string>(undefined)
    const timer = useRef<number | null>(null)
    const notSaved = useRef<string | null>(null)

    const updateQueryContent = useCallback(
        (content: string) => {
            setQueryContent(content)
            notSaved.current = content
            if (timer.current !== null) {
                clearTimeout(timer.current)
                timer.current = null
            }
            timer.current = setTimeout(() => {
                notSaved.current = null
                ClientData.updateQuery(queryId, content)
            }, 2000)
        },
        [queryId]
    )

    useEffect(() => {
        ClientData.queryContent(queryId)
            .then(setQueryContent)
            .catch((err: any) => {
                showMessageBox(t('error'), err, 'error')
            })
        return () => {
            if (timer.current !== null) {
                clearTimeout(timer.current)
            }
            if (notSaved.current !== null) {
                ClientData.updateQuery(queryId, notSaved.current)
            }
        }
    }, [queryId])

    return {
        queryContent,
        updateQueryContent
    }
}

// TODO: Use LRU cache
const EMPTY: StatementPosition[] = []
export const useStatementsPosition = (sql: string | undefined): StatementPosition[] => {
    const dbType = (useConnection() as SqlConnection).config.type
    const { data, error } = useSWRImmutable(
        ['position', sql],
        () => {
            if (sql === undefined || sql === '') {
                return EMPTY
            }
            return Sql.statementsPosition(dbType, sql)
        },
        {
            keepPreviousData: true,
            shouldRetryOnError: false
        }
    )
    if (error !== undefined) {
        return EMPTY
    }
    return data ?? EMPTY
}

// TODO:
// 1. Currently can only refresh after executing SQL; if suggested items change elsewhere, this won't know
// 2. Should be able to refresh individually instead of all at once
export const useEditorCompletions = (): [Completion[] | undefined, () => void] => {
    const connectedID = useConnectedID()
    const timer = useRef<number | null>(null)
    const key = connectedID !== null ? ['completionItems', connectedID] : null
    const { data, mutate } = useSWRImmutable(key, () => {
        return db.completionItems()
    })
    const refresh = () => {
        if (timer.current !== null) {
            clearTimeout(timer.current)
        }
        timer.current = setTimeout(() => {
            timer.current = null
            mutate()
        }, 3000)
    }
    return [data, refresh]
}

export enum QueryStatus {
    Running,
    Waiting,
    Stopped,
    Over
}

export type QueryResult =
    | {
          status: QueryStatus.Running | QueryStatus.Waiting | QueryStatus.Stopped
          sql: string
          name: string
      }
    | {
          status: QueryStatus.Over
          name: string
          sql: string
          queryTime: number
          result:
              | {
                    success: true
                    query: Query
                }
              | {
                    success: false
                    error: string
                }
      }

export type TaskStatement = { name: string; sql: string }

export interface QueryTasks {
    isRunning: boolean
    tasks: QueryResult[] | undefined
    runTasks: (statements: TaskStatement[]) => Promise<string[]>
    stopTasks: () => void
    resetTasks: () => void
}

export const useQueryTasks = (cid: string, queryId: string): QueryTasks => {
    const readonly = useReadonly()
    const [isRunning, setIsRunning] = useState(false)
    const [tasks, setTasks] = useState<undefined | QueryResult[]>(undefined)
    const lastId = useRef(Number.MIN_SAFE_INTEGER)
    const connectID = useConnectID()
    const conn = useConnection() as SqlConnection

    const runTasks = async (statements: TaskStatement[]) => {
        let id = lastId.current + 1
        lastId.current = id
        setIsRunning(true)
        setTasks(
            statements.map((info) => {
                return {
                    status: QueryStatus.Waiting,
                    sql: info.sql,
                    name: info.name
                }
            })
        )
        let completedSqls: string[] = []
        for (let i = 0; i < statements.length; i++) {
            if (id !== lastId.current) {
                break
            }
            setTasks((tasks) => {
                const newTasks = [...(tasks as QueryResult[])]
                newTasks[i].status = QueryStatus.Running
                return newTasks
            })
            const rst = await queryTask(cid, queryId, statements[i], readonly, conn.config.type)
            if (rst.status === QueryStatus.Over && rst.result.success) {
                completedSqls.push(statements[i].sql)
            }
            if (id !== lastId.current) {
                break
            }
            setTasks((tasks) => {
                const newTasks = [...(tasks as QueryResult[])]
                newTasks[i] = rst
                return newTasks
            })
        }
        if (id === lastId.current) {
            setIsRunning(false)
        }
        return completedSqls
    }

    const stopTasks = () => {
        lastId.current += 1
        setIsRunning(false)
        if (tasks === undefined) {
            return
        }
        setTasks((tasks) => {
            if (tasks === undefined) {
                return undefined
            }
            const newTasks = [...(tasks as QueryResult[])]
            for (const task of newTasks) {
                if (task.status === QueryStatus.Running || task.status === QueryStatus.Waiting) {
                    task.status = QueryStatus.Stopped
                }
            }
            return newTasks
        })
    }

    const resetTasks = () => {
        lastId.current += 1
        setIsRunning(false)
        setTasks(undefined)
    }

    // Cancel remaining tasks whenever the component unmounts or the connection switches
    useEffect(() => {
        return resetTasks
    }, [connectID])

    return {
        isRunning,
        tasks,
        runTasks,
        stopTasks,
        resetTasks
    }
}

const queryTask = async (
    cid: string,
    queryId: string,
    info: TaskStatement,
    readonly: boolean,
    type: SqlDatabaseType
): Promise<QueryResult> => {
    const now = Date.now()

    if (readonly) {
        const r = await Sql.statementReadonly(type, info.sql)
        if (!r) {
            return {
                status: QueryStatus.Over,
                name: info.name,
                sql: info.sql,
                queryTime: now,
                result: {
                    success: false,
                    error: t('connectionReadonlyError')
                }
            }
        }
    }

    try {
        const query = await db.query(info.sql)
        ClientData.createQueryHistory(cid, queryId, info.sql, null)
        return {
            status: QueryStatus.Over,
            name: info.name,
            sql: info.sql,
            queryTime: Date.now(),
            result: {
                success: true,
                query
            }
        }
    } catch (error: any) {
        ClientData.createQueryHistory(cid, queryId, info.sql, error)
        return {
            status: QueryStatus.Over,
            name: info.name,
            sql: info.sql,
            queryTime: Date.now(),
            result: {
                success: false,
                error
            }
        }
    }
}

export const getTaskStatements = async (
    editor: React.MutableRefObject<EditorUtils | null>,
    db: SqlDatabaseType,
    type: GetSqlType
): Promise<TaskStatement[]> => {
    let sqls: string[]
    switch (type) {
        case GetSqlType.CurrentStatement: {
            const sql = editor.current?.getSQL(type) ?? null
            if (sql !== null && sql !== '') {
                sqls = [sql]
                break
            }
            return []
        }
        case GetSqlType.SelectionValue: {
            const value = editor.current?.getSQL(type) ?? null
            if (value !== null) {
                const positions = await Sql.statementsPosition(db, value)
                if (positions.length > 0) {
                    sqls = getValuesInRanges(value, positions)
                    break
                }
            }
            return []
        }
        case GetSqlType.AllStatement: {
            const values = editor.current?.getSQL(type) ?? null
            if (values !== null && values.length > 0) {
                sqls = values
                break
            }
            return []
        }
    }
    return sqls.map((sql) => {
        return {
            sql,
            name: statementName(sql)
        }
    })
}

const statementName = (sql: string): string => {
    const match = sql.trimStart().match(/^[a-zA-Z]+/)
    if (match && match.length > 0) {
        const keyword = match[0].toUpperCase()
        return keyword
    }
    return 'Unknown'
}
