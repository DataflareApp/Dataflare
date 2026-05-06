import { IconAlignJustified, IconClockHour3, IconTable } from '@tabler/icons-react'
import { InferToolInput, InferToolOutput } from 'ai'
import clsx from 'clsx'
import React, { memo, ReactNode, SVGProps } from 'react'
import { useTranslation } from '../../../i18n'
import { Tooltip } from '../../../ui/tooltip'
import { formatDuration } from '../../../utils/format'
import { Table } from '../table'
import { ROW_HEIGHT } from '../table/virtual-table'
import { AgentService } from './services'
import { tableReserveSizeY, ToolResultFrame } from './tool-ui'

type Input = InferToolInput<AgentService['tools']['runSQLQuery']>
type Output = InferToolOutput<AgentService['tools']['runSQLQuery']>

export const ToolQueryResult = memo(({ input, output }: { input: Input; output: Output }) => {
    const { t, tf, numberUtil } = useTranslation()
    const showTable = output.columns.length > 0
    const maxDirectDisplayRows = 10

    const tableHeight =
        (Math.min(Math.max(output.rows.length, 1), maxDirectDisplayRows) + 1) * ROW_HEIGHT + tableReserveSizeY

    const rowsValue = numberUtil.format(output.rows.length)
    const rowsTitle = tf('rowsCount', rowsValue)
    const colsValue = output.columns.length
    const colsTitle = tf('colsCount', colsValue as any)
    const affectedValue = output.rows_affected === null ? 'N/A' : numberUtil.format(output.rows_affected)
    const affectedTitle = tf('rowsAffected', affectedValue)
    const durationValue = formatDuration(output.duration, tf)
    const durationTitle = t('duration')

    return (
        <ToolResultFrame
            icon={<IconTable size={16} strokeWidth={1.5} className='shrink-0' />}
            name={'SQL Query'}
            sql={input.sql}
            query={showTable ? output : undefined}
        >
            {showTable && (
                <div className='flex' style={{ height: tableHeight }}>
                    <Table
                        readonly
                        reserveSizeY={tableReserveSizeY}
                        error={undefined}
                        data={output}
                        saveColumnSizeID={`tool-query-${input.sql}`}
                    />
                </div>
            )}

            <div
                className={clsx(
                    'flex select-text flex-wrap gap-x-4 gap-y-1 px-3 py-2 text-xs text-secondary',
                    {
                        'border-t border-separator': showTable
                    }
                )}
            >
                <Item
                    icon={<IconAlignJustified size={16} strokeWidth={1.5} className='shrink-0' />}
                    title={rowsTitle}
                    value={rowsValue}
                />
                <Item
                    icon={<IconAlignJustified size={16} strokeWidth={1.5} className='shrink-0 rotate-90' />}
                    title={colsTitle}
                    value={colsValue}
                />
                <Item
                    icon={<IconRowsAffected strokeWidth={1.5} className='size-4 shrink-0' />}
                    title={affectedTitle}
                    value={affectedValue}
                />
                <Item
                    className='ml-auto'
                    icon={<IconClockHour3 size={16} strokeWidth={1.5} className='shrink-0' />}
                    title={durationTitle}
                    value={durationValue}
                />
            </div>
        </ToolResultFrame>
    )
})

const Item = ({
    className,
    icon,
    title,
    value
}: {
    className?: string
    icon: ReactNode
    title: string
    value: ReactNode
}) => {
    return (
        <Tooltip title={title} delay={200}>
            <div className={clsx('flex items-center gap-1 overflow-hidden', className)}>
                {icon}
                <span className='truncate'>{value}</span>
            </div>
        </Tooltip>
    )
}

const IconRowsAffected = (props: SVGProps<SVGSVGElement>) => {
    return (
        <svg
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
            {...props}
        >
            <path d='M4 6l16 0' />
            <path d='M4 12l16 0' />
            <path d='M4 18l12 0' />
            <path d='M18.42 15.61c.195 -.195 .426 -.35 .681 -.455c.255 -.106 .528 -.16 .804 -.16c.276 0 .549 .054 .804 .16c.255 .106 .486 .26 .681 .455c.195 .195 .35 .427 .455 .681c.106 .255 .16 .528 .16 .804c0 .276 -.054 .549 -.16 .804c-.105 .255 -.26 .486 -.455 .681l-3.39 3.42h-3v-3l3.42 -3.39' />
        </svg>
    )
}
