import { IconPlus } from '@tabler/icons-react'
import {
    ReactFlow,
    Background,
    applyNodeChanges,
    NodeChange,
    MiniMap,
    useReactFlow,
    ReactFlowProvider,
    Viewport
} from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation, t } from '../../../i18n'
import {
    Button,
    DropdownMenu,
    DropdownMenuItem,
    Autocomplete,
    Popup,
    ErrorMessage,
    Loading,
    Message
} from '../../../ui'
import { MAX_ZOOM, MIN_ZOOM, ZoomSlider } from '../schema-manager/zoom'
import { defaultComposedChartConfig, defaultPieChartConfig, defaultTableConfig } from './config'
import { WidgetEditor } from './editor'
import { useWidgetNodes } from './hooks'
import { DashboardProps } from './index'
import { EditorWidgetData, Widget } from './widget'

const DEFAULT_VIEWPORT: Viewport = {
    x: 16,
    y: 44,
    zoom: 1
}

const MINIMAP_SIZE = {
    width: 160,
    height: 110
}

const SNAP_GRID: [number, number] = [12, 12]

function DashboardProvider(props: any) {
    return (
        <ReactFlowProvider>
            <DashboardManager {...props} />
        </ReactFlowProvider>
    )
}

export default memo(DashboardProvider)

function DashboardManager({ hidden }: DashboardProps) {
    const { t, language } = useTranslation()
    const { nodes, error, mutate, createWidget, updateWidgetConfig, saveWidgetChanges } = useWidgetNodes()
    const { setCenter } = useReactFlow()
    const [viewport, setViewport] = useState(DEFAULT_VIEWPORT)
    const [editorData, setEditorData] = useState<EditorWidgetData | null>(null)
    const [jumpTo, setJumpTo] = useState('')

    // TODO: Needs optimization
    const widgetNames = useMemo(() => {
        const names: string[] = (nodes ?? [])
            .map((item) => item.data.name as string)
            .sort((a, b) => a.localeCompare(b, language))
        return Array.from(new Set(names))
    }, [nodes, language])

    const nodeTypes = useMemo(() => {
        return {
            widget: (props: any) => <Widget {...props} onEditWidget={setEditorData} />
        }
    }, [])

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            for (const changed of changes) {
                if (changed.type === 'position' && changed.position !== undefined) {
                    if (changed.position.x < 0) changed.position.x = 0
                    if (changed.position.y < 0) changed.position.y = 0
                }
            }
            const newNodes = applyNodeChanges(changes, nodes ?? [])
            mutate(newNodes, { revalidate: false })
            saveWidgetChanges(changes)
        },
        [nodes]
    )

    if (hidden) {
        return null
    }

    if (error !== undefined) {
        return <ErrorMessage text={error} />
    }

    if (nodes === undefined) {
        return (
            <div className='flex-1 overflow-hidden'>
                <Loading />
            </div>
        )
    }

    const onChangeSearch = (val: string, fromSuggestion: boolean) => {
        if (!fromSuggestion) {
            return setJumpTo(val)
        }
        setJumpTo('')
        const node = nodes?.find((item) => item.data.name === val)
        if (node === undefined || node.width === undefined || node.height === undefined) {
            return
        }
        const x = node.position.x + node.width / 2
        const y = node.position.y + node.height / 2
        setCenter(x, y, { duration: 300 })
    }

    return (
        <div className='relative flex-1 overflow-hidden'>
            <div className='absolute left-4 z-10 flex h-11 items-center gap-2'>
                <Autocomplete
                    className='w-48 bg-main'
                    placeholder={t('search')}
                    shortcutKey
                    suggestions={widgetNames}
                    value={jumpTo}
                    onChange={onChangeSearch}
                />
                <ZoomSlider viewport={viewport} setViewport={setViewport} />
                <NewWidgetButton onSetData={setEditorData} />
            </div>
            {nodes.length === 0 ? (
                <Message text={t('noWidget')} />
            ) : (
                <ReactFlow
                    minZoom={MIN_ZOOM}
                    maxZoom={MAX_ZOOM}
                    panOnScroll
                    viewport={viewport}
                    onViewportChange={setViewport}
                    nodes={nodes}
                    deleteKeyCode={null}
                    nodeTypes={nodeTypes}
                    onNodesChange={onNodesChange}
                    proOptions={{ hideAttribution: true }}
                    onlyRenderVisibleElements={false}
                    nodesConnectable={false}
                    snapGrid={SNAP_GRID}
                    snapToGrid={true}
                >
                    <Background />
                    <MiniMap
                        className='overflow-hidden rounded !bg-main [&_.react-flow\_\_minimap-mask]:fill-black/10 dark:[&_.react-flow\_\_minimap-mask]:fill-black/50'
                        pannable
                        zoomable
                        nodeBorderRadius={10}
                        nodeColor='#6366f1'
                        style={MINIMAP_SIZE}
                    />
                </ReactFlow>
            )}

            {editorData !== null && (
                <Popup
                    title={editorData.wid ? editorData.config.name : t('newWidget')}
                    className='h-[70vh] w-[80vw]'
                    onClose={() => setEditorData(null)}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                >
                    <WidgetEditor
                        widgetConfig={editorData.config}
                        onSave={async (config) => {
                            if (editorData.wid === null) {
                                const [x, y, width, height] = [100, 100, 300, 300]
                                await createWidget(config, x, y, width, height)
                                setCenter(x + width / 2, y + height / 2, { duration: 300 })
                            } else {
                                updateWidgetConfig(editorData.wid, config)
                            }
                            setEditorData(null)
                        }}
                    />
                </Popup>
            )}
        </div>
    )
}

const NewWidgetButton = ({ onSetData }: { onSetData: (data: EditorWidgetData) => void }) => {
    return (
        <DropdownMenu
            trigger={
                <Button title={t('newWidget')}>
                    <IconPlus size={16} strokeWidth={1.6} />
                </Button>
            }
        >
            {[
                [t('composedChart'), defaultComposedChartConfig] as const,
                [t('pieChart'), defaultPieChartConfig] as const,
                [t('table'), defaultTableConfig] as const
            ].map(([name, fn], i) => {
                return (
                    <DropdownMenuItem
                        key={i}
                        onClick={() =>
                            onSetData({
                                wid: null,
                                config: fn()
                            })
                        }
                    >
                        {name}
                    </DropdownMenuItem>
                )
            })}
        </DropdownMenu>
    )
}
