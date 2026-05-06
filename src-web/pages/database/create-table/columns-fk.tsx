import { IconArrowUpRight } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../../i18n'
import { IconButton, Autocomplete, TextInput, Select } from '../../../ui'
import { TableForeignKey, TableForeignKeyAction, db } from '../db/db'
import { useSchemaOptions } from '../hooks/use-db'
import { useTables } from '../hooks/use-tables'
import { useTableColumns } from './hooks'
import { Popover, Label } from './popover'

const FOREIGN_KEY_ACTIONS_OPTIONS = [
    TableForeignKeyAction.NoAction,
    TableForeignKeyAction.Restrict,
    TableForeignKeyAction.Cascade,
    TableForeignKeyAction.SetNull,
    TableForeignKeyAction.SetDefault
].map((item) => {
    return {
        name: item,
        value: item
    }
})

export const DEFAULT_FOREIGN_KEY = {
    name: null,
    schema: '',
    table: '',
    column: '',
    onUpdate: TableForeignKeyAction.NoAction,
    onDelete: TableForeignKeyAction.NoAction
}

interface Props {
    fk: TableForeignKey
    onChange: (fk: TableForeignKey) => void
    onDelete: () => void
}

export const ForeignKey = ({ fk, onChange, onDelete }: Props) => {
    const { t } = useTranslation()
    const showSchema = db.supportsMultipleSchemas()
    const [open, setOpen] = useState(true)
    const { data: tables } = useTables()
    const { schemas, selectOptions } = useSchemaOptions(tables)
    const tableSuggestions = useMemo(() => {
        return tables?.[fk.schema]?.map((item) => item.name) ?? []
    }, [tables, fk.schema])
    const { data: columnSuggestions = [], isValidating: columnLoading } = useTableColumns(fk.schema, fk.table)

    useEffect(() => {
        if (open && fk.schema === '') {
            onChange({ ...fk, schema: schemas[0] ?? '' })
        }
    }, [open, schemas])

    const fkContent = (): string => {
        if (!open) {
            if (showSchema) {
                return `${fk.schema}.${fk.table}.${fk.column}`
            } else {
                return `${fk.table}.${fk.column}`
            }
        } else {
            return '...'
        }
    }

    const trigger = (
        <IconButton title={t('foreignKey')} className='flex h-5 items-center gap-1 border border-lime-600'>
            <IconArrowUpRight size={16} stroke={1.5} className='text-lime-600' />
            <span className='whitespace-nowrap text-xs text-lime-600'>{fkContent()}</span>
        </IconButton>
    )

    return (
        <Popover
            open={open}
            onOpenChange={setOpen}
            trigger={trigger}
            title={t('foreignKey')}
            onDelete={() => {
                onDelete()
                setOpen(false)
            }}
        >
            <Label text={t('constraintName')} />
            <TextInput
                placeholder={t('automatic')}
                value={fk.name ?? ''}
                onChange={(val) => onChange({ ...fk, name: val === '' ? null : val })}
            />
            {showSchema && (
                <>
                    <Label text={t('referencedSchema')} />
                    <Select
                        value={fk.schema}
                        options={selectOptions}
                        onChange={(val) => onChange({ ...fk, schema: val, table: '', column: '' })}
                    />
                </>
            )}
            <Label text={t('referencedTable')} />
            <Autocomplete
                suggestions={tableSuggestions}
                value={fk.table}
                onChange={(val) => onChange({ ...fk, table: val, column: '' })}
            />
            <Label text={t('referencedColumn')} />
            <Autocomplete
                placeholder={columnLoading ? t('loading') : undefined}
                suggestions={columnSuggestions}
                value={fk.column}
                onChange={(val) => onChange({ ...fk, column: val })}
            />
            <Label text='On Update' />
            <Select
                options={FOREIGN_KEY_ACTIONS_OPTIONS}
                value={fk.onUpdate}
                onChange={(val) => onChange({ ...fk, onUpdate: val as TableForeignKeyAction })}
            />
            <Label text='On Delete' />
            <Select
                options={FOREIGN_KEY_ACTIONS_OPTIONS}
                value={fk.onDelete}
                onChange={(val) => onChange({ ...fk, onDelete: val as TableForeignKeyAction })}
            />
        </Popover>
    )
}
