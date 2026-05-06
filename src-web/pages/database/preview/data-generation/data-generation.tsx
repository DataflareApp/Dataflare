import { IconCirclePlus, IconKey, IconMinus } from '@tabler/icons-react'
import { save } from '@tauri-apps/plugin-dialog'
import { revealItemInDir } from '@tauri-apps/plugin-opener'
import { Fragment, useMemo, useState } from 'react'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { useTranslation } from '../../../../i18n'
import { InsertColumn, InsertValueType } from '../../../../tauri'
import {
    Button,
    IconButton,
    ViewSqlButton,
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuSeparator,
    SuggestionInput,
    TextInput,
    Textarea,
    showMessageBox,
    Popover,
    Popup,
    ScrollView,
    Select,
    IconDownloadButton,
    popoverSize,
    dropdownMenuSize
} from '../../../../ui'
import { db } from '../../db/db'
import { Column } from '../../db/db-types'
import { useReadonly } from '../../hooks/use-db'
import { Entry } from '../../hooks/use-store'
import { DefaultValueIcon, NotNullIcon } from '../../icon'
import { SqlPreview } from '../../sql-preview'
import { RawSqlButton } from '../cell-input'
import {
    InputNumberOptions,
    NumberType,
    TempInsertColumn,
    TempInsertValue,
    checkMinMax,
    converInsertColumns,
    ALL_VALUES,
    valueName,
    UNIX_TIMESTAMP_OPTIONS,
    CONTAIN_IP_OPTIONS,
    checkCountNumber
} from './utils'

interface PopupProps {
    entry: Entry
    columns: Column[]
    onClose: () => void
    onRefresh: () => void
}

// TODO: Support saving data and state / ignoring errors / showing success count after insert / providing a friendly prompt for both success and failure / canceling insert request

export default function DataGeneration(props: PopupProps) {
    const { t } = useTranslation()
    const readonly = useReadonly()
    const [tempCount, setTempCount] = useState('1000')
    const [tempColumns, setTempColumns] = useState<TempInsertColumn[]>(() => {
        return props.columns.map((item) => {
            return {
                name: item.name,
                values: []
            }
        })
    })
    const columns = useMemo(() => {
        return converInsertColumns(tempColumns)
    }, [tempColumns])
    const count = checkCountNumber(tempCount)
    const options: Options | null =
        columns === null || count === null
            ? null
            : {
                  columns,
                  count
              }

    const { isMutating, trigger } = useSWRMutation('batch-insert', (_, { arg }: { arg: Options }) => {
        return db.batchInsert(props.entry, arg.columns, arg.count)
    })

    const onSubmit = async () => {
        if (options === null) return
        try {
            await trigger(options)
            showMessageBox(t('insertSuccess'), '', 'success')
        } catch (err: any) {
            showMessageBox(t('error'), err, 'error')
        }
        props.onRefresh()
    }

    const onDeleteValue = (ci: number, vi: number) => {
        const newColumns = [...tempColumns]
        newColumns[ci].values.splice(vi, 1)
        setTempColumns(newColumns)
    }
    const onUpdateValue = (ci: number, vi: number, value: TempInsertValue) => {
        const newColumns = [...tempColumns]
        newColumns[ci].values[vi] = value
        setTempColumns(newColumns)
    }
    const onAddValue = (ci: number, value: TempInsertValue) => {
        const newColumns = [...tempColumns]
        newColumns[ci].values.push(structuredClone(value))
        setTempColumns(newColumns)
    }

    return (
        <Popup title={t('dataGeneration')} onClose={props.onClose}>
            <ScrollView axis='y' className='h-96 w-[520px] px-4' viewportClassName='py-3'>
                {tempColumns.map((item, i) => {
                    return (
                        <div key={item.name} className='mb-3'>
                            <div className='flex items-center gap-2'>
                                {props.columns[i].primaryKey && (
                                    <IconKey size={16} stroke={1.5} className='text-yellow-600' />
                                )}
                                <span className='mr-1 max-w-48 truncate text-secondary'>{item.name}</span>
                                <span className='max-w-32 truncate text-xs text-tertiary'>
                                    {props.columns[i].datatype}
                                </span>
                                <NotNullIcon notNull={props.columns[i].notNull} />
                                <DefaultValueIcon defaultValue={props.columns[i].defaultValue} />
                            </div>
                            <div className='mt-2 grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-3 rounded border border-separator p-4'>
                                {item.values.map((value, vi) => {
                                    return (
                                        <Fragment key={vi}>
                                            <span className='text-xs tabular-nums leading-7 text-tertiary'>
                                                {vi + 1}.
                                            </span>
                                            <Value
                                                value={value}
                                                onChange={(value) => onUpdateValue(i, vi, value)}
                                            />
                                            <IconButton
                                                className='h-7 shrink-0'
                                                onClick={() => onDeleteValue(i, vi)}
                                            >
                                                <IconMinus size={16} stroke={1.6} />
                                            </IconButton>
                                        </Fragment>
                                    )
                                })}
                                <AddValue
                                    showRandom={item.values.length > 1}
                                    onAdd={(val) => onAddValue(i, val)}
                                />
                            </div>
                        </div>
                    )
                })}
            </ScrollView>
            <footer className='flex gap-2 border-t border-separator px-4 py-2'>
                <span className='text-xs leading-7 text-tertiary'>{t('rows')}</span>
                <div className='mr-auto flex w-64 items-center gap-2'>
                    <SuggestionInput
                        className='w-32'
                        suggestions={['1,000', '10,000', '100,000', '1,000,000']}
                        value={tempCount}
                        onChange={(val) => setTempCount(val.replaceAll(',', ''))}
                    />
                    {count === null && <span className='text-xs text-red-500'>{t('invalidNumber')}</span>}
                </div>
                {options !== null && (
                    <>
                        <Download entry={props.entry} options={options} />
                        <Popover trigger={<ViewSqlButton />}>
                            <PreviewContent entry={props.entry} options={options} />
                        </Popover>
                    </>
                )}
                {!readonly && (
                    <Button
                        className='w-20'
                        primary
                        loading={isMutating}
                        disabled={options === null}
                        onClick={onSubmit}
                    >
                        {t('insert')}
                    </Button>
                )}
            </footer>
        </Popup>
    )
}

