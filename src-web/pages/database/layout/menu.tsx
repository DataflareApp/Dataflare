import { IconDots, IconSelector } from '@tabler/icons-react'
import { useShortcutMeta } from '../../../hooks/use-shortcut'
import { useTranslation } from '../../../i18n'
import { IconButton, IconRefresh, DropdownMenu, Select, SelectProps } from '../../../ui'
import { keyboardTitleChars, KeyModifier } from '../../../utils/keyboard-char'

export interface ListMenuProps {
    name: string
    count?: number
    selectOptions: SelectProps['options']
    selectValue: string
    onChange: (v: string) => void
    refreshing: boolean
    onRefresh: () => void
    children: React.ReactNode
}

export const ListMenu = (props: ListMenuProps) => {
    const { t } = useTranslation()

    useShortcutMeta('r', (_, shift) => {
        shift && !props.refreshing && props.onRefresh()
    })

    return (
        <div className='mx-4 flex items-center'>
            <div className='relative flex grow items-center gap-1 overflow-hidden text-tertiary'>
                <h2 className='h-10 truncate text-xs font-medium leading-10 group-hover:text-secondary'>
                    {props.name}
                </h2>
                {props.count !== undefined && (
                    <span className='rounded bg-neutral-200 px-[6px] text-xs dark:bg-neutral-800'>
                        {props.count}
                    </span>
                )}
                <IconSelector
                    size={16}
                    strokeWidth={1.6}
                    className='ml-auto hidden shrink-0 animate-overlayIn text-secondary group-hover:block'
                />
                <Select
                    className='!absolute inset-0 !h-10 opacity-0'
                    options={props.selectOptions}
                    value={props.selectValue}
                    onChange={props.onChange}
                />
            </div>

            <IconButton
                title={keyboardTitleChars(t('refresh'), [KeyModifier.Shift, KeyModifier.Meta, 'R'])}
                className='ml-1'
                onClick={() => !props.refreshing && props.onRefresh()}
            >
                <IconRefresh loading={props.refreshing} />
            </IconButton>

            <DropdownMenu
                trigger={
                    <IconButton title={t('menu')}>
                        <IconDots size={16} stroke={1.5} className='fill-current' />
                    </IconButton>
                }
            >
                {props.children}
            </DropdownMenu>
        </div>
    )
}
