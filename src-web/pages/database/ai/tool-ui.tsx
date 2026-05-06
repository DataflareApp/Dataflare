import {
    IconAlertTriangle,
    IconAxisX,
    IconAxisY,
    IconBraces,
    IconCheck,
    IconCircleCheck,
    IconCircleOff,
    IconCode,
    IconDotsVertical,
    IconLoader2,
    IconTool,
    IconX
} from '@tabler/icons-react'
import { save } from '@tauri-apps/plugin-dialog'
import { getToolName } from 'ai'
import React, { ReactNode } from 'react'
import { tf, useTranslation } from '../../../i18n'
import { QueryData, writeClipboardText } from '../../../tauri'
import {
    IconButton,
    Popover,
    popoverSize,
    ScrollView,
    Button,
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuLabel
} from '../../../ui'
import { filenameDateTime } from '../../../utils/datetime'
import { keyboardTitleChars, KeyModifier } from '../../../utils/keyboard-char'
import { FixedHeightSqlPreview, SqlPreview } from '../sql-preview'
import { ALL_EXPORT_FORMAT, ExportFormat, ExportTable } from '../table/utils'
import { AgentToolPart, SKIP_TOOL_CALL_REASON } from './services'
import { ChartTypeIcon } from './tool-chart'

// Table scrollbar X height
export const tableReserveSizeY = 12

export const ApprovalBlock = ({
    part,
    onApprove
}: {
    part: Extract<AgentToolPart, { state: 'approval-requested' | 'approval-responded' }>
    onApprove?: (approved: boolean, reason?: string) => void
}) => {
    const { t } = useTranslation()

    return (
        <Tool
            part={part}
            status={onApprove === undefined ? 'loading' : undefined}
            footer={
                onApprove !== undefined && (
                    <>
                        <Button
                            className='!h-6 !text-xs'
                            onClick={() => onApprove(false, SKIP_TOOL_CALL_REASON)}
                            title={keyboardTitleChars(t('skip'), [
                                KeyModifier.Opt,
                                KeyModifier.Meta,
                                KeyModifier.Enter
                            ])}
                        >
                            <IconX size={16} strokeWidth={1.5} />
                            {t('skip')}
                        </Button>
                        <Button
                            primary
                            className='ml-2 !h-6 !text-xs'
                            onClick={() => onApprove(true)}
                            title={keyboardTitleChars(t('allow'), [KeyModifier.Meta, KeyModifier.Enter])}
                        >
                            <IconCheck size={16} strokeWidth={1.5} />
                            {t('allow')}
                        </Button>
                    </>
                )
            }
        >
            <ToolInputContent part={part} />
        </Tool>
    )
}

const Tag = ({ children }: { children: ReactNode }) => {
    return (
        <span
            className='max-w-full select-text items-center whitespace-pre-wrap break-words rounded-md border border-theme/60 bg-theme/20 px-2 text-theme'
            onContextMenu={(e) => e.stopPropagation()}
        >
            {children}
        </span>
    )
}

const ToolInputContent = ({
    part
}: {
    part: Extract<AgentToolPart, { state: 'approval-requested' | 'approval-responded' }>
}): JSX.Element => {
    switch (part.type) {
        case 'tool-listDatabaseSchemas': {
            return <div className='py-2' />
        }
        case 'tool-getDatabaseSchema': {
            return (
                <div className='flex py-2 pl-5'>
                    {part.input.schemaName !== undefined && <Tag>{part.input.schemaName}</Tag>}
                </div>
            )
        }
        case 'tool-getTableSchema': {
            return (
                <div className='flex py-2 pl-5'>
                    {part.input.schemaName === undefined ? (
                        <Tag>{part.input.tableName}</Tag>
                    ) : (
                        <Tag>
                            {part.input.schemaName}.{part.input.tableName}
                        </Tag>
                    )}
                </div>
            )
        }
        case 'tool-getColumnSampleValues': {
            return (
                <div className='flex flex-col items-start py-2 pl-5'>
                    {part.input.schemaName === undefined ? (
                        <Tag>{part.input.tableName}</Tag>
                    ) : (
                        <Tag>
                            {part.input.schemaName}.{part.input.tableName}
                        </Tag>
                    )}
                    <p className='my-1 flex w-full flex-wrap gap-1'>
                        {part.input.columns.map((col, i) => {
                            return <Tag key={i}>{col}</Tag>
                        })}
                    </p>
                    <span className='text-xs text-tertiary'>
                        LIMIT: {tf('rowsCount', part.input.limit as any)}
                    </span>
                </div>
            )
        }
        case 'tool-runSQLQuery': {
            return <FixedHeightSqlPreview className='px-5 py-2' paddingHeight={16} sql={part.input.sql} />
        }
        case 'tool-generateChart': {
            return (
                <div className='flex w-full flex-col gap-1 pt-2 text-secondary'>
                    <div className='flex items-center gap-1'>
                        <ChartTypeIcon type={part.input.chartType} />
                        <div className='flex min-w-0 flex-1'>
                            <Tag>{part.input.chartTitle}</Tag>
                        </div>
                    </div>
                    <div className='flex items-center gap-1'>
                        <IconAxisY size={16} strokeWidth={1.5} className='shrink-0' />
                        <div className='flex min-w-0 flex-1'>
                            <Tag>{part.input.dimension}</Tag>
                        </div>
                    </div>
                    <div className='flex items-center gap-1'>
                        <IconAxisX size={16} strokeWidth={1.5} className='shrink-0' />
                        <div className='flex min-w-0 flex-1 flex-wrap gap-1'>
                            {part.input.series.map((item, i) => {
                                return <Tag key={i}>{item}</Tag>
                            })}
                        </div>
                    </div>
                    <FixedHeightSqlPreview
                        className='px-5 pb-2 pt-1'
                        paddingHeight={12}
                        sql={part.input.sql}
                    />
                </div>
            )
        }
    }
}

