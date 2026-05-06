import { IconSettings } from '@tabler/icons-react'
import { memo } from 'react'
import { useCheckUpdate } from '../../../hooks/use-update'
import { useTranslation } from '../../../i18n'
import { showSettingsWindow } from '../../../tauri'
import { IconButton } from '../../../ui'
import { FeedbackSetting } from './feedback'

export const Settings = memo(() => {
    return (
        <div className='flex h-8 shrink-0 items-center justify-between gap-1 border-t border-separator px-4 py-1'>
            <FeedbackSetting />
            <SettingsEnter />
        </div>
    )
})

const SettingsEnter = () => {
    const { t } = useTranslation()
    const availableUpdate = useCheckUpdate()

    return (
        <IconButton title={t('settings')} onClick={() => showSettingsWindow()} className='relative'>
            <IconSettings size={16} stroke={1.5} />
            {availableUpdate && (
                <div aria-hidden='true' className='absolute right-1 top-0.5 grid'>
                    <div className='col-start-1 row-start-1 size-1 animate-pulse rounded-full bg-yellow-500' />
                    <div className='col-start-1 row-start-1 size-1 animate-ping rounded-full bg-yellow-600' />
                </div>
            )}
        </IconButton>
    )
}
