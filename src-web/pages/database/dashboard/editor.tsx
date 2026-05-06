import { IconArrowLeft, IconArrowRight, IconMinus, IconPlus } from '@tabler/icons-react'
import { clsx } from 'clsx'
import React, { ReactNode, useMemo } from 'react'
import { Fragment } from 'react'
import useSWRMutation from 'swr/mutation'
import { t, useTranslation } from '../../../i18n'
import {
    ALL_LINE_TYPE_OPTIONS,
    AreaItem,
    Axis,
    BarItem,
    Layout,
    LineItem,
    LineType,
    ComposedChartConfig,
    PieChartConfig,
    WidgetConfig,
    WidgetType,
    Query,
    Value
} from '../../../tauri'
import {
    Button,
    IconButton,
    IconRefresh,
    SelectButton,
    ColorSelect,
    randomColor,
    DropdownMenu,
    DropdownMenuItem,
    TextInput,
    showMessageBox,
    ScrollView,
    Select,
    SelectProps,
    Slider,
    SplitView,
    Direction,
    Pin,
    Persistent,
    Message,
    Switch
} from '../../../ui'
import { db } from '../db/db'
import { useLanguageHighLight } from '../hooks/use-db'
import { useEditorFontOptions } from '../hooks/use-sql-editor-options'
import { useEditorCompletions } from '../query/hooks'
import { SimpleSqlEditor } from '../sql-editor/simple'
import { Table } from '../table'
import { DEFAULT_CATEGORY_KEY, INTERVALS, randomPieColorIndex } from './config'
import { useArray, useQueryKeys, useWidgetConfig } from './hooks'
import { WidgetContent } from './widget'

const SAVE_ID = 'Widget-Editor.Query-Preview'

interface Props {
    widgetConfig: WidgetConfig
    onSave: (config: WidgetConfig) => void
}

export const WidgetEditor = ({ widgetConfig, onSave }: Props): ReactNode => {
    const fontOptions = useEditorFontOptions()
    const language = useLanguageHighLight()
    const [completions] = useEditorCompletions()
    const { config, updateName, updateSource, updateInterval, updateData } = useWidgetConfig(widgetConfig)

    const {
        data: query,
        trigger,
        isMutating,
        reset
    } = useSWRMutation(['WidgetEditorQuery', config.source], ([_, source]) => {
        return db.query(source)
    })
    const { keySet, keyOptions } = useQueryKeys(query)

    // Check if the key still exists
    if (keySet.size !== 0) {
        if (config.options.type === WidgetType.ComposedChart) {
            if (config.options.config.categoryDataKey !== DEFAULT_CATEGORY_KEY) {
                if (!keySet.has(config.options.config.categoryDataKey)) {
                    return updateData('categoryDataKey', DEFAULT_CATEGORY_KEY)
                }
            }
            const bars = checkItemsDataKey(keySet, config.options.config.bars)
            if (bars !== null) {
                return updateData('bars', bars)
            }
            const lines = checkItemsDataKey(keySet, config.options.config.lines)
            if (lines !== null) {
                return updateData('lines', lines)
            }
            const areas = checkItemsDataKey(keySet, config.options.config.areas)
            if (areas !== null) {
                return updateData('areas', areas)
            }
        }
        if (config.options.type === WidgetType.PieChart) {
            if (!keySet.has(config.options.config.nameKey)) {
                const nameKey = findKey(query!, (value) => {
                    return typeof value === 'string'
                })
                return updateData('nameKey', nameKey ?? query!.columns[0].name)
            }
            if (!keySet.has(config.options.config.dataKey)) {
                const dataKey = findKey(query!, (value) => {
                    return typeof value === 'number' || typeof value === 'bigint'
                })
                return updateData('dataKey', dataKey ?? query!.columns[0].name)
            }
        }
    }

    return (
        <SplitView
            className='size-full'
            id='Widget-Editor-Popup'
            direction={Direction.Horizontal}
            pin={Pin.Last}
            minPinSize={300}
            defaultPinSize={300}
            maxPinSize={460}
            persistent={Persistent.Temporary}
        >
            {query === undefined ? (
                <SimpleSqlEditor
                    value={config.source}
                    onChange={(value) => updateSource(value)}
                    completions={completions}
                    fontOptions={fontOptions}
                    language={language}
                />
            ) : (
                <SplitView
                    className='h-full flex-col'
                    direction={Direction.Vertical}
                    pin={Pin.Last}
                    minPinSize={140}
                    defaultPinSize={160}
                    maxPinSize={400}
                    id='Widget-Editor-Preview'
                    persistent={Persistent.Temporary}
                >
                    <WidgetContent wid={SAVE_ID} config={config} query={query} />
                    {widgetConfig.options.type !== WidgetType.Table && (
                        <div className='flex h-full'>
                            <Table readonly error={undefined} saveColumnSizeID={SAVE_ID} data={query} />
                        </div>
                    )}
                </SplitView>
            )}

            <div className='flex h-full flex-col'>
                <div className='flex h-11 shrink-0 items-center justify-between border-b border-separator px-4'>
                    <Button onClick={reset} disabled={query === undefined}>
                        <IconArrowLeft size={16} strokeWidth={1.5} />
                    </Button>
                    <span className='text-sm text-secondary'>{query === undefined ? '1' : '2'}/2</span>
                    {query === undefined ? (
                        <Button
                            primary
                            disabled={config.source.trim() === ''}
                            loading={isMutating}
                            onClick={async () => {
                                try {
                                    await trigger()
                                } catch (err: any) {
                                    showMessageBox(t('error'), err, 'error')
                                }
                            }}
                        >
                            <IconArrowRight size={16} strokeWidth={1.5} />
                        </Button>
                    ) : (
                        <Button primary onClick={() => onSave(config)}>
                            {t('save')}
                        </Button>
                    )}
                </div>
                {query === undefined ? (
                    <Message text={t('widgetSourceMessage')} />
                ) : (
                    <ScrollView axis='y' className='flex-1' viewportClassName='pb-12'>
                        <NameEditor name={config.name} onChange={updateName} />
                        <IntervalEditor interval={config.interval} onChange={updateInterval} />
                        {config.options.type === WidgetType.ComposedChart && (
                            <ChartDataEditor
                                keyOptions={keyOptions}
                                data={config.options.config}
                                onChange={updateData}
                            />
                        )}
                        {config.options.type === WidgetType.PieChart && (
                            <PieChartDataEditor
                                keyOptions={keyOptions}
                                data={config.options.config}
                                onChange={updateData}
                            />
                        )}
                    </ScrollView>
                )}
            </div>
        </SplitView>
    )
}

