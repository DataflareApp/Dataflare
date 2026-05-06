import { IconChartArea, IconChartBar, IconChartLine, IconChartPie, IconTable } from '@tabler/icons-react'
import { InferToolInput, InferToolOutput } from 'ai'
import React, { Fragment, memo, useMemo, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import {
    ComposedChart as RechartComposedChart,
    PieChart as RechartPieChart,
    ResponsiveContainer,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Area,
    Legend,
    Pie,
    Cell
} from 'recharts'
import { useTranslation } from '../../../i18n'
import {
    BAR_RADIUS_X,
    ComposedtooltipContent,
    convertQuery,
    IconButton,
    indexColor,
    legendContent,
    Message,
    PieLabelContent,
    PieTooltipContent
} from '../../../ui'
import { Table } from '../table'
import { AgentService } from './services'
import { tableReserveSizeY, ToolResultFrame } from './tool-ui'

type Input = InferToolInput<AgentService['tools']['generateChart']>
type Output = InferToolOutput<AgentService['tools']['generateChart']>

export const ToolChartResult = memo(({ input, output }: { input: Input; output: Output }) => {
    const { numberUtil } = useTranslation()
    const [showTable, setShowTable] = useState(false)
    const showLabel = input.series.length > 1
    const showExport = output.queryResult.columns.length > 0

    const f = (n: Output['series'][number]['min']): string | number => {
        if (typeof n === 'number') {
            return numberUtil.format(n)
        }
        return n
    }

    return (
        <ToolResultFrame
            icon={<ChartTypeIcon type={input.chartType} />}
            name={input.chartTitle}
            sql={input.sql}
            action={
                <IconButton onClick={() => setShowTable(!showTable)}>
                    <IconTable size={16} stroke={1.5} className={showTable ? 'text-theme' : undefined} />
                </IconButton>
            }
            query={showExport ? output.queryResult : undefined}
        >
            <Content showTable={showTable} input={input} output={output} />

            <div className='grid select-text grid-cols-4 gap-1 border-t border-separator px-3 py-2 font-jb text-xs text-quarternary'>
                {output.series.map((item, i) => {
                    return (
                        <Fragment key={i}>
                            {showLabel && (
                                <div className='col-span-4 flex items-center gap-1 pt-1'>
                                    <div
                                        className='h-3 w-1 shrink-0 rounded-sm'
                                        style={{ backgroundColor: indexColor(output.series[i].colorIndex) }}
                                    />
                                    <span className='truncate font-medium text-secondary'>
                                        {input.series[i]}
                                    </span>
                                </div>
                            )}
                            <div className='flex flex-wrap items-center gap-0.5'>
                                Min:
                                <span className='truncate text-secondary'>{f(item.min)}</span>
                            </div>
                            <div className='flex flex-wrap items-center gap-0.5'>
                                Max:
                                <span className='truncate text-secondary'>{f(item.max)}</span>
                            </div>
                            <div className='flex flex-wrap items-center gap-0.5'>
                                Avg:
                                <span className='truncate text-secondary'>{f(item.avg)}</span>
                            </div>
                            <div className='flex flex-wrap items-center gap-0.5'>
                                Sum:
                                <span className='truncate text-secondary'>{f(item.sum)}</span>
                            </div>
                        </Fragment>
                    )
                })}
            </div>
        </ToolResultFrame>
    )
})

const Content = ({ showTable, input, output }: { showTable: boolean; input: Input; output: Output }) => {
    const { ref, inView } = useInView({ threshold: 0 })

    return (
        <div className='flex h-72' ref={ref}>
            {showTable ? (
                <Table
                    readonly
                    error={undefined}
                    reserveSizeY={tableReserveSizeY}
                    data={output.queryResult}
                    saveColumnSizeID={`tool-chart-${input.sql}`}
                />
            ) : (
                inView && <ChartContent input={input} output={output} />
            )}
        </div>
    )
}

export const ChartTypeIcon = ({ type }: { type: Input['chartType'] }): JSX.Element => {
    switch (type) {
        case 'bar':
            return <IconChartBar size={16} strokeWidth={1.5} className='shrink-0' />
        case 'line':
            return <IconChartLine size={16} strokeWidth={1.5} className='shrink-0' />
        case 'area':
            return <IconChartArea size={16} strokeWidth={1.5} className='shrink-0' />
        case 'pie':
            return <IconChartPie size={16} strokeWidth={1.5} className='shrink-0' />
    }
}

const ChartContent = ({ input, output }: { input: Input; output: Output }): JSX.Element => {
    const { t } = useTranslation()
    const data = useMemo(() => {
        return convertQuery(output.queryResult)
    }, [output.queryResult])

    if (output.queryResult.columns.length === 0 || output.queryResult.rows.length === 0) {
        return <Message text={t('noRows')} />
    }

    const showLegend = input.series.length > 1

    switch (input.chartType) {
        case 'bar':
        case 'line':
        case 'area': {
            return (
                <ResponsiveContainer>
                    <RechartComposedChart
                        data={data}
                        layout='horizontal'
                        margin={{ top: 12, right: 24, bottom: 6 }}
                    >
                        <CartesianGrid
                            className='text-neutral-200 dark:text-neutral-800'
                            stroke='currentColor'
                            strokeDasharray='3 6'
                            horizontal={true}
                            vertical={false}
                        />
                        <XAxis
                            height={22}
                            dataKey={input.dimension}
                            type={'category'}
                            axisLine={false}
                            tickLine={false}
                            className='text-xs text-tertiary'
                            stroke='currentColor'
                        />
                        <YAxis
                            width={52}
                            type={'number'}
                            axisLine={false}
                            tickLine={false}
                            className='text-xs text-tertiary'
                            stroke='currentColor'
                        />

                        <Tooltip cursor={false} content={ComposedtooltipContent} isAnimationActive={false} />

                        {showLegend && <Legend content={legendContent as any} wrapperStyle={{ bottom: 0 }} />}

                        {input.chartType === 'bar' &&
                            input.series.map((column, i): JSX.Element => {
                                return (
                                    <Bar
                                        key={i}
                                        dataKey={column}
                                        barSize={12}
                                        fill={indexColor(output.series[i].colorIndex)}
                                        radius={BAR_RADIUS_X}
                                        isAnimationActive={false}
                                    />
                                )
                            })}
                        {input.chartType === 'line' &&
                            input.series.map((column, i): JSX.Element => {
                                return (
                                    <Line
                                        key={i}
                                        dataKey={column}
                                        stroke={indexColor(output.series[i].colorIndex)}
                                        type={'monotone'}
                                        strokeWidth={1.5}
                                        dot={false}
                                        activeDot={true}
                                        isAnimationActive={false}
                                    />
                                )
                            })}
                        {input.chartType === 'area' &&
                            input.series.map((column, i): JSX.Element => {
                                return (
                                    <Area
                                        key={i}
                                        dataKey={column}
                                        stroke={indexColor(output.series[i].colorIndex)}
                                        fill={indexColor(output.series[i].colorIndex)}
                                        type={'monotone'}
                                        strokeWidth={1.5}
                                        dot={false}
                                        activeDot={true}
                                        isAnimationActive={false}
                                    />
                                )
                            })}
                    </RechartComposedChart>
                </ResponsiveContainer>
            )
        }
        case 'pie': {
            return (
                <ResponsiveContainer>
                    <RechartPieChart margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
                        <Tooltip cursor={false} content={PieTooltipContent} isAnimationActive={false} />
                        {input.series.length > 0 && (
                            <Pie
                                data={data}
                                nameKey={input.dimension}
                                dataKey={input.series[0]}
                                outerRadius='100%'
                                label={PieLabelContent}
                                labelLine={false}
                                isAnimationActive={false}
                                minAngle={8}
                            >
                                {data.map((_, i) => {
                                    return (
                                        <Cell
                                            key={i}
                                            className='stroke-main outline-none'
                                            strokeWidth={0.6}
                                            fill={indexColor(output.series[0].colorIndex + i)}
                                        />
                                    )
                                })}
                            </Pie>
                        )}
                    </RechartPieChart>
                </ResponsiveContainer>
            )
        }
    }
}
