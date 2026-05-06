import { useEffect } from 'react'
import useSWR from 'swr'
import { db } from '../db/db'
import { Entry, useConnectID } from '../hooks/use-store'
import { PreviewEventData, previewListener } from './utils'

// Get the total number of rows in the table
export const useTableRowsCount = ({ schema, table }: Entry, where: string) => {
    const connectID = useConnectID()
    const key = connectID !== null ? ['count', connectID, schema, table, where] : null
    return useSWR(key, () => {
        return db.tableRowsCount(schema, table, where)
    })
}

// Get all columns of the table
export const useTableColumns = ({ schema, table }: Entry) => {
    const connectID = useConnectID()
    const key = connectID !== null ? ['columns', connectID, schema, table] : null
    return useSWR(key, () => {
        return db.tableColumnsInfo(schema, table)
    })
}

// Get all foreign keys and reverse foreign keys of the table
export const useForeignKeys = (entry: Entry) => {
    const connectID = useConnectID()
    const key = connectID !== null ? ['foreignKeys', connectID, entry.schema, entry.table] : null
    return useSWR(key, () => {
        return Promise.all([db.foreignKeys(entry), db.reverseForeignKeys(entry)]).then(
            ([foreignKeys, reverseForeignKeys]) => {
                return {
                    foreignKeys,
                    reverseForeignKeys
                }
            }
        )
    })
}

// Get all data rows of the table
export const useTableRows = (sql: string) => {
    const connectID = useConnectID()
    const key = connectID !== null ? ['rows', connectID, sql] : null
    return useSWR(key, () => {
        return db
            .query(sql)
            .then((data) => {
                return {
                    data,
                    queryTime: Date.now()
                }
            })
            .catch((error) => {
                throw {
                    error,
                    queryTime: Date.now()
                }
            })
    })
}

export type TableData = NonNullable<ReturnType<typeof useTableRows>['data']>

export const usePreviewListener = (entry: Entry, fn: (data: PreviewEventData) => void) => {
    useEffect(() => {
        const id = previewListener.listen(entry, fn)
        return () => {
            previewListener.remove(id)
        }
    }, [entry, fn])
}