const NameEditor = ({ name, onChange }: { name: string; onChange: (name: string) => void }) => {
    return (
        <Box name={t('name')}>
            <TextInput className='mt-2 w-full' value={name} onChange={onChange} />
        </Box>
    )
}

const IntervalEditor = ({
    interval,
    onChange
}: {
    interval: number
    onChange: (interval: number) => void
}) => {
    return (
        <Box name={t('autoRefresh')}>
            <div className='mt-2 grid grid-cols-4 gap-2 text-xs text-tertiary'>
                {INTERVALS.map((val) => {
                    return (
                        <SelectButton key={val} selected={val === interval} onClick={() => onChange(val)}>
                            {val === 0 ? t('off') : `${val}s`}
                        </SelectButton>
                    )
                })}
            </div>
        </Box>
    )
}

const PieChartDataEditor = ({
    keyOptions,
    data,
    onChange
}: {
    keyOptions: SelectProps['options']
    data: PieChartConfig
    onChange: <K extends keyof PieChartConfig>(key: K, value: PieChartConfig[K]) => void
}) => {
    return (
        <>
            <Box name={t('label')}>
                <div className='mt-2'>
                    <Select
                        className='w-full'
                        options={keyOptions}
                        value={data.nameKey}
                        onChange={(val) => onChange('nameKey', val)}
                    />
                </div>
            </Box>
            <Box name={t('value')}>
                <div className='mt-2'>
                    <Select
                        className='w-full'
                        options={keyOptions}
                        value={data.dataKey}
                        onChange={(val) => onChange('dataKey', val)}
                    />
                </div>
            </Box>
            <Box
                name={t('color')}
                titleChildren={
                    <IconButton
                        title={t('refresh')}
                        onClick={() => onChange('startColorIndex', randomPieColorIndex(data.startColorIndex))}
                    >
                        <IconRefresh loading={false} />
                    </IconButton>
                }
            />
        </>
    )
}

const ChartDataEditor = ({
    keyOptions,
    data,
    onChange
}: {
    keyOptions: SelectProps['options']
    data: ComposedChartConfig
    onChange: <K extends keyof ComposedChartConfig>(key: K, value: ComposedChartConfig[K]) => void
}) => {
    return (
        <>
            <LayoutEditor
                layout={data.layout}
                onChangeLayout={(layout) => onChange('layout', layout)}
                axis={data.axis}
                onChange={(axis) => onChange('axis', axis)}
            />
            <CategoryEditor
                keyOptions={keyOptions}
                categoryDataKey={data.categoryDataKey}
                onChange={(key) => onChange('categoryDataKey', key)}
            />
            <BarsEditor
                keyOptions={keyOptions}
                items={data.bars}
                onChange={(bars) => onChange('bars', bars)}
            />
            <LinesEditor
                keyOptions={keyOptions}
                items={data.lines}
                onChange={(lines) => onChange('lines', lines)}
            />
            <AreasEditor
                keyOptions={keyOptions}
                items={data.areas}
                onChange={(areas) => onChange('areas', areas)}
            />
        </>
    )
}

