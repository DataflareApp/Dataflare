import { IconTrash } from '@tabler/icons-react'
import { ReactNode } from 'react'
import { useTranslation } from '../../../i18n'
import { IconButton, Popover as RadixPopover } from '../../../ui'

interface Props {
    title: string
    onDelete?: () => void
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger: JSX.Element
    children: ReactNode
}

export const Popover = (props: Props) => {
    const { t } = useTranslation()
    return (
        <RadixPopover
            open={props.open}
            onOpenChange={props.onOpenChange}
            onOpenAutoFocus={(e) => e.preventDefault()}
            trigger={props.trigger}
            className='grid grid-cols-[auto_1fr] gap-3 px-4 pb-4 text-xs text-tertiary'
        >
            <div className='col-span-2 -mb-2 flex items-center justify-between'>
                <span className='text-sm leading-10 text-primary'>{props.title}</span>
                {props.onDelete && (
                    <IconButton title={t('delete')} onClick={props.onDelete}>
                        <IconTrash size={16} stroke={1.5} />
                    </IconButton>
                )}
            </div>
            {props.children}
        </RadixPopover>
    )
}

export const Label = ({ text }: { text: string }) => {
    return <label className='text-right leading-7'>{text}</label>
}
