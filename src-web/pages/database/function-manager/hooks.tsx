import useSWR from 'swr'
import { db } from '../db/db'
import { useConnectID } from '../hooks/use-store'

export const useSchemaFunctions = (schema: string) => {
    const connectID = useConnectID()
    const key = connectID !== null && schema !== '' ? ([schema, connectID, 'functions'] as const) : null
    return useSWR(key, ([schema]) => {
        return db.schemaFunctions(schema)
    })
}
