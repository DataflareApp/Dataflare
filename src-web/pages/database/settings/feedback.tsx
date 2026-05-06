import { IconBrandX, IconBug, IconKeyboard } from '@tabler/icons-react'
import { useTranslation } from '../../../i18n'
import { SettingsTab, showSettingsWindow } from '../../../tauri'
import { DropdownMenuItem, DropdownMenu, DropdownMenuSeparator } from '../../../ui'
import { BUG_FEEDBACK_URL, FOLLOW_URL, openURL } from '../../../utils/opener'

export const FeedbackSetting = () => {
    const { t } = useTranslation()

    return (
        <DropdownMenu
            trigger={
                <button className='h-5 truncate rounded text-[10px] leading-5 text-tertiary hover:text-primary'>
                    {t('help')}
                </button>
            }
            sideOffset={4}
        >
            <DropdownMenuItem onClick={() => openURL(BUG_FEEDBACK_URL)}>
                <IconBug size={16} className='mr-2' stroke={1.6} />
                {t('bugAndFeature')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openURL(FOLLOW_URL)}>
                <IconBrandX size={16} className='mr-2' stroke={1.6} />
                {t('followDataflare')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => showSettingsWindow(SettingsTab.KeyboardShortcuts)}>
                <IconKeyboard size={16} className='mr-2' stroke={1.6} />
                {t('keyboardShortcuts')}
            </DropdownMenuItem>
        </DropdownMenu>
    )
}
