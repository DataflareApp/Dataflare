import {
    IconAlignJustified,
    IconBellExclamation,
    IconClockHour3,
    IconClockRecord,
    IconDownload
} from '@tabler/icons-react'
import { save } from '@tauri-apps/plugin-dialog'
import { ReactNode, useEffect, useRef, useState } from 'react'
import useSWRMutation from 'swr/mutation'
import { useAlertMessage } from '../../../hooks/use-alert'
import { useTranslation } from '../../../i18n'
import { Query } from '../../../tauri'
import { IconButton, SelectButton, Button, Popover, PopoverProps, ScrollView } from '../../../ui'
import { formatDuration, formatTimeAgo } from '../../../utils/format'
import { db } from '../db/db'
import { Entry } from '../hooks/use-store'
import { DEFAULT_EXPORT_FORMAT, ALL_EXPORT_FORMAT, ExportTable } from './utils'

export interface TableError {
    title: string
    message: string
}

interface FooterProps {
    rowCount?: number
    colCount?: number
    duration?: number
    queryTime?: number
    entry?: Entry
    tableData?: Query
    exportAllRowsSQL?: string
    errors?: TableError[]
    children?: ReactNode
}

export const TableFooter = ({
    rowCount,
    colCount,
    duration,
    queryTime,
    entry,
    tableData,
    exportAllRowsSQL,
    errors = [],
    children
}: FooterProps) => {
    const { tf, numberUtil } = useTranslation()

    return (
        <footer className='flex h-8 items-center gap-2 border-t border-separator px-4 text-xs text-secondary'>
            <div className='flex w-1/5 min-w-min grow gap-4'>
                {rowCount !== undefined && (
                    <IconValue
                        icon={<IconAlignJustified size={16} stroke={1.5} />}
                        value={tf('rowsCount', numberUtil.format(rowCount))}
                    />
                )}

                {colCount !== undefined && (
                    <IconValue
                        icon={<IconAlignJustified className='rotate-90' size={16} stroke={1.5} />}
                        value={tf('colsCount', colCount as any)}
                    />
                )}
            </div>

            <div className='w-3/5 max-w-fit'>{children}</div>

            <div className='flex w-1/5 min-w-min grow justify-end gap-4'>
                {duration !== undefined && (
                    <IconValue
                        icon={<IconClockHour3 size={16} stroke={1.5} />}
                        value={formatDuration(duration, tf)}
                    />
                )}

                {queryTime !== undefined && <QueryTime queryTime={queryTime} />}

                {tableData !== undefined && (
                    <ExportTablePopover
                        entry={entry}
                        tableData={tableData}
                        exportAllRowsSQL={exportAllRowsSQL}
                    />
                )}

                {errors.length > 0 && <Errors errors={errors} />}
            </div>
        </footer>
    )
}

const IconValue = ({ icon, value }: { icon: JSX.Element; value: string }) => {
    return (
        <div className='flex items-center gap-1'>
            {icon}
            {value !== undefined && <span className='whitespace-nowrap'>{value}</span>}
        </div>
    )
}

const QueryTime = ({ queryTime }: { queryTime: number }) => {
    const { relativeTimeUtil, t } = useTranslation()

    const [value, setValue] = useState(() => formatTimeAgo(queryTime, t, relativeTimeUtil))

    useEffect(() => {
        const update = () => setValue(formatTimeAgo(queryTime, t, relativeTimeUtil))
        update()
        const timer = setInterval(update, 5000)
        return () => {
            clearInterval(timer)
        }
    }, [queryTime, relativeTimeUtil])

    return <IconValue icon={<IconClockRecord size={16} stroke={1.5} />} value={value} />
}

