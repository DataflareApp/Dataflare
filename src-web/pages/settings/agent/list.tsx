import { IconSparkles } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { AgentItem } from '.'
import { useTranslation } from '../../../i18n'
import { showContextMenu } from '../../../tauri'
import { Button, ScrollView } from '../../../ui'

interface AgentListProps {
    agents: AgentItem[] | undefined
    selected: number | null
    onCreate: () => void
    onSelect: (id: number) => void
    onDelete: (agent: AgentItem) => void
}

export const AgentList = ({ agents, selected, onCreate, onSelect, onDelete }: AgentListProps) => {
    const { t } = useTranslation()
    const [contextMenuSelect, setContextMenuSelect] = useState<number | null>(null)

    const onContextMenu = (agent: AgentItem) => {
        setContextMenuSelect(agent.id)
        showContextMenu(
            [
                {
                    label: t('delete'),
                    disabled: agent.builtIn,
                    onClick: () => onDelete(agent)
                }
            ],
            () => setContextMenuSelect(null)
        )
    }

    useEffect(() => {
        if (selected === null) {
            return
        }
        document.getElementById(`item-${selected}`)?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
    }, [selected])

    return (
        <div className='flex size-full flex-col'>
            <div className='mb-1 mt-3 px-4'>
                <Button className='w-full' onClick={onCreate}>
                    New Agent
                </Button>
            </div>

            {agents !== undefined && (
                <ScrollView className='flex-1' axis='y' viewportClassName='pb-2 px-4 pt-1'>
                    {agents.map((agent) => {
                        return (
                            <div
                                key={agent.id}
                                id={`item-${agent.id}`}
                                data-selected={selected === agent.id || undefined}
                                data-context-menu={contextMenuSelect === agent.id || undefined}
                                className='mb-1 flex h-9 items-center gap-2 rounded bg-zinc-100 px-3 text-sm text-secondary outline-1 outline-offset-2 outline-theme data-[selected]:bg-theme data-[selected]:text-white data-[context-menu]:outline dark:bg-neutral-800'
                                onClick={() => onSelect(agent.id)}
                                onContextMenu={() => onContextMenu(agent)}
                            >
                                <IconSparkles size={16} strokeWidth={1.5} className='shrink-0' />
                                <span className='min-w-0 flex-1 truncate'>{agent.name}</span>
                                {agent.builtIn && (
                                    <span className='rounded-full bg-green-100 px-1 text-[10px] leading-4 text-green-600 dark:bg-green-900/30 dark:text-green-400'>
                                        Default
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </ScrollView>
            )}
        </div>
    )
}
