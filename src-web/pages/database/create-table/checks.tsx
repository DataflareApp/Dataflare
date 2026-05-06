import { useTranslation } from '../../../i18n'
import { TextInput } from '../../../ui'
import type { TableCheck } from '../db/db'
import { DeleteColumn } from './buttons'

export const ChecksHeader = () => {
    const { t } = useTranslation()
    return (
        <div className='sticky top-0 z-10 flex h-8 min-w-max items-center gap-2 border-y border-separator bg-zinc-100 pl-14 pr-4 text-sm text-primary dark:bg-zinc-900'>
            <p className='w-32'>{t('check')}</p>
            <p className='flex-1'>{t('expression')}</p>
        </div>
    )
}

interface Props {
    check: TableCheck
    onUpdate: <K extends keyof TableCheck>(key: K, value: TableCheck[K]) => void
    onDelete: () => void
}

export const CheckItem = ({ check, onUpdate, onDelete }: Props) => {
    const { t } = useTranslation()
    return (
        <div className='flex items-center gap-2 bg-main pl-12 pr-4'>
            <TextInput
                className='w-32'
                placeholder={t('automatic')}
                value={check.name ?? ''}
                onChange={(val) => onUpdate('name', val === '' ? null : val)}
            />
            <TextInput
                className='mr-auto w-[264px]'
                value={check.expression}
                onChange={(val) => onUpdate('expression', val)}
            />
            <DeleteColumn onClick={onDelete} />
        </div>
    )
}
