import { ReactNode, useMemo } from 'react'
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
    TooltipProps,
    Area,
    Legend,
    LegendProps,
    Pie,
    Cell
} from 'recharts'
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { ComposedChartConfig, Layout, PieChartConfig, Query, QueryData, Value } from '../tauri'

// TODO: Async import

export const BAR_RADIUS_X: [number, number, number, number] = [3, 3, 1, 1]
const BAR_RADIUS_Y: [number, number, number, number] = [1, 3, 3, 1]

// From: https://tailwindcss.com/docs/customizing-colors -500 (colors shuffled)
export const CHART_COLORS = [
    '#3b82f6',
    '#8b5cf6',
    '#22c55e',
    '#14b8a6',
    '#eab308',
    '#6366f1',
    '#0ea5e9',
    '#ef4444',
    '#10b981',
    '#d946ef',
    '#f59e0b',
    '#f43f5e',
    '#84cc16',
    '#a855f7',
    '#06b6d4',
    '#ec4899',
    '#f97316'
]

export const indexColor = (index: number) => {
    return CHART_COLORS[index % CHART_COLORS.length]
}

export const ComposedChart = ({ config, query }: { config: ComposedChartConfig; query: Query }) => {
    const data = useMemo(() => convertQuery(query), [query])

    const bars = useMemo(() => {
        return dedupeItems(config.bars, (t) => `bar-${t.dataKey}-${t.barSize}-${t.fill}`)
    }, [config.bars])

    const lines = useMemo(() => {
        return dedupeItems(config.lines, (t) => `line-${t.dataKey}-${t.stroke}-${t.type}`)
    }, [config.lines])

    const areas = useMemo(() => {
        return dedupeItems(config.areas, (t) => `area-${t.dataKey}-${t.fill}-${t.type}`)
    }, [config.areas])

    const horizontalLayout = config.layout === Layout.Horizontal
    const showLegend = bars.length + lines.length + areas.length > 1

    return (
        <ResponsiveContainer width='100%' height='100%' minWidth={100} minHeight={100}>
            <RechartComposedChart
                data={data}
                layout={config.layout}
                margin={{
                    top: 16,
                    bottom: !showLegend && config.axis.x.hidden ? 16 : 4,
                    left: config.axis.y.hidden ? 16 : undefined,
                    right: config.axis.y.hidden ? 16 : 24
                }}
            >
                <CartesianGrid
                    className='text-neutral-200 dark:text-neutral-800'
                    stroke='currentColor'
                    strokeDasharray='3 6'
                    horizontal={horizontalLayout}
                    vertical={!horizontalLayout}
                />
                <Tooltip cursor={false} content={ComposedtooltipContent} isAnimationActive={false} />
                {showLegend && (
                    <Legend
                        content={legendContent as any}
                        wrapperStyle={{
                            bottom: 0,
                            paddingTop: showLegend && config.axis.x.hidden ? 4 : undefined
                        }}
                    />
                )}
                <XAxis
                    height={22}
                    hide={config.axis.x.hidden}
                    dataKey={horizontalLayout ? config.categoryDataKey : undefined}
                    type={horizontalLayout ? 'category' : 'number'}
                    axisLine={false}
                    tickLine={false}
                    className='text-xs text-tertiary'
                    stroke='currentColor'
                />
                <YAxis
                    width={52}
                    hide={config.axis.y.hidden}
                    dataKey={horizontalLayout ? undefined : config.categoryDataKey}
                    type={horizontalLayout ? 'number' : 'category'}
                    axisLine={false}
                    tickLine={false}
                    className='text-xs text-tertiary'
                    stroke='currentColor'
                />
                {areas.length > 0 &&
                    areas.map(({ key, dataKey, fill, type }) => {
                        return (
                            <Area
                                key={key}
                                dataKey={dataKey}
                                stroke={fill}
                                fill={fill}
                                type={type}
                                strokeWidth={1.5}
                                dot={false}
                                activeDot={true}
                                isAnimationActive={false}
                            />
                        )
                    })}
                {bars.length > 0 &&
                    bars.map(({ key, dataKey, barSize, fill }) => {
                        return (
                            <Bar
                                key={key}
                                dataKey={dataKey}
                                barSize={barSize}
                                fill={fill}
                                radius={horizontalLayout ? BAR_RADIUS_X : BAR_RADIUS_Y}
                                isAnimationActive={false}
                            />
                        )
                    })}
                {lines.length > 0 &&
                    lines.map(({ key, dataKey, stroke, type }) => {
                        return (
                            <Line
                                key={key}
                                dataKey={dataKey}
                                stroke={stroke}
                                type={type}
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

export const PieChart = ({ config, query }: { config: PieChartConfig; query: Query }) => {
    const data = useMemo(() => convertQuery(query), [query])

    return (
        <ResponsiveContainer width='100%' height='100%' minWidth={100} minHeight={100}>
            <RechartPieChart>
                <Tooltip cursor={false} content={PieTooltipContent} isAnimationActive={false} />
                <Pie
                    data={data}
                    nameKey={config.nameKey}
                    dataKey={config.dataKey}
                    outerRadius='96%'
                    label={PieLabelContent}
                    labelLine={false}
                    isAnimationActive={false}
                    minAngle={8}
                >
                    {data.map((_, i) => (
                        <Cell
                            key={i}
                            className='stroke-main outline-none'
                            strokeWidth={0.6}
                            fill={indexColor(config.startColorIndex + i)}
                        />
                    ))}
                </Pie>
            </RechartPieChart>
        </ResponsiveContainer>
    )
}

export const legendContent = (props: LegendProps): ReactNode => {
    return (
        <div className='flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 pb-2'>
            {props.payload!.map((item, i) => {
                return (
                    <div key={i} className='flex h-3 items-center gap-1 text-xs'>
                        <div className='h-full w-1 rounded-sm' style={{ backgroundColor: item.color }} />
                        <span className='text-tertiary'>{item.value}</span>
                    </div>
                )
            })}
        </div>
    )
}

export const ComposedtooltipContent = (props: TooltipProps<ValueType, NameType>): ReactNode => {
    if (!props.active || props.label === undefined || !props.payload?.length) {
        return null
    }
    return (
        <div className='rounded border border-separator bg-main px-3 py-2 shadow-lg'>
            <h3 className='text-sm text-primary'>{props.label}</h3>
            {props.payload.map((item, i) => {
                return (
                    <div key={i} className='mt-1 flex h-5 items-center gap-2 text-xs'>
                        <div className='h-full w-1 rounded-sm' style={{ backgroundColor: item.color }} />
                        <span className='text-tertiary'>{item.name}</span>
                        <span className='ml-auto text-primary'>{item.value}</span>
                    </div>
                )
            })}
        </div>
    )
}

export const PieTooltipContent = (props: TooltipProps<ValueType, NameType>): ReactNode => {
    if (props.payload === undefined || props.payload.length === 0) {
        return null
    }
    const { name, value, payload } = props.payload[0]

    return (
        <div className='flex items-center gap-2 rounded border border-separator bg-main px-3 py-2 text-xs shadow-lg'>
            <div className='h-5 w-1 rounded-sm' style={{ backgroundColor: payload.fill }} />
            <span className='text-tertiary'>{name}</span>
            <span className='ml-auto text-primary'>{value}</span>
        </div>
    )
}

export const PieLabelContent = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    name,
    value
}: any) => {
    const RADIAN = Math.PI / 180
    const rate = (percent * 100).toFixed(0) + '%'
    const radius = innerRadius + (outerRadius - innerRadius)

    const rateRadius = radius * 0.4
    const rateX = cx + rateRadius * Math.cos(-midAngle * RADIAN)
    const rateY = cy + rateRadius * Math.sin(-midAngle * RADIAN)

    const valueRadius = radius * 0.7
    const valueX = cx + valueRadius * Math.cos(-midAngle * RADIAN)
    const valueY = cy + valueRadius * Math.sin(-midAngle * RADIAN)

    return (
        <>
            <text
                x={rateX}
                y={rateY}
                fill='white'
                fillOpacity={0.5}
                strokeWidth={0}
                fontSize={12}
                textAnchor='middle'
                dominantBaseline='middle'
                className='pointer-events-none'
            >
                {rate}
            </text>
            <text
                x={valueX}
                y={valueY - 6}
                fill='white'
                strokeWidth={0}
                fontSize={12}
                textAnchor='middle'
                dominantBaseline='middle'
                className='pointer-events-none'
            >
                {value}
            </text>
            <text
                x={valueX}
                y={valueY + 6}
                fill='white'
                fillOpacity={0.9}
                strokeWidth={0}
                fontSize={12}
                textAnchor='middle'
                dominantBaseline='middle'
                className='pointer-events-none'
            >
                {name}
            </text>
        </>
    )
}

// Deduplicate items and add a key property
const dedupeItems = <T,>(items: T[], toKey: (item: T) => string): (T & { key: string })[] => {
    const seen = new Set<string>()
    return items
        .map((item) => {
            return {
                ...item,
                key: toKey(item)
            }
        })
        .filter((item) => {
            if (seen.has(item.key)) {
                return false
            }
            seen.add(item.key)
            return true
        })
}

export const convertQuery = ({ columns, rows }: QueryData): object[] => {
    const MIN_NUMBER = BigInt(Number.MIN_SAFE_INTEGER)
    const MAX_NUMBER = BigInt(Number.MAX_SAFE_INTEGER)
    const conver = (value: Value): number | string => {
        switch (typeof value) {
            case 'number': {
                return value
            }
            case 'bigint': {
                if (value >= MIN_NUMBER && value <= MAX_NUMBER) {
                    return Number(value)
                }
                return ''
            }
            case 'string': {
                return value
            }
            default: {
                return ''
            }
        }
    }
    return rows.map((row) => {
        const obj: Record<string, string | number> = {}
        for (let i = 0; i < columns.length; i++) {
            obj[columns[i].name] = conver(row[i])
        }
        return obj as object
    })
}
