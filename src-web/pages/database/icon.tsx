import {
    IconBolt,
    IconEye,
    IconFunction,
    IconLayoutDashboard,
    IconPuzzle,
    IconSchema,
    IconSquareRoundedLetterD,
    IconSquareRoundedLetterN,
    IconTable,
    IconTablePlus
} from '@tabler/icons-react'
import { useTranslation } from '../../i18n'
import { HoverCard } from '../../ui'
import { TableType } from './db/db-types'
import { SqlPreview } from './sql-preview'

export const TriggerIcon = () => {
    return <IconBolt className='text-amber-500' size={16} stroke={1.5} />
}

export const FunctionIcon = () => {
    return <IconFunction className='text-orange-500' size={16} stroke={1.5} />
}

export const ExtensionIcon = () => {
    return <IconPuzzle className='min-w-4 text-teal-500' size={16} stroke={1.6} />
}

export const DashboardIcon = () => {
    return <IconLayoutDashboard className='text-indigo-500' size={16} stroke={1.5} />
}

export const SchemaIcon = () => {
    return <IconSchema className='text-theme' size={16} stroke={1.5} />
}

export const QueryIcon = () => {
    return (
        <svg viewBox='0 0 24 24' className='size-4 shrink-0 text-red-500' fill='none'>
            <path
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='1.5'
                d='m7 9 3 3-3 3M12 15h3'
            />
            <path
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='1.5'
                d='M3 7.5A4.5 4.5 0 0 1 7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9Z'
            />
        </svg>
    )
}

export const TableIcon = ({ type }: { type: TableType }) => {
    switch (type) {
        case TableType.Table:
            return <IconTable size={16} stroke={1.7} className='shrink-0 text-theme' />
        case TableType.View:
            return <IconEye size={16} stroke={1.7} className='shrink-0 text-theme' />
    }
}

export const NewTableIcon = () => {
    return <IconTablePlus className='text-green-500' size={16} stroke={1.7} />
}

export const KeyIcon = () => {
    return (
        <svg className='size-4 shrink-0 stroke-theme' viewBox='0 0 24 24' fill='none'>
            <path
                strokeLinejoin='round'
                strokeWidth='1.6'
                d='m19.516 10.692-5.968-6.98a2.04 2.04 0 0 0-3.096 0l-5.968 6.98a2.01 2.01 0 0 0 0 2.616l5.968 6.98a2.04 2.04 0 0 0 3.096 0l5.968-6.98a2.01 2.01 0 0 0 0-2.616Z'
            />
        </svg>
    )
}

export const NotNullIcon = ({ notNull }: { notNull: boolean }) => {
    if (!notNull) {
        return null
    }
    return (
        <HoverCard
            side='top'
            trigger={
                <IconSquareRoundedLetterN
                    size={16}
                    strokeWidth={1.5}
                    className='min-w-4 text-tertiary hover:text-primary'
                />
            }
            openDelay={0}
            closeDelay={100}
        >
            <SqlPreview value='NOT NULL' className='px-4 py-2' />
        </HoverCard>
    )
}

export const DefaultValueIcon = ({ defaultValue }: { defaultValue: string | null }) => {
    const { t } = useTranslation()
    if (defaultValue === null) {
        return null
    }
    return (
        <HoverCard
            side='top'
            trigger={
                <IconSquareRoundedLetterD
                    size={16}
                    strokeWidth={1.5}
                    className='min-w-4 text-tertiary hover:text-primary'
                />
            }
            openDelay={0}
            closeDelay={100}
        >
            <h2 className='px-4 text-sm leading-10 text-primary'>{t('defaultValue')}</h2>
            <SqlPreview value={defaultValue === '' ? 'EMPTY' : defaultValue} className='px-4 pb-2' />
        </HoverCard>
    )
}
