import { IconBrush } from '@tabler/icons-react'
import { useTranslation } from '../../../i18n'
import { Button, DropdownMenu, DropdownMenuItem } from '../../../ui'
import { KeyModifier, keyboardTitleChars } from '../../../utils/keyboard-char'

interface Props {
    onFormat: () => void
    onMinify: () => void
}

export const FormatActions = (props: Props) => {
    const { t } = useTranslation()

    return (
        <DropdownMenu
            trigger={
                <Button title={t('formatSQL')}>
                    <IconBrush size={16} stroke={1.5} />
                </Button>
            }
        >
            <DropdownMenuItem onClick={props.onFormat}>
                {t('formatSQL')}
                <span className='ml-2 text-xs text-tertiary'>
                    {keyboardTitleChars('', [KeyModifier.Shift, KeyModifier.Meta, 'L'])}
                </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={props.onMinify}>
                {t('minifySQL')}
                <span className='ml-2 text-xs text-tertiary'>
                    {keyboardTitleChars('', [KeyModifier.Shift, KeyModifier.Meta, 'J'])}
                </span>
            </DropdownMenuItem>
        </DropdownMenu>
    )
}
