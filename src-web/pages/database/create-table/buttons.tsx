import {
    IconKey,
    IconArrowUpRight,
    IconSquareRoundedLetterN,
    IconSquareRoundedLetterU,
    IconMinus,
    IconCirclePlus,
    IconArrowBackUp
} from '@tabler/icons-react'
import { useTranslation } from '../../../i18n'
import { IconButton, Button } from '../../../ui'

type Click = {
    onClick: () => void
}

type Props = Click & {
    highlight: boolean
}

export const PrimaryKey = (props: Props) => {
    const { t } = useTranslation()
    return (
        <IconButton title={t('primaryKey')} className='h-7' onClick={props.onClick}>
            <IconKey
                size={18}
                stroke={1.5}
                className={props.highlight ? 'text-yellow-600' : 'text-tertiary'}
            />
        </IconButton>
    )
}

export const NotNull = (props: Props) => {
    return (
        <IconButton title='Not Null' className='h-7' onClick={props.onClick}>
            <IconSquareRoundedLetterN
                size={18}
                stroke={1.5}
                className={props.highlight ? 'text-blue-600' : 'text-tertiary'}
            />
        </IconButton>
    )
}

export const Unique = (props: Props) => {
    return (
        <IconButton title='Unique' className='h-7' onClick={props.onClick}>
            <IconSquareRoundedLetterU
                size={18}
                stroke={1.5}
                className={props.highlight ? 'text-green-600' : 'text-tertiary'}
            />
        </IconButton>
    )
}

export const AddForeignKey = (props: Click) => {
    const { t } = useTranslation()
    return (
        <IconButton title={t('addForeignKey')} className='h-7' onClick={props.onClick}>
            <IconArrowUpRight size={16} stroke={1.5} className='text-tertiary' />
        </IconButton>
    )
}

export const AddIndexColumn = (props: Click) => {
    const { t } = useTranslation()
    return (
        <IconButton title={t('addIndexColumn')} className='h-7' onClick={props.onClick}>
            <IconCirclePlus size={16} stroke={1.8} className='text-tertiary' />
        </IconButton>
    )
}

export const DeleteColumn = (props: Click) => {
    const { t } = useTranslation()
    return (
        <IconButton title={t('delete')} className='h-7' onClick={props.onClick}>
            <IconMinus size={16} strokeWidth={1.6} />
        </IconButton>
    )
}

export const RestoreColumn = (props: Click) => {
    const { t } = useTranslation()
    return (
        <IconButton title={t('restore')} className='h-7' onClick={props.onClick}>
            <IconArrowBackUp size={16} strokeWidth={1.6} />
        </IconButton>
    )
}

export const AddItem = ({
    name,
    onClick
}: Click & {
    name: string
}) => {
    return (
        <Button className='mb-2 ml-12 w-32' onClick={onClick}>
            <IconCirclePlus size={16} stroke={1.5} />
            {name}
        </Button>
    )
}