export const Tool = ({
    part,
    error,
    status,
    footer,
    input,
    output,
    children
}: {
    part: AgentToolPart
    error?: string
    status?: 'loading' | 'error' | 'success' | 'skip'
    footer?: React.ReactNode
    input?: unknown
    output?: unknown
    children?: React.ReactNode
}) => {
    return (
        <div className='flex max-w-full flex-col rounded-md border border-separator bg-neutral-200/20 px-3 py-1.5 dark:bg-neutral-800/20'>
            <div className='flex text-secondary'>
                <IconTool size={16} strokeWidth={1.5} className='mr-1 mt-0.5 shrink-0' />
                <h4 className='min-w-0 flex-1 truncate font-medium'>{getToolName(part)}</h4>
                {(input !== undefined || output !== undefined) && (
                    <Popover
                        trigger={
                            <IconButton className='h-5'>
                                <IconBraces size={16} strokeWidth={1.5} />
                            </IconButton>
                        }
                    >
                        <ParamsContent input={input} output={output} />
                    </Popover>
                )}
                {status === 'loading' && (
                    <IconLoader2 size={16} strokeWidth={1.5} className='ml-2 mt-0.5 shrink-0 animate-spin' />
                )}
                {status === 'error' && (
                    <IconAlertTriangle
                        className='ml-2 mt-0.5 shrink-0 text-red-500'
                        size={16}
                        strokeWidth={1.5}
                    />
                )}
                {status === 'success' && (
                    <IconCircleCheck
                        className='ml-2 mt-0.5 shrink-0 text-green-500'
                        size={16}
                        strokeWidth={1.5}
                    />
                )}
                {status === 'skip' && (
                    <IconCircleOff className='ml-2 mt-0.5 shrink-0 opacity-50' size={16} strokeWidth={1.5} />
                )}
            </div>

            {error !== undefined && (
                <div
                    className='select-text whitespace-pre-wrap break-words py-1 text-xs text-red-500'
                    onContextMenu={(e) => e.stopPropagation()}
                >
                    {error}
                </div>
            )}

            {children}

            {footer && <div className='flex justify-end'>{footer}</div>}
        </div>
    )
}

const ParamsContent = ({ input, output }: { input?: unknown; output?: unknown }) => {
    return (
        <ScrollView viewportClassName='px-3 py-2' axis='both' style={popoverSize}>
            {input !== undefined && (
                <>
                    <h3 className='text-xs font-medium'>Input:</h3>
                    <span
                        className='block select-text whitespace-pre-wrap break-words text-xs leading-5 text-tertiary'
                        onContextMenu={(e) => e.stopPropagation()}
                    >
                        {JSON.stringify(input, null, 2)}
                    </span>
                </>
            )}
            {output !== undefined && (
                <>
                    <h3 className='mt-2 text-xs font-medium'>Output:</h3>
                    <span
                        className='block select-text whitespace-pre-wrap break-words text-xs leading-5 text-tertiary'
                        onContextMenu={(e) => e.stopPropagation()}
                    >
                        {JSON.stringify(output, null, 2)}
                    </span>
                </>
            )}
        </ScrollView>
    )
}

interface ToolResultFrameProps {
    icon: ReactNode
    name: string
    sql: string
    action?: ReactNode
    query?: QueryData
    children: ReactNode
}

export const ToolResultFrame = ({ icon, name, sql, action, query, children }: ToolResultFrameProps) => {
    const { t } = useTranslation()

    return (
        <div className='rounded-md border border-separator'>
            <div className='flex h-9 items-center border-b border-separator pl-3 pr-1'>
                {icon}
                <h4 className='mx-1 truncate font-medium text-secondary'>{name}</h4>

                <div className='ml-auto'></div>

                {action}

                <Popover
                    trigger={
                        <IconButton title={t('viewSQL')}>
                            <IconCode size={16} strokeWidth={1.5} />
                        </IconButton>
                    }
                >
                    <SqlPreview value={sql} className='px-4 py-2' style={popoverSize} />
                </Popover>

                <DropdownMenu
                    trigger={
                        <IconButton title={t('option')}>
                            <IconDotsVertical size={16} strokeWidth={1.5} />
                        </IconButton>
                    }
                >
                    <DropdownMenuItem onClick={() => writeClipboardText(sql)}>Copy SQL</DropdownMenuItem>
                    {query !== undefined && <ExportQuery query={query} />}
                </DropdownMenu>
            </div>

            {children}
        </div>
    )
}

const ExportQuery = ({ query }: { query: QueryData }) => {
    const { t } = useTranslation()

    const onExport = async (format: ExportFormat) => {
        const path = await save({
            defaultPath: `query-result-${filenameDateTime()}`,
            filters: [{ name: format.toUpperCase(), extensions: [format] }]
        })
        if (path === null) {
            return
        }
        await ExportTable.write(path, query, format)
    }

    return (
        <>
            <DropdownMenuLabel label={t('export')} />
            {ALL_EXPORT_FORMAT.map((f) => {
                return (
                    <DropdownMenuItem key={f} onClick={() => onExport(f)}>
                        {f.toUpperCase()}
                    </DropdownMenuItem>
                )
            })}
        </>
    )
}
