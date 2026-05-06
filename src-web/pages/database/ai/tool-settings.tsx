import { IconTool } from '@tabler/icons-react'
import React, { memo } from 'react'
import useSWRImmutable from 'swr/immutable'
import { useTranslation } from '../../../i18n'
import { IconButton, Popover } from '../../../ui'
import { Switch } from '../../../ui/switch'
import { availableTools, Storage } from './services'

export const ToolSettings = memo(() => {
    const { t } = useTranslation()
    return (
        <Popover
            side='bottom'
            trigger={
                <IconButton title={t('toolAutoApproval')}>
                    <IconTool size={16} strokeWidth={1.5} />
                </IconButton>
            }
        >
            <ToolSettingsContent />
        </Popover>
    )
})

const ToolSettingsContent = () => {
    const { t } = useTranslation()
    const { data: approvals, mutate } = useSWRImmutable('tool-auto-approvals', () => {
        return Storage.getApproval()
    })

    if (approvals === undefined) {
        return null
    }

    type ToolId = ReturnType<typeof availableTools>[number]['name']
    const toggleApproval = async (toolId: ToolId, enabled: boolean) => {
        const newApprovals = { ...approvals, [toolId]: enabled }
        mutate(newApprovals, { revalidate: false })
        Storage.setApproval(newApprovals)
    }

    return (
        <div className='px-1 pb-1'>
            <h2 className='border-b border-separator pl-4 text-sm leading-10 text-primary'>
                {t('toolAutoApproval')}
            </h2>
            <div className='mt-1 px-4'>
                {availableTools().map((tool) => {
                    return (
                        <div
                            key={tool.name}
                            className='flex items-center justify-between gap-3 rounded border border-transparent py-1.5'
                        >
                            <div className='mr-10 min-w-0 flex-1'>
                                <p className='truncate text-xs text-secondary'>{tool.name}</p>
                                {!tool.allowAutoapproval && (
                                    <p className='mt-0.5 text-[11px] leading-tight text-quarternary'>
                                        {t('manuallyApprovedMsg')}
                                    </p>
                                )}
                            </div>
                            {tool.allowAutoapproval && (
                                <Switch
                                    checked={approvals[tool.name] ?? false}
                                    onChange={(enabled) => toggleApproval(tool.name, enabled)}
                                />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
