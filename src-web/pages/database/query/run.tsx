import { IconPlayerPlayFilled, IconPlayerStopFilled } from '@tabler/icons-react'
import { useTranslation } from '../../../i18n'
import { Button, DropdownMenu, DropdownMenuItem } from '../../../ui'
import { KeyModifier, keyboardTitleChars } from '../../../utils/keyboard-char'
import { GetSqlType } from '../sql-editor'

interface Props {
    isRunning: boolean
    selectedCode: boolean
    onRun: (type: GetSqlType) => void
    onStop: () => void
}

export const RunActions = ({ isRunning, selectedCode, onRun, onStop }: Props) => {
    const { t } = useTranslation()
    if (isRunning) {
        return (
            <Button primary className='w-24' onClick={onStop}>
                <IconPlayerStopFilled size={16} />
                {t('stop')}
            </Button>
        )
    }

    if (selectedCode) {
        return (
            <Button primary onClick={() => onRun(GetSqlType.SelectionValue)}>
                <IconPlayerPlayFilled size={16} />
                {t('runSelectionSQL')}
            </Button>
        )
    }

    return (
        <DropdownMenu
            trigger={
                <Button primary className='w-24'>
                    <IconPlayerPlayFilled size={16} />
                    {t('run')}
                </Button>
            }
        >
            <DropdownMenuItem onClick={() => onRun(GetSqlType.CurrentStatement)}>
                {t('runCurrentStatement')}
                <span className='ml-2 text-xs text-tertiary'>
                    {keyboardTitleChars('', [KeyModifier.Meta, KeyModifier.Enter])}
                </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRun(GetSqlType.AllStatement)}>
                {t('runAllStatement')}
                <span className='ml-2 text-xs text-tertiary'>
                    {keyboardTitleChars('', [KeyModifier.Shift, KeyModifier.Meta, KeyModifier.Enter])}
                </span>
            </DropdownMenuItem>
        </DropdownMenu>
    )
}
