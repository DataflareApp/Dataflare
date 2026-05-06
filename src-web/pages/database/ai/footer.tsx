import { IconExclamationCircle, IconPlayerStopFilled, IconSelector, IconSend } from '@tabler/icons-react'
import React, { Fragment } from 'react'
import { useTranslation } from '../../../i18n'
import { Agent, ChatConfig, ProviderModel, SettingsTab } from '../../../tauri'
import { showSettingsWindow } from '../../../tauri/window'
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    dropdownMenuSize,
    IconButton,
    ScrollView
} from '../../../ui'
import { DEFAULT_AGENTS } from './default-agents'
import { useAgents, useProviders, useProviderModel, useCurrentAgent } from './hooks'

interface Props {
    loading: boolean
    chatConfig: ChatConfig | null
    onChangeConfig: (config: ChatConfig) => void
    onSubmit: (e: React.FormEvent) => void
    onCancel: () => void
}

export const Footer = ({ loading, chatConfig, onChangeConfig, onSubmit, onCancel }: Props) => {
    const { t } = useTranslation()
    const pcm = useProviderModel(chatConfig)
    const agent = useCurrentAgent(chatConfig)

    const onChangeModel = (model: ProviderModel) => {
        onChangeConfig({ ...chatConfig, ...model })
    }

    const onChangeAgent = (agent: Agent | null) => {
        onChangeConfig({ ...chatConfig, agent: agent?.id })
    }

    return (
        <div className='flex h-8 items-center'>
            <div className='flex min-w-0 flex-1'>
                {agent !== undefined && pcm !== undefined && chatConfig !== null && (
                    <>
                        <AgentsSelecter agent={agent} onChangeAgent={onChangeAgent} />
                        <Selecter chatConfig={chatConfig} pcm={pcm} onChangeModel={onChangeModel} />
                    </>
                )}
            </div>
            {loading ? (
                <IconButton onClick={onCancel} title={t('cancel')}>
                    <div className='size-4 rounded-full border border-red-500 p-0.5 text-red-500'>
                        <IconPlayerStopFilled size={10} strokeWidth={1.6} />
                    </div>
                </IconButton>
            ) : (
                <IconButton onClick={onSubmit} title={t('send')}>
                    <IconSend size={16} strokeWidth={1.6} />
                </IconButton>
            )}
        </div>
    )
}

const AgentsSelecter = ({
    agent,
    onChangeAgent
}: {
    agent: Agent | null
    onChangeAgent: (agent: Agent | null) => void
}) => {
    const title = agent?.name ?? DEFAULT_AGENTS[0].name

    return (
        <DropdownMenu
            trigger={
                <IconButton title={title} className='flex min-w-16 items-center gap-1 overflow-hidden'>
                    <span className='min-w-0 truncate text-xs'>{title}</span>
                    <IconSelector className='shrink-0' size={16} strokeWidth={1.6} />
                </IconButton>
            }
            className='!p-0'
        >
            <AgentsList agent={agent} onChangeAgent={onChangeAgent} />
        </DropdownMenu>
    )
}

const AgentsList = ({
    agent,
    onChangeAgent
}: {
    agent: Agent | null
    onChangeAgent: (agent: Agent | null) => void
}) => {
    const { agents } = useAgents()
    const noMatched = agents?.every((a) => a.id !== agent?.id) ?? true

    return (
        <ScrollView axis='y' viewportClassName='p-1' style={dropdownMenuSize}>
            <DropdownMenuItem onClick={() => showSettingsWindow(SettingsTab.Agents)}>
                Manage Agents
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {agents?.map((item, i) => {
                const selected = item.id === agent?.id
                return (
                    <Fragment key={item.id}>
                        <DropdownMenuItem className='gap-2' onClick={() => onChangeAgent(item)}>
                            <div
                                data-selected={selected || (i === 0 && noMatched) || undefined}
                                className='aspect-square w-2 rounded-full data-[selected]:bg-green-500'
                            />
                            <span title={item.name} className='min-w-32 max-w-64 truncate'>
                                {item.name}
                            </span>
                        </DropdownMenuItem>
                        {i === DEFAULT_AGENTS.length - 1 && agents.length > DEFAULT_AGENTS.length && (
                            <DropdownMenuSeparator />
                        )}
                    </Fragment>
                )
            })}
        </ScrollView>
    )
}

interface SelecterProps {
    chatConfig: ChatConfig
    pcm: ReturnType<typeof useProviderModel>
    onChangeModel: (model: ProviderModel) => void
}

const Selecter = ({ chatConfig, pcm, onChangeModel }: SelecterProps) => {
    const { t } = useTranslation()

    return (
        <DropdownMenu
            trigger={
                <IconButton
                    title={pcm?.model.name ?? undefined}
                    className='flex items-center gap-1 overflow-hidden'
                >
                    <span className='min-w-0 truncate text-xs'>{pcm?.model.name ?? t('selectModel')}</span>
                    {pcm === null ? (
                        <IconExclamationCircle className='shrink-0' size={16} strokeWidth={1.8} />
                    ) : (
                        <IconSelector className='shrink-0' size={16} strokeWidth={1.6} />
                    )}
                </IconButton>
            }
            className='!p-0'
        >
            <ModelsList chatConfig={chatConfig} onChangeModel={onChangeModel} />
        </DropdownMenu>
    )
}

const ModelsList = ({
    chatConfig,
    onChangeModel
}: {
    chatConfig: ChatConfig
    onChangeModel: (model: ProviderModel) => void
}) => {
    const { t } = useTranslation()
    const providers = useProviders()

    return (
        <ScrollView axis='y' viewportClassName='p-1' style={dropdownMenuSize}>
            <DropdownMenuItem onClick={() => showSettingsWindow(SettingsTab.Providers)}>
                {t('manageModels')}
            </DropdownMenuItem>

            {providers?.length !== 0 && <DropdownMenuSeparator />}

            {providers?.map((p) => {
                return (
                    <Fragment key={p.id}>
                        {providers.length > 1 && <DropdownMenuLabel label={p.name} />}
                        {p.models.map((m, i) => {
                            const selected = m.id === chatConfig.model && p.id === chatConfig.provider
                            return (
                                <DropdownMenuItem
                                    key={i}
                                    className='gap-2'
                                    onClick={() => onChangeModel({ provider: p.id, model: m.id })}
                                >
                                    <div
                                        data-selected={selected || undefined}
                                        className='aspect-square w-2 rounded-full data-[selected]:bg-green-500'
                                    />
                                    <div title={m.name} className='min-w-32 max-w-64 truncate'>
                                        {m.name}
                                    </div>
                                </DropdownMenuItem>
                            )
                        })}
                    </Fragment>
                )
            })}
        </ScrollView>
    )
}