const Value = ({
    value,
    onChange
}: {
    value: TempInsertValue
    onChange: (value: TempInsertValue) => void
}): JSX.Element => {
    const { t } = useTranslation()
    // TODO: Type safety
    const update = (key: string, v: number | boolean | string | null) => {
        const newValue = { ...value } as any
        newValue['options'][key] = v
        onChange(newValue)
    }

    switch (value.type) {
        case InsertValueType.Default:
        case InsertValueType.Null:
        case InsertValueType.RandomBoolean:
        case InsertValueType.RandomUuid:
        case InsertValueType.RandomEmail:
        case InsertValueType.RandomDate:
        case InsertValueType.RandomTime:
        case InsertValueType.RandomDatetime: {
            return (
                <p className='flex h-7 items-center rounded border border-separator px-2 text-xs text-tertiary'>
                    {valueName(value)}
                </p>
            )
        }
        case InsertValueType.Custom: {
            return (
                <div className='relative'>
                    <div className='absolute inset-x-2 top-0 flex -translate-y-1/2 items-center bg-main'>
                        <span className='grow bg-main px-2 text-xs text-tertiary'>{t('customValue')}</span>
                        <RawSqlButton
                            raw={value.options.raw}
                            onClick={() => update('raw', !value.options.raw)}
                        />
                    </div>
                    <Textarea
                        className='min-h-10 w-full pt-3'
                        placeholder='EMPTY'
                        value={value.options.value}
                        onChange={(e) => update('value', e.target.value)}
                    />
                </div>
            )
        }
        case InsertValueType.RandomText: {
            return (
                <div className='relative rounded border border-separator p-2 pt-3'>
                    <div className='absolute left-2 top-0 flex -translate-y-1/2 items-center bg-main px-2 text-xs text-tertiary'>
                        {t('randomText')}
                    </div>
                    <MinMax
                        minText={t('minLength')}
                        maxText={t('maxLength')}
                        options={value.options}
                        onUpdate={update}
                    />
                    <InputError error={checkMinMax(value.options, NumberType.Int, true)} />
                </div>
            )
        }
        case InsertValueType.RandomInteger: {
            return (
                <div className='relative rounded border border-separator p-2 pt-3'>
                    <div className='absolute left-2 top-0 flex -translate-y-1/2 items-center bg-main px-2 text-xs text-tertiary'>
                        {t('randomInteger')}
                    </div>
                    <MinMax minText={t('min')} maxText={t('max')} options={value.options} onUpdate={update} />
                    <InputError error={checkMinMax(value.options, NumberType.Int)} />
                </div>
            )
        }
        case InsertValueType.RandomFloat: {
            return (
                <div className='relative rounded border border-separator p-2 pt-3'>
                    <div className='absolute left-2 top-0 flex -translate-y-1/2 items-center bg-main px-2 text-xs text-tertiary'>
                        {t('randomFloat')}
                    </div>
                    <MinMax minText={t('min')} maxText={t('max')} options={value.options} onUpdate={update} />
                    <InputError error={checkMinMax(value.options, NumberType.Float)} />
                </div>
            )
        }
        case InsertValueType.RandomUnixTimestamp: {
            return (
                <div className='relative rounded border border-separator p-2 pt-3'>
                    <div className='absolute left-2 top-0 flex -translate-y-1/2 items-center bg-main px-2 text-xs text-tertiary'>
                        {t('randomUnixTimestamp')}
                    </div>
                    <div className='flex items-center gap-2'>
                        <span className='text-xs text-tertiary'>{t('type')}</span>
                        <Select
                            className='grow'
                            options={UNIX_TIMESTAMP_OPTIONS}
                            value={value.options.ms ? 'ms' : 's'}
                            onChange={(v) => update('ms', v === 'ms')}
                        />
                    </div>
                </div>
            )
        }
        case InsertValueType.RandomIpAddress: {
            return (
                <div className='relative rounded border border-separator p-2 pt-3'>
                    <div className='absolute left-2 top-0 flex -translate-y-1/2 items-center bg-main px-2 text-xs text-tertiary'>
                        {t('randomIpAddress')}
                    </div>
                    <div className='flex items-center gap-2'>
                        <span className='text-xs text-tertiary'>{t('type')}</span>
                        <Select
                            className='grow'
                            options={CONTAIN_IP_OPTIONS}
                            value={value.options.contain}
                            onChange={(v) => update('contain', v)}
                        />
                    </div>
                </div>
            )
        }
    }
}