const LayoutIcon = ({ horizontal, prominent }: { horizontal: boolean; prominent?: boolean }) => {
    return (
        <svg
            viewBox='0 0 24 24'
            className={clsx('aspect-square w-4', !horizontal && 'rotate-90', prominent && 'text-theme')}
        >
            <path
                d='M4 6h16 M4 12h16 M4 18h16'
                strokeWidth={1.6}
                stroke='currentColor'
                strokeLinecap='round'
            />
        </svg>
    )
}

const LayoutEditor = ({
    layout,
    onChangeLayout,
    axis,
    onChange
}: {
    layout: Layout
    onChangeLayout: (layout: Layout) => void
    axis: Axis
    onChange: (axis: Axis) => void
}) => {
    const { t } = useTranslation()
    return (
        <Box name={t('layout')}>
            <div className='mt-2 grid w-full grid-cols-4 gap-2 text-xs leading-7 text-tertiary'>
                <span className='col-span-2 leading-7'>{t('direction')}</span>
                <SelectButton
                    selected={layout === Layout.Horizontal}
                    onClick={() => onChangeLayout(Layout.Horizontal)}
                >
                    <LayoutIcon horizontal />
                </SelectButton>
                <SelectButton
                    selected={layout === Layout.Vertical}
                    onClick={() => onChangeLayout(Layout.Vertical)}
                >
                    <LayoutIcon horizontal={false} />
                </SelectButton>
                <span className='col-span-3'>{t('xLabel')}</span>
                <div className='justify-self-end'>
                    <Switch
                        checked={!axis.x.hidden}
                        onChange={(val) => onChange({ ...axis, x: { hidden: !val } })}
                    />
                </div>
                <span className='col-span-3'>{t('yLabel')}</span>
                <div className='justify-self-end'>
                    <Switch
                        checked={!axis.y.hidden}
                        onChange={(val) => onChange({ ...axis, y: { hidden: !val } })}
                    />
                </div>
            </div>
        </Box>
    )
}

const CategoryEditor = ({
    keyOptions,
    categoryDataKey,
    onChange
}: {
    keyOptions: SelectProps['options']
    categoryDataKey: string
    onChange: (categoryDataKey: string) => void
}) => {
    const options = useMemo(() => {
        return [
            {
                name: t('auto'),
                value: DEFAULT_CATEGORY_KEY
            },
            ...keyOptions.filter((item) => item.value !== DEFAULT_CATEGORY_KEY)
        ]
    }, [keyOptions])

    return (
        <Box name={t('category')}>
            <div className='mt-2'>
                <Select className='w-full' options={options} value={categoryDataKey} onChange={onChange} />
            </div>
        </Box>
    )
}

const BarsEditor = ({
    keyOptions,
    items,
    onChange
}: {
    keyOptions: SelectProps['options']
    items: BarItem[]
    onChange: (bars: BarItem[]) => void
}) => {
    const { add, remove, update } = useArray(items, onChange)
    return (
        <ArrayItemsEditor
            name={t('bars')}
            keyOptions={keyOptions}
            onAdd={(dataKey) => {
                add({
                    dataKey,
                    fill: randomColor(),
                    barSize: 20
                })
            }}
        >
            {items.map((item, i) => {
                return (
                    <Fragment key={i}>
                        <Fragment key={i}>
                            <Select
                                options={keyOptions}
                                value={item.dataKey}
                                onChange={(val) => update(i, 'dataKey', val)}
                            />
                            <Slider
                                min={2}
                                max={30}
                                step={2}
                                value={item.barSize}
                                onChange={(val) => update(i, 'barSize', val)}
                            />
                            <ColorSelect
                                className='mt-1'
                                value={item.fill}
                                onChange={(val) => update(i, 'fill', val)}
                            />
                            <RemoveButton onClick={() => remove(i)} />
                        </Fragment>
                    </Fragment>
                )
            })}
        </ArrayItemsEditor>
    )
}

