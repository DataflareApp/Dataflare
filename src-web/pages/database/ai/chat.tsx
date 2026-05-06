import { useChat, UseChatOptions } from '@ai-sdk/react'
import { IconAlertTriangle, IconCancel, IconTrash } from '@tabler/icons-react'
import { ChatAddToolApproveResponseFunction, lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai'
import React, { memo, useEffect, useRef, useState } from 'react'
import { useEffectEvent } from '../../../hooks/use-effect-event'
import { useTranslation } from '../../../i18n'
import { Chat, ChatConfig, ClientData, showContextMenu } from '../../../tauri'
import { IconButton, IconCopyButton, IconRefresh, ScrollView } from '../../../ui'
import { isMacOS } from '../../../utils/os'
import { useConnectID } from '../hooks/use-store'
import { Footer } from './footer'
import { useAgent, useChatInput, useChatMessagesLoad, useChats } from './hooks'
import { Markdown } from './markdown'
import {
    AgentTransport,
    AgentMessage,
    filterNonOutputMessages,
    AgentPart,
    handlePendingApproval
} from './services'
import { Thinking } from './thinking'
import { ToolChartResult } from './tool-chart'
import { ToolQueryResult } from './tool-sql-query'
import { ApprovalBlock, Tool } from './tool-ui'
import { Welcome } from './welcome'

interface Props {
    chatID: number
    setChat: React.Dispatch<React.SetStateAction<Chat>>
}

export const ChatView = memo(({ chatID, setChat }: Props) => {
    const { t } = useTranslation()
    const connectID = useConnectID()
    const { onUpdateChat } = useChats()
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const autoScroll = useRef(true)
    const { input, setInput } = useChatInput()
    const [chatConfig, setChatConfig] = useState<ChatConfig | null>(null)
    const agent = useAgent(chatConfig)
    const [cancelled, setCancelled] = useState(false)
    const chatOptions: UseChatOptions<AgentMessage> = {
        experimental_throttle: 300,
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
        transport: new AgentTransport(agent),
        // TODO: Handle messages, e.g. send at most 100 history messages each time
        onFinish: ({ messages, isAbort, isError }) => {
            onUpdateChat(chatID, 'lastMessageAt', Date.now())
            ClientData.updateChatMessages(chatID, messages)
            setCancelled(!isError && isAbort)
        }
    }
    // prettier-ignore
    const { messages, status, error, setMessages, sendMessage, stop, regenerate, addToolApprovalResponse } = useChat<AgentMessage>(chatOptions)
    const loading = status === 'streaming' || status === 'submitted'

    const loadingMessages = useChatMessagesLoad({
        chatID,
        setChatConfig,
        setMessages
    })

    useEffect(() => {
        return () => {
            stop()
        }
    }, [chatID, connectID])

    useEffect(() => {
        if (!scrollRef.current) {
            return
        }
        const el = scrollRef.current
        const handleScroll = () => {
            const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
            autoScroll.current = distanceToBottom <= 100
        }
        el.addEventListener('scroll', handleScroll, { passive: true })
        return () => {
            return el.removeEventListener('scroll', handleScroll)
        }
    }, [messages.length !== 0])

    useEffect(() => {
        if (scrollRef.current === null || !autoScroll.current) {
            return
        }
        scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight
        })
    }, [messages, status, cancelled])

    useEffect(() => {
        const [el, scroll] = [inputRef.current, scrollRef.current]
        if (el === null || scroll === null) {
            return
        }
        const bottom = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight
        el.style.height = 'auto'
        el.style.height = `${el.scrollHeight}px`
        scroll.scrollTop = scroll.scrollHeight - scroll.clientHeight - bottom
    }, [input])

    const onChangeConfig = (config: ChatConfig) => {
        setChatConfig(config)
        ClientData.updateChatConfig(chatID, config)
    }

    const onUpdateFirstMessageTitle = (value: string) => {
        const name = value.substring(0, 100)
        setChat((chat) => ({ ...chat, name }))
        onUpdateChat(chatID, 'name', name)
        ClientData.updateChatName(chatID, name)
    }

    const onSubmit = () => {
        inputRef.current?.focus()
        if (loadingMessages) {
            return
        }
        if (loading) {
            return stop()
        }
        const value = input.trim()
        if (value === '') {
            return
        }
        const filtered = filterNonOutputMessages(messages)
        if (filtered !== null) {
            setMessages(filtered)
        }
        autoScroll.current = true
        setInput('')
        messages.length === 0 && onUpdateFirstMessageTitle(value)
        sendMessage({ text: value })
    }

    const onCancel = () => {
        autoScroll.current = false
        inputRef.current?.focus()
        stop()
    }

    const onClearChat = async () => {
        await stop()
        setMessages([])
        inputRef.current?.focus()
        await ClientData.updateChatMessages(chatID, [])
    }

    const onContextMenu = () => {
        showContextMenu([
            {
                label: t('clearChat'),
                onClick: onClearChat
            }
        ])
    }

    // Handle the Enter key to submit the form from a textarea
    const composing = useRef(false)
    const composingTmer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const onCompositionStart = () => {
        if (composingTmer.current !== null) {
            clearTimeout(composingTmer.current)
        }
        composing.current = true
    }
    const onCompositionEnd = () => {
        if (composingTmer.current !== null) {
            clearTimeout(composingTmer.current)
        }
        composingTmer.current = setTimeout(() => {
            composing.current = false
        }, 100)
    }
    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (composing.current) {
            return
        }
        const key = e.key.toLowerCase()
        const meta = isMacOS ? e.metaKey : e.ctrlKey
        // Clear chat
        if (meta && e.shiftKey && key === 'k') {
            e.preventDefault()
            messages.length !== 0 && onClearChat()
            return
        }
        // Skip tool call
        if (meta && !e.shiftKey && e.altKey && key === 'enter') {
            if (handlePendingApproval(messages, addToolApprovalResponse, 'skip')) {
                e.preventDefault()
                return
            }
        }
        // Allow tool call
        if (meta && !e.shiftKey && key === 'enter') {
            if (handlePendingApproval(messages, addToolApprovalResponse, 'allow')) {
                e.preventDefault()
                return
            }
        }
        // Submit on Enter
        if (key === 'enter' && !e.shiftKey) {
            e.preventDefault()
            onSubmit()
        }
    }

    const deleteMessage = useEffectEvent((messageId: string) => {
        autoScroll.current = false
        const newMessages = messages.filter((msg) => msg.id !== messageId)
        setCancelled(false)
        setMessages(newMessages)
        ClientData.updateChatMessages(chatID, newMessages)
    })

    return (
        <>
            {messages.length === 0 && <Welcome loading={loadingMessages} inputRef={inputRef} />}
            {messages.length !== 0 && (
                <ScrollView
                    axis='y'
                    className='flex-1'
                    ref={scrollRef}
                    viewportClassName='py-4 text-[13px]'
                    onContextMenu={onContextMenu}
                >
                    {messages.map((message) => {
                        return (
                            <Message
                                key={message.id}
                                message={message}
                                addToolApprovalResponse={addToolApprovalResponse}
                                regenerate={regenerate}
                                deleteMessage={deleteMessage}
                            />
                        )
                    })}

                    {status === 'error' && error !== undefined && <ErrorBlock error={error} />}
                    {!loading && cancelled && <CancelledBlock />}
                </ScrollView>
            )}

            <div
                data-loading={loading || undefined}
                className='ai-chat-loading hidden data-[loading]:block'
            />

            <footer className='mt-1 px-4'>
                <textarea
                    placeholder={t('askAnything')}
                    className='block max-h-44 min-h-14 w-full resize-none rounded-md border border-separator bg-neutral-200/20 px-2 py-2 text-sm text-secondary placeholder-quarternary focus:bg-transparent dark:bg-neutral-800/20'
                    autoFocus
                    spellCheck='false'
                    autoComplete='off'
                    autoCapitalize='none'
                    ref={inputRef}
                    value={input}
                    onChange={setInput}
                    onCompositionStart={onCompositionStart}
                    onCompositionEnd={onCompositionEnd}
                    onKeyDown={onKeyDown}
                    onContextMenu={(e) => e.stopPropagation()}
                />
                <Footer
                    loading={loading}
                    chatConfig={chatConfig}
                    onChangeConfig={onChangeConfig}
                    onSubmit={onSubmit}
                    onCancel={onCancel}
                />
            </footer>
        </>
    )
})

