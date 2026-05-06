import { IconArrowUpRight, IconKey, IconSquareRoundedLetterI } from '@tabler/icons-react'
import { Handle, Position } from '@xyflow/react'
import { Fragment } from 'react'
import { useTranslation } from '../../../i18n'
import { IconButton, HoverCard } from '../../../ui'
import { SchemaEntry } from '../db/db'
import { TabType, useTabsStore } from '../hooks/use-store'
import { DefaultValueIcon, NotNullIcon, TableIcon } from '../icon'

export interface TableNodeProps {
    data: SchemaEntry & {
        schema: string
    } & {
        indexs: Indexs
    }
}

type Indexs = {
    [indexName: string]: {
        unique: boolean
        columns: string[]
    }
}

export const Table = ({ data }: TableNodeProps) => {
    const switchTabTo = useTabsStore((state) => state.switchTabTo)

    const indexColumns = Object.values(data.indexs)
        .map((item) => item.columns)
        .flat()

    const onClickView = () => {
        switchTabTo({
            type: TabType.Preview,
            entry: {
                schema: data.schema,
                table: data.tableName
            },
            tableType: data.tableType
        })
    }

    return (
        <div className='group w-72 overflow-hidden rounded border border-separator bg-main shadow-lg'>
            <header className='flex h-9 items-center border-b border-separator px-4'>
                <TableIcon type={data.tableType} />
                <span className='ml-2 flex-1 truncate text-sm text-primary'>{data.tableName}</span>
                <IconButton className='nodrag hidden group-hover:block' onClick={onClickView}>
                    <IconArrowUpRight size={16} stroke={1.5} />
                </IconButton>
            </header>
            <ul className='w-full cursor-default'>
                {data.columns.map((col) => (
                    <li key={col.name} className='relative flex h-8 items-center gap-2 px-4'>
                        <PrimaryKey show={col.primaryKey} />

                        <span className='flex-1 truncate text-sm text-secondary' title={col.name}>
                            {col.name}
                        </span>

                        <span
                            className='truncate text-xs text-tertiary'
                            title={col.datatype}
                            style={{
                                maxWidth: '30%'
                            }}
                        >
                            {col.datatype}
                        </span>

                        <NotNullIcon notNull={col.notNull} />
                        <DefaultValueIcon defaultValue={col.defaultValue} />

                        {indexColumns.includes(col.name) && <Index column={col.name} indexs={data.indexs} />}

                        <Handle
                            className='opacity-0'
                            type='source'
                            position={Position.Right}
                            id={col.name}
                            isConnectable={false}
                        />
                        <Handle
                            className='opacity-0'
                            type='target'
                            position={Position.Left}
                            id={col.name}
                            isConnectable={false}
                        />
                    </li>
                ))}
            </ul>
        </div>
    )
}

const PrimaryKey = ({ show }: { show: boolean }) => {
    if (show) {
        return <IconKey size={16} stroke={1.5} className='text-yellow-600' />
    }
    return <div className='w-4' />
}

type IndexProps = {
    column: string
    indexs: Indexs
}

const Index = (props: IndexProps) => {
    return (
        <HoverCard
            side='top'
            trigger={
                <IconSquareRoundedLetterI
                    size={16}
                    strokeWidth={1.5}
                    className='text-tertiary hover:text-primary'
                />
            }
            openDelay={0}
            closeDelay={100}
        >
            <IndexPopover {...props} />
        </HoverCard>
    )
}

const IndexPopover = ({ column, indexs }: IndexProps) => {
    const { t } = useTranslation()
    // Filter out indexes that don't contain this column
    const inxs = Object.keys(indexs).filter((indexName) => indexs[indexName].columns.includes(column))

    return (
        <>
            <h2 className='px-4 text-sm leading-10 text-primary'>{t('index')}</h2>
            {inxs.map((indexName) => {
                return (
                    <Fragment key={indexName}>
                        <h4
                            className='flex select-text items-center px-4 text-sm text-secondary'
                            onContextMenu={(e) => e.stopPropagation()}
                        >
                            {indexName}
                            {indexs[indexName].unique && (
                                <span className='ml-2 rounded border border-sky-500 px-2 text-xs text-sky-500'>
                                    Unique
                                </span>
                            )}
                        </h4>
                        <div className='mb-3 mt-2 flex items-center gap-2 px-4'>
                            {indexs[indexName].columns.map((column) => {
                                return (
                                    <span
                                        key={column}
                                        className='rounded border border-separator px-2 py-[2px] text-xs text-tertiary'
                                    >
                                        {column}
                                    </span>
                                )
                            })}
                        </div>
                    </Fragment>
                )
            })}
        </>
    )
}
