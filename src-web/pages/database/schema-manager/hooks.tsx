import { applyNodeChanges, Node, Edge } from '@xyflow/react'
import { useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { db, SchemaEntry } from '../db/db'
import { useConnectID } from '../hooks/use-store'
import { addLayoutedPosition } from './layout'
import { TableNodeProps } from './table'

export const NODE_WIDTH = 288
export const NODE_HEADER_HEIGHT = 36
export const NODE_COLUMN_HEIGHT = 32

interface NodesAndEdges {
    nodes: Node[]
    edges: Edge[]
    tables: SchemaEntry[]
}

export const useNodesAndEdges = (schema: string) => {
    const connectID = useConnectID()
    const key = schema === '' ? null : ([schema, connectID, 'schema-manager'] as const)

    const { data, mutate, isValidating, error } = useSWR(key, async ([schema]) => {
        const [tables, foreignKeys, indexs] = await Promise.all([
            db.schemaTables(schema),
            db.schemaForeignKeys(schema),
            db.schemaIndexs(schema)
        ])
        const edges = foreignKeys.map((item): Edge => {
            return {
                id: `${item.fromTable}.${item.fromColumn}-${item.toTable}-${item.toColumn}`,
                source: item.fromTable,
                sourceHandle: item.fromColumn,
                target: item.toTable,
                targetHandle: item.toColumn,
                animated: true,
                type: 'smoothstep'
            }
        })
        const nodes = tables.map((item): Node => {
            const data: TableNodeProps['data'] = {
                ...item,
                schema,
                indexs: indexs.get(item.tableName) ?? {}
            }
            return {
                id: item.tableName,
                type: 'table',
                dragHandle: 'header',
                position: { x: 0, y: 0 },
                width: NODE_WIDTH,
                height: NODE_HEADER_HEIGHT + NODE_COLUMN_HEIGHT * item.columns.length,
                data: data as Record<string, any>
            }
        })
        await addLayoutedPosition(nodes, edges)
        return { nodes, edges, tables } as NodesAndEdges
    })

    const onNodesChange = useCallback(
        (changes: any) => {
            if (data === undefined) return
            mutate(
                {
                    nodes: applyNodeChanges(changes, data.nodes),
                    edges: data.edges,
                    tables: data.tables
                },
                {
                    revalidate: false
                }
            )
        },
        [data]
    )

    const schemaTables = useMemo(() => {
        return data?.tables.map((item) => item.tableName) ?? []
    }, [data?.tables])

    return {
        data,
        schemaTables,
        onNodesChange,
        isValidating,
        mutate,
        error
    }
}
