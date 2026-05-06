import { Root, List, Trigger, Content } from '@radix-ui/react-tabs'
import { IconLoader2, IconX } from '@tabler/icons-react'
import { ReactElement } from 'react'
import { useTranslation } from '../../../i18n'
import { IconButton, HoverCard, Message, hoverCardSize, SqlQueryErrorMessage } from '../../../ui'
import { SqlPreview } from '../sql-preview'
import { Table } from '../table'
import { TableFooter } from '../table/footer'
import { QueryResult, QueryStatus } from './hooks'

interface Props {
    queryId: string
    results: QueryResult[]
    onClose: () => void
}

export const Result = ({ queryId, results, onClose }: Props) => {
    const { t } = useTranslation()
    const items = results.map((item, i) => {
        // Title shows at most 12 characters
        if (item.name.length > 12) {
            item.name = item.name.slice(0, 12) + '...'
        }
        return {
            name: `${i + 1}. ${item.name}`,
            value: i.toString(),
            data: item
        }
    })
    return (
        <Root className='flex h-full flex-col' defaultValue={items[0].value}>
            <div className='flex items-center gap-4 pr-4'>
                <List className='scrollbar-hide flex flex-1 overflow-x-auto' aria-label='Querys Result'>
                    {items.map(({ name, value, data }) => {
                        return (
                            <Trigger
                                key={value}
                                value={value}
                                className='relative border-r border-separator text-sm text-tertiary !outline-none data-[state=active]:border-b-theme data-[state=active]:text-primary data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:bottom-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-theme'
                            >
                                <Status result={data} />
                                <HoverCard
                                    openDelay={300}
                                    closeDelay={100}
                                    side='top'
                                    trigger={
                                        <div className='flex h-9 items-center justify-center whitespace-nowrap px-6 hover:text-primary'>
                                            {name}
                                        </div>
                                    }
                                >
                                    <SqlPreview
                                        className='px-4 py-2'
                                        style={hoverCardSize}
                                        value={data.sql}
                                    />
                                </HoverCard>
                            </Trigger>
                        )
                    })}
                </List>
                <IconButton title={t('close')} className='h-6' onClick={onClose}>
                    <IconX className='transform-gpu' size={16} strokeWidth={1.6} />
                </IconButton>
            </div>

            {items.map(({ value, data }) => {
                return (
                    <Content
                        className='flex flex-1 flex-col overflow-hidden border-t border-separator outline-none data-[state=inactive]:hidden'
                        key={value}
                        value={value}
                    >
                        <TabContent queryId={queryId} data={data} />
                    </Content>
                )
            })}
        </Root>
    )
}

const TabContent = ({ queryId, data }: { queryId: string; data: QueryResult }): ReactElement => {
    const { t, tf } = useTranslation()
    switch (data.status) {
        case QueryStatus.Running: {
            return <Message text={t('running')} />
        }
        case QueryStatus.Waiting: {
            return <Message text={t('waiting')} />
        }
        case QueryStatus.Stopped: {
            return <Message text={t('stopped')} />
        }
        case QueryStatus.Over: {
            if (!data.result.success) {
                return (
                    <>
                        <SqlQueryErrorMessage error={data.result.error} />
                        <TableFooter queryTime={data.queryTime} />
                    </>
                )
            }
            if (data.result.query.columns.length === 0 && data.result.query.rows.length === 0) {
                // TODO: MSSQL don't support getting affected rows yet, leaving as-is for now
                const msg =
                    data.result.query.rows_affected === null
                        ? t('executeSuccess')
                        : tf('rowsAffected', data.result.query.rows_affected.toString())
                return (
                    <>
                        <Message text={msg} />
                        <TableFooter duration={data.result.query.duration} queryTime={data.queryTime} />
                    </>
                )
            } else {
                return (
                    <>
                        <Table
                            readonly
                            data={data.result.query}
                            error={undefined}
                            saveColumnSizeID={`${queryId}-${data.sql}`}
                        />
                        <TableFooter
                            rowCount={data.result.query.rows.length}
                            colCount={data.result.query.columns.length}
                            duration={data.result.query.duration}
                            queryTime={data.queryTime}
                            tableData={data.result.query.rows.length > 0 ? data.result.query : undefined}
                        />
                    </>
                )
            }
        }
    }
}

const Status = ({ result }: { result: QueryResult }) => {
    switch (result.status) {
        case QueryStatus.Running: {
            return <IconLoader2 size={12} className='absolute left-1.5 top-3 animate-spin text-secondary' />
        }
        case QueryStatus.Over: {
            if (result.result.success) {
                return (
                    <div className='absolute left-[9px] top-[15px] h-1.5 w-1.5 rounded-full bg-green-500' />
                )
            } else {
                return <div className='absolute left-[9px] top-[15px] h-1.5 w-1.5 rounded-full bg-red-500' />
            }
        }
    }
    return null
}
