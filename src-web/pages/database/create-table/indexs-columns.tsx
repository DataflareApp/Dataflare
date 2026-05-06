import { useEffect, useState } from 'react'
import { useTranslation } from '../../../i18n'
import { IconButton, Autocomplete } from '../../../ui'
import type { TableIndexColumn } from '../db/db'
import { Popover, Label } from './popover'

interface Props {
    column: TableIndexColumn
    columnSuggestions: string[]
    onChange: (column: TableIndexColumn) => void
    onDelete: () => void
}

export const IndexColumn = ({ column, columnSuggestions, onChange, onDelete }: Props) => {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)

    useEffect(() => {
        column.name === '' && setOpen(true)
    }, [])

    const onOpenChange = (open: boolean) => {
        if (!open && column.name === '') {
            onDelete()
        }
        setOpen(open)
    }

    const trigger = (
        <IconButton className='flex h-5 items-center border border-purple-500'>
            <span className='whitespace-nowrap text-xs text-purple-500'>{open ? '...' : column.name}</span>
        </IconButton>
    )

    return (
        <Popover
            title={t('indexColumn')}
            open={open}
            onOpenChange={onOpenChange}
            trigger={trigger}
            onDelete={() => {
                onDelete()
                setOpen(false)
            }}
        >
            <Label text={t('column')} />
            <Autocomplete
                suggestions={columnSuggestions}
                value={column.name}
                onChange={(val) => onChange({ ...column, name: val })}
            />
        </Popover>
    )
}