const Message = memo(
    ({
        message,
        addToolApprovalResponse,
        regenerate,
        deleteMessage
    }: {
        message: AgentMessage
        addToolApprovalResponse: ChatAddToolApproveResponseFunction
        regenerate: ({ messageId }: { messageId: string }) => void
        deleteMessage: (messageId: string) => void
    }) => {
        const { t } = useTranslation()

        const getCopyText = (): string => {
            return message.parts
                .filter((part) => part.type === 'text')
                .map((part) => part.text)
                .join('\n')
        }

        return (
            <div className='group px-4 py-1.5 leading-5'>
                {message.role === 'user' ? (
                    <div className='flex flex-col items-end'>
                        <p
                            className='min-w-10 max-w-full select-text whitespace-pre-wrap break-words rounded-md border border-theme/60 bg-theme/10 px-3 py-1.5 text-theme dark:bg-theme/5'
                            onContextMenu={(e) => e.stopPropagation()}
                        >
                            {message.parts[0]?.type === 'text' && message.parts[0].text}
                        </p>
                    </div>
                ) : (
                    <div className='flex flex-col gap-2'>
                        {message.parts.map((part, index) => {
                            return (
                                <AssistantMessage
                                    key={index}
                                    part={part}
                                    addToolApprovalResponse={addToolApprovalResponse}
                                />
                            )
                        })}
                    </div>
                )}

                <div className='invisible mt-1 flex items-center justify-end transition focus-within:visible group-hover:visible'>
                    <IconCopyButton getCopyText={getCopyText} />
                    <IconButton onClick={() => regenerate({ messageId: message.id })} title={t('regenerate')}>
                        <IconRefresh loading={false} />
                    </IconButton>
                    <IconButton
                        className='hover:text-red-500'
                        onClick={() => deleteMessage(message.id)}
                        title={t('delete')}
                    >
                        <IconTrash size={16} strokeWidth={1.5} />
                    </IconButton>
                </div>
            </div>
        )
    }
)

