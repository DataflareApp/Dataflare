import { ReactFlow, Background, MiniMap, ReactFlowProvider, Viewport, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import { memo, useState } from 'react'
import { useTranslation } from '../../../i18n'
import { RefreshButton, Autocomplete, Select, Loading, Message, ErrorMessage } from '../../../ui'
import { db } from '../db/db'
import { useSchemaOptions } from '../hooks/use-db'
import { useTables } from '../hooks/use-tables'
import { CopySchema } from './copy-schema'
import { DownloadButton } from './download'
import { useNodesAndEdges } from './hooks'
import { ManagerProps } from './index'
import { Table } from './table'
import { MAX_ZOOM, MIN_ZOOM, ZoomSlider } from './zoom'

const DEFAULT_VIEWPORT: Viewport = {
    x: 0,
    y: 0,
    zoom: 1
}

const MINIMAP_SIZE = {
    width: 160,
    height: 110
}

const nodeTypes = { table: Table }

function ManagerProvider(props: ManagerProps) {
    return (
        <ReactFlowProvider>
            <SchemaManager {...props} />
        </ReactFlowProvider>
    )
}

export default memo(ManagerProvider)

const SchemaManager = ({ defaultSchema, hidden }: ManagerProps) => {
    const { t } = useTranslation()
    const { data: tables } = useTables()
    const { schemas, selectOptions } = useSchemaOptions(tables)
    const [schema, setSchema] = useState(defaultSchema ?? '')
    const {
        data,
        schemaTables,
        onNodesChange,
        isValidating,
        mutate: refresh,
        error
    } = useNodesAndEdges(schema)
    const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT)
    const { getNode, setCenter } = useReactFlow()
    const [jumpTo, setJumpTo] = useState('')

    if (hidden) {
        return null
    }

    if (schemas.length === 0) {
        // No schemas available
        if (schema !== '') {
            setSchema('')
        }
    } else {
        // Selected schema does not exist
        if (!schemas.includes(schema)) {
            setSchema(schemas[0])
        }
    }

    const onChangeSchema = (schema: string) => {
        setViewport({ x: 0, y: 0, zoom: 1 })
        setSchema(schema)
    }

    const onChangeSearch = (val: string, fromSuggestion: boolean) => {
        if (!fromSuggestion) {
            return setJumpTo(val)
        }
        setJumpTo('')
        const node = getNode(val)
        if (node !== undefined) {
            let x = node.position.x + node.width! / 2
            let y = node.position.y + node.height! / 2
            setCenter(x, y, { duration: 300 })
        }
    }

    return (
        <div className='relative min-h-0 flex-1'>
            <div className='absolute left-4 z-10 flex h-11 items-center gap-2'>
                {db.supportsMultipleSchemas() && (
                    <Select
                        className='w-48 bg-main'
                        value={schema}
                        options={selectOptions}
                        onChange={onChangeSchema}
                    />
                )}
                <Autocomplete
                    className='w-48 bg-main'
                    placeholder={t('search')}
                    shortcutKey
                    suggestions={schemaTables}
                    value={jumpTo}
                    onChange={onChangeSearch}
                />
                <ZoomSlider viewport={viewport} setViewport={setViewport} />
                <RefreshButton refreshing={isValidating} onRefresh={() => refresh()} />
                <DownloadButton
                    disabled={isValidating || !(data !== undefined && data.nodes.length > 0)}
                    nodes={data?.nodes}
                    edges={data?.edges}
                    schema={schema}
                />
                <CopySchema
                    disabled={isValidating || !(data !== undefined && data.nodes.length > 0)}
                    nodes={data?.nodes}
                />
            </div>

            {error !== undefined ? (
                <ErrorMessage text={error} />
            ) : data === undefined ? (
                <Loading />
            ) : data.nodes.length === 0 ? (
                <Message text={t('noTable')} />
            ) : (
                <ReactFlow
                    minZoom={MIN_ZOOM}
                    maxZoom={MAX_ZOOM}
                    panOnScroll
                    viewport={viewport}
                    onViewportChange={setViewport}
                    nodes={data.nodes}
                    edges={data.edges}
                    deleteKeyCode={null}
                    nodeTypes={nodeTypes}
                    onNodesChange={onNodesChange}
                    proOptions={{ hideAttribution: true }}
                    onlyRenderVisibleElements
                    nodesConnectable={false}
                >
                    <Background />
                    <MiniMap
                        className='overflow-hidden rounded !bg-main [&_.react-flow\_\_minimap-mask]:fill-black/10 dark:[&_.react-flow\_\_minimap-mask]:fill-black/50'
                        pannable
                        zoomable
                        nodeBorderRadius={10}
                        nodeColor='#0384EC'
                        style={MINIMAP_SIZE}
                    />
                </ReactFlow>
            )}
        </div>
    )
}