const MinMax = ({
    minText,
    maxText,
    options,
    onUpdate
}: {
    minText: string
    maxText: string
    options: InputNumberOptions
    onUpdate: (key: keyof InputNumberOptions, value: string) => void
}) => {
    return (
        <div className='flex gap-3'>
            <div className='flex grow items-center gap-2'>
                <span className='shrink-0 text-xs text-tertiary'>{minText}</span>
                <TextInput className='w-full' value={options.min} onChange={(v) => onUpdate('min', v)} />
            </div>
            <div className='flex grow items-center gap-2'>
                <span className='shrink-0 text-xs text-tertiary'>{maxText}</span>
                <TextInput className='w-full' value={options.max} onChange={(v) => onUpdate('max', v)} />
            </div>
        </div>
    )
}

const InputError = ({ error }: { error: string | object }) => {
    if (typeof error === 'string') {
        return <div className='mt-2 text-right text-xs text-red-500'>{error}</div>
    }
    return null
}

const AddValue = ({ showRandom, onAdd }: { showRandom: boolean; onAdd: (val: TempInsertValue) => void }) => {
    const { t } = useTranslation()
    return (
        <div className='col-start-2 flex items-center justify-between'>
            <DropdownMenu
                trigger={
                    <IconButton className='h-7'>
                        <IconCirclePlus size={16} stroke={1.5} />
                    </IconButton>
                }
                className='!p-0'
            >
                <ScrollView axis='y' viewportClassName='p-1' style={dropdownMenuSize}>
                    {ALL_VALUES.map((item, i) => {
                        if (item === null) {
                            return <DropdownMenuSeparator key={i} />
                        }
                        return (
                            <DropdownMenuItem key={item.type} onClick={() => onAdd(item)}>
                                {valueName(item)}
                            </DropdownMenuItem>
                        )
                    })}
                </ScrollView>
            </DropdownMenu>
            {showRandom && <span className='text-xs text-quarternary'>{t('randomSelect')}</span>}
        </div>
    )
}

interface Options {
    columns: InsertColumn[]
    count: number
}

const PreviewContent = ({ entry, options }: { entry: Entry; options: Options }) => {
    const { data } = useSWR(['batch-insert-preview', entry, options], () => {
        return db.batchInsertPreview(entry, options.columns, options.count)
    })
    return <SqlPreview className='px-4 py-2' value={data ?? ''} style={popoverSize} />
}

const Download = ({ entry, options }: { entry: Entry; options: Options }) => {
    const { t } = useTranslation()
    const onExport = async () => {
        const path = await save({
            defaultPath: `insert-${entry.schema}.${entry.table}`,
            filters: [{ name: 'SQL', extensions: ['sql'] }]
        })
        if (path === null) return
        try {
            await db.exportBatchInsert(path, entry, options.columns, options.count)
            revealItemInDir(path)
        } catch (err: any) {
            showMessageBox(t('exportFailed'), err, 'error')
        }
    }
    return <IconDownloadButton onClick={onExport} />
}