const Errors = ({ errors }: { errors: TableError[] }) => {
    const { t } = useTranslation()
    return (
        <Popover
            trigger={
                <IconButton title={t('error')} className='-ml-2'>
                    <IconBellExclamation size={16} stroke={1.8} className='text-red-500' />
                </IconButton>
            }
        >
            <ScrollView axis='y' viewportClassName='pt-3 max-h-[80vh] max-w-[60vw] '>
                {errors.map((error) => {
                    return (
                        <div
                            key={error.title}
                            className='mb-3 select-text px-4'
                            onContextMenu={(e) => e.stopPropagation()}
                        >
                            <h3 className='text-sm text-secondary'>{error.title}</h3>
                            <p className='break-all text-xs leading-6 text-tertiary'>{error.message}</p>
                        </div>
                    )
                })}
            </ScrollView>
        </Popover>
    )
}

interface ExportProps {
    entry?: Entry
    tableData: Query
    exportAllRowsSQL: FooterProps['exportAllRowsSQL']
}

const ExportTablePopover = (props: ExportProps) => {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)

    return (
        <Popover
            open={open}
            onOpenChange={setOpen}
            trigger={
                <IconButton title={t('export')} className='-ml-2'>
                    <IconDownload size={16} stroke={1.5} />
                </IconButton>
            }
            className='grid grid-cols-[auto_minmax(200px,auto)] gap-3 px-4 py-3 text-xs text-tertiary'
        >
            <ExportContent {...props} onOpenChange={setOpen} />
        </Popover>
    )
}

const ExportContent = ({
    entry,
    tableData,
    exportAllRowsSQL,
    onOpenChange
}: ExportProps & Required<Pick<PopoverProps, 'onOpenChange'>>) => {
    const { t } = useTranslation()
    const alertMessage = useAlertMessage()

    const [exportAll, setExportAll] = useState(true)
    const [format, setFormat] = useState(DEFAULT_EXPORT_FORMAT)

    const lastActionID = useRef(0)
    const { isMutating, trigger, reset } = useSWRMutation(
        ['export-table-rows', exportAll, exportAllRowsSQL],
        async () => {
            if (exportAll && exportAllRowsSQL) {
                return await db.query(exportAllRowsSQL)
            }
            return tableData
        }
    )
    const cancel = () => {
        lastActionID.current += 1
        reset()
    }
    const onExport = async () => {
        let actionID = lastActionID.current
        try {
            const query = await trigger()
            if (actionID === lastActionID.current && query) {
                const path = await save({
                    defaultPath: `${entry?.schema ?? 'unknow'}.${entry?.table ?? 'unknow'}`,
                    filters: [{ name: format.toUpperCase(), extensions: [format] }]
                })
                if (path === null) return
                actionID = lastActionID.current
                const success = await ExportTable.write(path, query, format, entry)
                if (actionID === lastActionID.current && success) {
                    onOpenChange(false)
                }
            }
        } catch (err: any) {
            if (actionID === lastActionID.current) {
                alertMessage(t('exportFailed'), err, 'error')
            }
        }
    }

    return (
        <>
            {exportAllRowsSQL !== undefined && (
                <>
                    <span className='text-right leading-7'>{t('page')}</span>
                    <div className='grid grid-cols-2 gap-2'>
                        <SelectButton
                            className='px-2'
                            selected={exportAll}
                            onClick={() => {
                                !exportAll && cancel()
                                setExportAll(true)
                            }}
                        >
                            {t('allPage')}
                        </SelectButton>
                        <SelectButton
                            className='px-2'
                            selected={!exportAll}
                            onClick={() => {
                                exportAll && cancel()
                                setExportAll(false)
                            }}
                        >
                            {t('currentPage')}
                        </SelectButton>
                    </div>
                </>
            )}
            <span className='text-right leading-7'>{t('format')}</span>
            <div className='grid grid-cols-3 gap-2'>
                {ALL_EXPORT_FORMAT.map((f) => {
                    return (
                        <SelectButton
                            key={f}
                            selected={f === format}
                            onClick={() => {
                                f !== format && cancel()
                                setFormat(f)
                            }}
                        >
                            {f.toUpperCase()}
                        </SelectButton>
                    )
                })}
            </div>
            <Button className='col-start-2' loading={isMutating} onClick={onExport}>
                {t('export')}
            </Button>
        </>
    )
}
