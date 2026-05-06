import { Node, NodeChange } from '@xyflow/react'
import { useMemo, useState } from 'react'
import useSWR from 'swr'
import useSWRImmutable from 'swr/immutable'
import { t } from '../../../i18n'
import { ClientData, WidgetConfig, Query } from '../../../tauri'
import { showMessageBox, SelectProps } from '../../../ui'
import { db } from '../db/db'
import { useConnectID, useConnection } from '../hooks/use-store'

export const useWidgetNodes = () => {
    const cid = useConnection().cid
    const {
        data: nodes,
        error,
        mutate
    } = useSWRImmutable('widget-nodes', async () => {
        const widgets = await ClientData.widgetList(cid)
        return widgets.map(({ wid, x, y, width, height, config }): Node<any> => {
            return {
                id: wid,
                dragHandle: 'header',
                type: 'widget',
                position: { x, y },
                width,
                height,
                data: config
            }
        })
    })

    const createWidget = async (
        config: WidgetConfig,
        x: number,
        y: number,
        width: number,
        height: number
    ) => {
        if (nodes === undefined) return
        try {
            const wid = await ClientData.createWidget(cid, x, y, width, height, config)
            const newNodes = [
                ...nodes.map((item) => {
                    return { ...item, selected: false }
                }),
                {
                    id: wid,
                    dragHandle: 'header',
                    type: 'widget',
                    position: { x, y },
                    width,
                    height,
                    data: config,
                    selected: true
                }
            ]
            mutate(newNodes, { revalidate: false })
        } catch (err: any) {
            showMessageBox(t('error'), err, 'error')
        }
    }

    const deleteWidget = async (wid: string) => {
        if (nodes === undefined) return
        try {
            await ClientData.deleteWidget(wid)
            const newNodes = nodes.filter((item) => item.id !== wid)
            mutate(newNodes, { revalidate: false })
        } catch (err: any) {
            showMessageBox(t('deleteFailed'), err, 'error')
        }
    }

    const updateWidgetConfig = async (wid: string, config: WidgetConfig) => {
        if (nodes === undefined) return
        const i = nodes.findIndex((node) => node.id === wid)
        if (i < 0) return
        try {
            await ClientData.updateWidgetConfig(wid, config)
            nodes[i] = {
                ...nodes[i],
                data: config
            }
            mutate([...nodes], { revalidate: false })
        } catch (err: any) {
            showMessageBox(t('saveFailed'), err, 'error')
        }
    }

    const saveWidgetChanges = async (changes: NodeChange[]) => {
        if (nodes === undefined) return
        for (const changed of changes) {
            switch (changed.type) {
                case 'position': {
                    if (changed.dragging === false && changed.position !== undefined) {
                        const node = nodes.find((node) => node.id === changed.id)
                        if (node !== undefined) {
                            await ClientData.updateWidgetPosition(
                                node.id,
                                Math.round(changed.position.x),
                                Math.round(changed.position.y)
                            )
                        }
                    }
                    break
                }
                case 'dimensions': {
                    if (changed.resizing === false) {
                        const node = nodes.find((node) => node.id === changed.id)
                        if (node !== undefined && node.width !== undefined && node.height !== undefined) {
                            await ClientData.updateWidgetSize(node.id, node.width, node.height)
                        }
                    }
                    break
                }
            }
        }
    }

    return {
        nodes,
        error,
        mutate,
        createWidget,
        deleteWidget,
        updateWidgetConfig,
        saveWidgetChanges
    } as const
}

export const useWidgetQuery = (wid: string, source: string, interval: number) => {
    const connectID = useConnectID()
    const key = connectID !== null ? [connectID, 'widget', wid, source] : null

    // 0 disables auto-refresh, minimum refresh interval is 5 seconds
    const refreshInterval = interval === 0 ? undefined : Math.max(interval, 5) * 1000

    return useSWR(
        key,
        () => {
            if (source.trim() === '') {
                throw 'Error: No data source'
            }
            return db.query(source)
        },
        { refreshInterval }
    )
}

export const useArray = <T extends Record<string, any>>(array: T[], onChange: (newArray: T[]) => void) => {
    return {
        update: <K extends keyof T>(i: number, key: K, value: T[K]) => {
            const newArray = [...array]
            newArray[i] = {
                ...newArray[i],
                [key]: value
            }
            onChange(newArray)
        },
        add: (item: T) => {
            onChange([item, ...array])
        },
        remove: (i: number) => {
            const newArray = [...array]
            newArray.splice(i, 1)
            onChange(newArray)
        }
    }
}

export const useWidgetConfig = (widgetConfig: WidgetConfig) => {
    const [config, setConfig] = useState(widgetConfig)
    return {
        config,
        updateName: (name: string) => {
            setConfig({
                ...config,
                name
            })
        },
        updateSource: (source: string) => {
            setConfig({
                ...config,
                source
            })
        },
        updateInterval: (interval: number) => {
            setConfig({
                ...config,
                interval
            })
        },
        updateData: (k: string, value: any): undefined => {
            setConfig({
                ...config,
                options: {
                    type: config.options.type as any,
                    config: {
                        ...config.options.config,
                        [k]: value
                    } as any
                }
            })
        }
    }
}

export const useQueryKeys = (query: Query | undefined) => {
    return useMemo(() => {
        const columns = query?.columns.map((item) => item.name) ?? []
        const keySet = new Set(columns)
        const keyOptions = Array.from(keySet).map((name) => {
            return {
                name,
                value: name
            }
        }) as SelectProps['options']
        return { keySet, keyOptions }
    }, [query])
}
