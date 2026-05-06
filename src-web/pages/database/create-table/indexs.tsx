import { useTranslation } from '../../../i18n'
import { TextInput } from '../../../ui'
import type { TableIndex } from '../db/db'
import { AddIndexColumn, DeleteColumn } from './buttons'
import { IndexColumn } from './indexs-columns'
import { IndexOption } from './indexs-option'

export const IndexHeader = () => {
    const { t } = useTranslation()
    return (
        <div className='sticky top-0 z-10 flex h-8 min-w-max items-center gap-2 border-y border-separator bg-zinc-100 pl-14 pr-4 text-sm text-primary dark:bg-zinc-900'>
            <p className='w-32'>{t('index')}</p>
            <p className='w-32'>{t('option')}</p>
            <p className='flex-1'>{t('column')}</p>
        </div>
    )
}

interface Props {
    index: TableIndex
    columnSuggestions: string[]
    onUpdate: <K extends keyof TableIndex>(key: K, value: TableIndex[K]) => void
    onDelete: () => void
}

export const IndexItem = ({ index, columnSuggestions, onUpdate, onDelete }: Props) => {
    return (
        <div className='flex items-center gap-2 bg-main pl-12 pr-4'>
            <TextInput
                className='w-32'
                value={index.name ?? ''}
                onChange={(val) => onUpdate('name', val === '' ? null : val)}
            />
            <div className='h-5 w-32 px-2'>
                <IndexOption option={index.option} onChange={(val) => onUpdate('option', val)} />
            </div>
            <div className='flex h-7 flex-1 items-center gap-2 px-2'>
                {index.columns.map((item, i) => {
                    return (
                        <IndexColumn
                            key={i}
                            column={item}
                            columnSuggestions={columnSuggestions}
                            onChange={(val) => {
                                const newColumns = [...index.columns]
                                newColumns[i] = val
                                onUpdate('columns', newColumns)
                            }}
                            onDelete={() => {
                                const newColumns = [...index.columns]
                                newColumns.splice(i, 1)
                                onUpdate('columns', newColumns)
                            }}
                        />
                    )
                })}
                <AddIndexColumn
                    onClick={() => {
                        onUpdate('columns', [
                            ...index.columns,
                            {
                                name: ''
                            }
                        ])
                    }}
                />
            </div>
            <DeleteColumn onClick={onDelete} />
        </div>
    )
}
