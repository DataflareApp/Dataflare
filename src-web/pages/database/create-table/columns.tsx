import { IconGripHorizontal } from '@tabler/icons-react'
import { Reorder, useDragControls } from 'framer-motion'
import { useTranslation } from '../../../i18n'
import { Autocomplete, TextInput } from '../../../ui'
import { useDatabaseDataType } from '../hooks/use-db'
import { AddForeignKey, DeleteColumn, NotNull, PrimaryKey, Unique } from './buttons'
import { DEFAULT_FOREIGN_KEY, ForeignKey } from './columns-fk'
import { Column } from './hooks'

export const ColumnHeader = () => {
    const { t } = useTranslation()
    return (
        <div className='sticky top-0 z-10 flex h-8 min-w-max items-center gap-2 border-y border-separator bg-zinc-100 pl-14 pr-4 text-sm text-primary dark:bg-zinc-900'>
            <p className='w-32'>{t('column')}</p>
            <p className='w-32'>{t('datatype')}</p>
            <p className='w-32'>{t('defaultValue')}</p>
            <p className='flex-1'>{t('constraint')}</p>
        </div>
    )
}

interface Props {
    column: Column
    onUpdate: <K extends keyof Column>(key: K, value: Column[K]) => void
    onDelete: () => void
}

export const ColumnItem = ({ column, onUpdate, onDelete }: Props) => {
    const controls = useDragControls()
    const datatypes = useDatabaseDataType()

    return (
        <Reorder.Item
            value={column}
            dragListener={false}
            dragControls={controls}
            className='flex items-center gap-2 bg-main px-4'
        >
            <div
                className='flex h-7 cursor-grab items-center pr-2 text-tertiary hover:text-primary'
                onPointerDown={(e) => controls.start(e)}
            >
                <IconGripHorizontal size={16} />
            </div>
            <TextInput className='w-32' value={column.name} onChange={(val) => onUpdate('name', val)} />
            <Autocomplete
                className='w-32'
                value={column.datatype}
                onChange={(val) => onUpdate('datatype', val)}
                suggestions={datatypes}
            />
            <TextInput
                className='w-32'
                value={column.defaultValue ?? ''}
                onChange={(val) => onUpdate('defaultValue', val === '' ? null : val)}
            />
            <div className='flex h-7 flex-1 items-center gap-2'>
                <PrimaryKey
                    highlight={column.primaryKey}
                    onClick={() => onUpdate('primaryKey', !column.primaryKey)}
                />
                <NotNull highlight={column.notNull} onClick={() => onUpdate('notNull', !column.notNull)} />
                <Unique highlight={column.unique} onClick={() => onUpdate('unique', !column.unique)} />
                {column.foreignKeys.map((item, i) => {
                    return (
                        <ForeignKey
                            key={i}
                            fk={item}
                            onChange={(val) => {
                                const newForeignKey = [...column.foreignKeys]
                                newForeignKey[i] = val
                                onUpdate('foreignKeys', newForeignKey)
                            }}
                            onDelete={() => {
                                const newForeignKey = [...column.foreignKeys]
                                newForeignKey.splice(i, 1)
                                onUpdate('foreignKeys', newForeignKey)
                            }}
                        />
                    )
                })}
                <AddForeignKey
                    onClick={() => {
                        onUpdate('foreignKeys', [...column.foreignKeys, DEFAULT_FOREIGN_KEY])
                    }}
                />
            </div>
            <DeleteColumn onClick={onDelete} />
        </Reorder.Item>
    )
}