const AssistantMessage = ({
    part,
    addToolApprovalResponse
}: {
    part: AgentPart
    addToolApprovalResponse: ChatAddToolApproveResponseFunction
}) => {
    switch (part.type) {
        case 'text': {
            return <Markdown content={part.text} />
        }
        // TODO: If cancelled while thinking, the thinking state stays as thinking permanently, should be fixed
        case 'reasoning': {
            return <Thinking part={part} />
        }
        case 'tool-listDatabaseSchemas':
        case 'tool-getDatabaseSchema':
        case 'tool-getTableSchema':
        case 'tool-getColumnSampleValues':
        case 'tool-runSQLQuery':
        case 'tool-generateChart': {
            switch (part.state) {
                case 'approval-requested': {
                    return (
                        <ApprovalBlock
                            part={part}
                            onApprove={(approved, reason) =>
                                addToolApprovalResponse({ id: part.approval.id, approved, reason })
                            }
                        />
                    )
                }
                case 'approval-responded': {
                    return <ApprovalBlock part={part} />
                }
                case 'output-available': {
                    switch (part.type) {
                        case 'tool-listDatabaseSchemas':
                        case 'tool-getDatabaseSchema':
                        case 'tool-getTableSchema':
                        case 'tool-getColumnSampleValues': {
                            return (
                                <Tool part={part} status='success' input={part.input} output={part.output} />
                            )
                        }
                        case 'tool-runSQLQuery': {
                            return <ToolQueryResult input={part.input} output={part.output} />
                        }
                        case 'tool-generateChart': {
                            return <ToolChartResult input={part.input} output={part.output} />
                        }
                    }
                }
                case 'output-denied': {
                    return <Tool part={part} status='skip' input={part.input} />
                }
                case 'output-error': {
                    return <Tool part={part} status='error' input={part.input} error={part.errorText} />
                }
                default: {
                    return null
                }
            }
        }
        // type: "file" | "step-start" | `data-${string}` | "dynamic-tool" | "source-url" | "source-document"
        default: {
            return null
        }
    }
}

const ErrorBlock = ({ error }: { error: Error }) => {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return (
        <div className='mx-4 flex max-w-full animate-popoverIn select-text whitespace-pre-wrap break-words rounded-md border border-red-500 bg-red-50 px-3 py-1.5 leading-5 text-red-800 dark:border-red-600 dark:bg-red-900/20 dark:text-red-200'>
            <IconAlertTriangle className='mr-1 mt-0.5 shrink-0' size={16} strokeWidth={1.5} />
            <p className='min-w-0 flex-1'>{msg}</p>
        </div>
    )
}

const CancelledBlock = () => {
    const { t } = useTranslation()
    return (
        <div className='mx-4 flex max-w-full animate-popoverIn select-text whitespace-pre-wrap break-words rounded-md border border-yellow-500 bg-yellow-50 px-3 py-1.5 leading-5 text-yellow-800 dark:border-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-200'>
            <IconCancel className='mr-1 mt-0.5 shrink-0' size={16} strokeWidth={1.5} />
            <p className='min-w-0 flex-1'>{t('cancelled')}</p>
        </div>
    )
}
