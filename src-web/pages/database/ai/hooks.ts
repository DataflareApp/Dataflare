import { safeValidateUIMessages } from 'ai'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import useSWRImmutable from 'swr/immutable'
import {
    ClientData,
    REFRESH_AGENTS,
    REFRESH_AI_MODELS,
    TauriGlobalEvent,
    Chat,
    SqlDatabaseType,
    ChatConfig,
    Agent
} from '../../../tauri'
import { useReadonly } from '../hooks/use-db'
import { useConnection } from '../hooks/use-store'
import { DEFAULT_AGENTS } from './default-agents'
import { AgentService, createAgent } from './services'
import type { AgentMessage } from './services'

let inputCache = ''
export const useChatInput = () => {
    const [input, setState] = useState(inputCache)

    const setInput = (text: string | React.ChangeEvent<HTMLTextAreaElement>) => {
        const v = typeof text === 'string' ? text : text.target.value
        inputCache = v
        setState(v)
    }

    return {
        input,
        setInput
    }
}

// TODO: Needs optimization
export const useChatMessagesLoad = ({
    chatID,
    setChatConfig,
    setMessages
}: {
    chatID: number
    setChatConfig: React.Dispatch<React.SetStateAction<ChatConfig | null>>
    setMessages: React.Dispatch<React.SetStateAction<AgentMessage[]>>
}) => {
    const [loadingMessages, setLoadingMessages] = useState(true)

    useEffect(() => {
        let frame: number | null = null
        let cancelled = false
        ClientData.getChatDetail<AgentMessage>(chatID)
            .then(async ({ config, messages }) => {
                const result = await safeValidateUIMessages<AgentMessage>({ messages })
                if (cancelled) {
                    return
                }
                setChatConfig(config)
                if (!result.success) {
                    setLoadingMessages(false)
                    return
                }
                const CHUNK_SIZE = 10
                let startIndex = Math.max(0, result.data.length - CHUNK_SIZE)
                setMessages(result.data.slice(startIndex))
                if (startIndex === 0) {
                    setLoadingMessages(false)
                    return
                }
                const renderNextChunk = () => {
                    if (cancelled) {
                        return
                    }
                    if (startIndex === 0) {
                        setLoadingMessages(false)
                        return
                    }
                    const nextStartIndex = Math.max(0, startIndex - CHUNK_SIZE)
                    const nextChunk = result.data.slice(nextStartIndex, startIndex)
                    setMessages((prev) => {
                        return [...nextChunk, ...prev]
                    })
                    startIndex = nextStartIndex
                    if (startIndex === 0) {
                        setLoadingMessages(false)
                        return
                    }
                    frame = requestAnimationFrame(renderNextChunk)
                }
                frame = requestAnimationFrame(renderNextChunk)
            })
            .catch(() => {
                if (cancelled) {
                    return
                }
                setLoadingMessages(false)
            })
        return () => {
            cancelled = true
            frame !== null && cancelAnimationFrame(frame)
        }
    }, [chatID])

    return loadingMessages
}

export const useProviders = () => {
    const { data, mutate } = useSWRImmutable('provider', async () => {
        const ps = await ClientData.providerList()
        return ps
            .map((p) => {
                p.models = p.models.filter((m) => m.id !== '' || m.name !== '')
                return p
            })
            .filter((p) => p.models.length > 0)
    })

    useEffect(() => {
        const un = TauriGlobalEvent.listen(REFRESH_AI_MODELS, () => {
            mutate()
        })
        return () => {
            un.then((un) => un())
        }
    }, [])

    return data
}

export const useAgents = () => {
    const { data, mutate } = useSWRImmutable('agents', async () => {
        const agents = await ClientData.agentList()
        return DEFAULT_AGENTS.concat(agents)
    })

    useEffect(() => {
        const un = TauriGlobalEvent.listen(REFRESH_AGENTS, () => {
            mutate()
        })
        return () => {
            un.then((un) => un())
        }
    }, [])

    return { agents: data, mutate } as const
}

export const useProviderModel = (chatConfig: ChatConfig | null) => {
    const providers = useProviders()
    return useMemo(() => {
        if (providers === undefined || chatConfig === null) {
            return undefined
        }
        const p = providers.find((p) => p.id === chatConfig.provider)
        const m = p?.models.find((m) => m.id === chatConfig.model)
        if (p === undefined || m === undefined) {
            return null
        }
        return {
            config: p.config,
            model: m
        }
    }, [providers, chatConfig])
}

export const useCurrentAgent = (chatConfig: ChatConfig | null): Agent | null | undefined => {
    const { agents } = useAgents()
    return useMemo(() => {
        if (agents === undefined || chatConfig === null) {
            return undefined
        }
        const a = agents.find((a) => a.id === chatConfig.agent)
        if (a === undefined) {
            return null
        }
        return a
    }, [agents, chatConfig])
}

export const useChats = () => {
    const cid = useConnection().cid
    const { data: chats, mutate } = useSWRImmutable([cid, 'chats'], ([cid]) => {
        return ClientData.chatList(cid)
    })

    const onUpdateChat = <K extends keyof Chat>(id: number, key: K, value: Chat[K]) => {
        mutate(
            (chats) => {
                if (chats === undefined) {
                    return undefined
                }
                return chats.map((c) => {
                    return c.id === id ? { ...c, [key]: value } : c
                })
            },
            { revalidate: false }
        )
    }

    return { chats, mutate, onUpdateChat } as const
}

export const useAgent = (config: ChatConfig | null) => {
    const connection = useConnection()
    const readonly = useReadonly()

    const currentAgent = useCurrentAgent(config)
    const pcm = useProviderModel(config)

    const agentRef = useRef<AgentService | null>(null)

    const type = connection.config.type as SqlDatabaseType

    // The reason for using Ref to store the agent is that useChat only accepts the first transport passed and cannot be changed
    // So using Ref lets the agent held internally by transport always be the latest
    useEffect(() => {
        if (pcm === undefined || pcm === null || currentAgent === undefined) {
            agentRef.current = null
            return
        }
        const instructions = currentAgent?.instructions ?? DEFAULT_AGENTS[0].instructions
        const agent = createAgent(pcm, type, readonly, instructions)
        agentRef.current = agent
    }, [pcm, type, readonly, currentAgent])

    return agentRef
}
