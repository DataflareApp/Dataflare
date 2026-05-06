import { useMemo, useRef, useState } from 'react'
import useSWRImmutable from 'swr/immutable'
import { t } from '../../../i18n'
import { Agent, ClientData, emit, REFRESH_AGENTS } from '../../../tauri'
import { Direction, Persistent, Pin, showMessageBox, SplitView, Titlebar } from '../../../ui'
import { DEFAULT_AGENTS } from '../../database/ai/default-agents'
import { Welcome } from '../../database/layout/welcome'
import { AgentEditor } from './editor'
import { AgentList } from './list'

let timer: ReturnType<typeof setTimeout> | null = null
const notifyRefresh = () => {
    if (timer !== null) {
        clearTimeout(timer)
    }
    timer = setTimeout(() => {
        timer = null
        emit(REFRESH_AGENTS)
    }, 600)
}

export type AgentItem = Agent & { builtIn: boolean }

const useAgents = () => {
    return useSWRImmutable('agents', async (): Promise<AgentItem[]> => {
        const builtInAgents = DEFAULT_AGENTS.map((a) => {
            return { ...a, builtIn: true }
        })
        const customAgents = await ClientData.agentList().then((list) => {
            return list.map((a) => {
                return { ...a, builtIn: false }
            })
        })
        return builtInAgents.concat(customAgents)
    })
}

export const defaultInstructions = 'You are a {{database}} assistant.'

export const AgentSettings = () => {
    const { data: agents, mutate } = useAgents()

    const [selectedId, setSelectedId] = useState<number | null>(null)

    const selected = useMemo(() => {
        return agents?.find((a) => a.id === selectedId) ?? null
    }, [selectedId, agents])

    const onCreate = async () => {
        if (agents === undefined) {
            return
        }
        try {
            const id = await ClientData.createAgent('Untitled', '')
            setSelectedId(id)
            const newAgent = { id, name: 'Untitled', instructions: defaultInstructions, builtIn: false }
            mutate([...agents, newAgent], { revalidate: false })
            notifyRefresh()
        } catch (err: any) {
            showMessageBox(t('createFailed'), err, 'error')
        }
    }

    const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [waitUpdate, setWaitUpdate] = useState<Agent | null>(null)

    const onUpdate = async (agent: AgentItem) => {
        if (agents === undefined) {
            return
        }
        try {
            const newAgents = agents.map((item) => {
                return item.id === agent.id ? agent : item
            })
            mutate(newAgents, { revalidate: false })

            notifyRefresh()

            if (waitUpdate !== null && agent.id !== waitUpdate.id) {
                await ClientData.updateAgent(waitUpdate.id, waitUpdate.name, waitUpdate.instructions)
            }
            setWaitUpdate(agent)
            if (updateTimer.current !== null) {
                clearTimeout(updateTimer.current)
            }
            updateTimer.current = setTimeout(async () => {
                updateTimer.current = null
                setWaitUpdate(null)
                try {
                    await ClientData.updateAgent(agent.id, agent.name, agent.instructions)
                } catch (err: any) {
                    showMessageBox(t('saveFailed'), err, 'error')
                }
            }, 600)
        } catch (err: any) {
            showMessageBox(t('saveFailed'), err, 'error')
        }
    }

    const onDelete = async (agent: AgentItem) => {
        if (agents === undefined) {
            return
        }
        try {
            if (waitUpdate?.id === agent.id) {
                setWaitUpdate(null)
                if (updateTimer.current !== null) {
                    clearTimeout(updateTimer.current)
                    updateTimer.current = null
                }
            }
            await ClientData.deleteAgent(agent.id)
            if (selectedId === agent.id) {
                setSelectedId(null)
            }
            const newAgents = agents.filter((a) => a.id !== agent.id)
            mutate(newAgents, { revalidate: false })
            notifyRefresh()
        } catch (err: any) {
            showMessageBox(t('deleteFailed'), err, 'error')
        }
    }

    return (
        <SplitView
            direction={Direction.Horizontal}
            pin={Pin.First}
            defaultPinSize={200}
            minPinSize={180}
            maxPinSize={360}
            className='size-full'
            id='agent'
            persistent={Persistent.Permanent}
        >
            <AgentList
                agents={agents ?? []}
                selected={selectedId}
                onCreate={onCreate}
                onSelect={setSelectedId}
                onDelete={onDelete}
            />
            {selected ? (
                <AgentEditor key={selected.id} agent={selected} onChange={onUpdate} />
            ) : (
                <Welcome size='small' />
            )}
        </SplitView>
    )
}