const LinesEditor = ({
    keyOptions,
    items,
    onChange
}: {
    keyOptions: SelectProps['options']
    items: LineItem[]
    onChange: (items: LineItem[]) => void
}) => {
    const { add, remove, update } = useArray(items, onChange)
    return (
        <ArrayItemsEditor
            name={t('lines')}
            keyOptions={keyOptions}
            onAdd={(dataKey) => {
                add({
                    dataKey,
                    stroke: randomColor(),
                    type: LineType.linear
                })
            }}
        >
            {items.map((item, i) => {
                return (
                    <Fragment key={i}>
                        <Select
                            options={keyOptions}
                            value={item.dataKey}
                            onChange={(val) => update(i, 'dataKey', val)}
                        />
                        <Select
                            options={ALL_LINE_TYPE_OPTIONS}
                            value={item.type}
                            onChange={(val) => update(i, 'type', val as any)}
                        />
                        <ColorSelect
                            className='mt-1'
                            value={item.stroke}
                            onChange={(val) => update(i, 'stroke', val)}
                        />
                        <RemoveButton onClick={() => remove(i)} />
                    </Fragment>
                )
            })}
        </ArrayItemsEditor>
    )
}

const AreasEditor = ({
    keyOptions,
    items,
    onChange
}: {
    keyOptions: SelectProps['options']
    items: AreaItem[]
    onChange: (bars: AreaItem[]) => void
}) => {
    const { add, remove, update } = useArray(items, onChange)
    return (
        <ArrayItemsEditor
            name={t('areas')}
            keyOptions={keyOptions}
            onAdd={(dataKey) => {
                add({
                    dataKey,
                    fill: randomColor(),
                    type: 'linear' as LineType
                })
            }}
        >
            {items.map((item, i) => {
                return (
                    <Fragment key={i}>
                        <Select
                            options={keyOptions}
                            value={item.dataKey}
                            onChange={(val) => update(i, 'dataKey', val)}
                        />
                        <Select
                            options={ALL_LINE_TYPE_OPTIONS}
                            value={item.type}
                            onChange={(val) => update(i, 'type', val as any)}
                        />
                        <ColorSelect
                            className='mt-1'
                            value={item.fill}
                            onChange={(val) => update(i, 'fill', val)}
                        />
                        <RemoveButton onClick={() => remove(i)} />
                    </Fragment>
                )
            })}
        </ArrayItemsEditor>
    )
}

const Box = ({
    name,
    titleChildren,
    children
}: {
    name: string
    titleChildren?: ReactNode
    children?: ReactNode
}) => {
    return (
        <div className='border-b border-separator px-4 py-3'>
            <div className='flex h-5 items-center gap-2'>
                <span className='mr-auto text-sm text-secondary'>{name}</span>
                {titleChildren}
            </div>
            {children}
        </div>
    )
}

const RemoveButton = ({ onClick }: { onClick: () => void }) => {
    return (
        <IconButton className='mt-1 h-5' title={t('delete')} onClick={onClick}>
            <IconMinus size={16} strokeWidth={1.6} />
        </IconButton>
    )
}

const ArrayItemsEditor = ({
    name,
    keyOptions,
    children,
    onAdd
}: {
    name: string
    keyOptions: SelectProps['options']
    children: ReactNode
    onAdd: (dataKey: string) => void
}) => {
    return (
        <Box
            name={name}
            titleChildren={
                <DropdownMenu
                    trigger={
                        <IconButton>
                            <IconPlus size={16} strokeWidth={1.6} />
                        </IconButton>
                    }
                >
                    {keyOptions.map((dataKey) => {
                        return (
                            <DropdownMenuItem key={dataKey.value} onClick={() => onAdd(dataKey.value)}>
                                {dataKey.value}
                            </DropdownMenuItem>
                        )
                    })}
                </DropdownMenu>
            }
        >
            {React.Children.count(children) > 0 && (
                <div className='mt-2 grid grid-cols-[1fr_90px_auto_auto] gap-2'>{children}</div>
            )}
        </Box>
    )
}

const checkItemsDataKey = <T extends { dataKey: string }>(keys: Set<string>, items: T[]) => {
    for (let i = 0; i < items.length; i++) {
        if (!keys.has(items[i].dataKey)) {
            const filtered = items.filter((item) => keys.has(item.dataKey))
            return filtered
        }
    }
    return null
}

const findKey = (query: Query, handler: (value: Value) => boolean): string | null => {
    for (let x = 0; x < query.columns.length; x++) {
        let yes = false
        for (let y = 0; y < query.rows.length; y++) {
            if (query.rows[y][x] === null) {
                continue
            }
            if (handler(query.rows[y][x])) {
                yes = true
                continue
            }
            yes = false
            break
        }
        if (yes) {
            return query.columns[x].name
        }
    }
    return null
}
