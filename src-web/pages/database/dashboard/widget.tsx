import { IconChartAreaLine, IconChartPie, IconDots } from '@tabler/icons-react'
import { NodeResizeControl, NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { useTranslation, t } from '../../../i18n'
import { WidgetConfig, WidgetType, Query } from '../../../tauri'
import {
    IconButton,
    IconRefresh,
    ComposedChart,
    PieChart,
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuSeparator,
    showMessageBox,
    showRenameDialog,
    ErrorMessage,
    Loading
} from '../../../ui'
import { TableType } from '../db/db-types'
import { TableIcon } from '../icon'
import { Table } from '../table'
import { useWidgetNodes, useWidgetQuery } from './hooks'

const MIN_SIZE = 192

export type EditorWidgetData = {
    wid: string | null
    config: WidgetConfig
}

export const Widget = ({
    id: wid,
    data: config,
    width = MIN_SIZE,
    height = MIN_SIZE,
    positionAbsoluteX,
    positionAbsoluteY,
    onEditWidget
}: Omit<NodeProps, 'data'> & {
    data: WidgetConfig
    onEditWidget: (data: EditorWidgetData) => void
}) => {
    const { t, tf } = useTranslation()
    const { data, mutate, isValidating, isLoading, error } = useWidgetQuery(
        wid,
        config.source,
        config.interval
    )
    const { createWidget, deleteWidget, updateWidgetConfig } = useWidgetNodes()

    const onRename = () => {
        showRenameDialog({
            from: config.name,
            onHandler: (name) =>
                updateWidgetConfig(wid, {
                    ...config,
                    name
                }),
            onSuccess: () => {}
        })
    }
    const onEdit = () => {
        onEditWidget({
            wid,
            config: structuredClone(config)
        })
    }
    const onDuplicate = () => {
        createWidget(
            structuredClone(config),
            Math.round(positionAbsoluteX) + 36,
            Math.round(positionAbsoluteY) + 36,
            width,
            height
        )
    }
    const onDelete = () => {
        showMessageBox(t('deleteWidegt'), tf('deleteMessage', config.name), 'delete', {
            label: t('delete'),
            primary: true,
            onClick: () => deleteWidget(wid)
        })
    }

    return (
        <div className='group h-full rounded border border-separator bg-main shadow-lg'>
            <header className='flex h-9 items-center gap-2 border-b border-separator px-4'>
                <WidgetIcon type={config.options.type} />
                <span className='flex-1 truncate text-sm text-primary'>{config.name}</span>
                <IconButton
                    title={t('refresh')}
                    disabled={isValidating}
                    className={
                        'nodrag focus:opacity-100 group-hover:opacity-100 ' +
                        (isValidating ? '' : 'opacity-0')
                    }
                    onClick={() => mutate()}
                >
                    <IconRefresh loading={isValidating} />
                </IconButton>
                <DropdownMenu
                    trigger={
                        <IconButton title={t('option')} className='-ml-2'>
                            <IconDots size={16} strokeWidth={1.5} className='fill-current' />
                        </IconButton>
                    }
                >
                    <DropdownMenuItem onClick={onRename}>{t('rename')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={onEdit}>{t('edit')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={onDuplicate}>{t('duplicate')}</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDelete}>{t('delete')}</DropdownMenuItem>
                </DropdownMenu>
            </header>
            <div style={{ height: height - 38 }}>
                {isLoading ? (
                    <Loading />
                ) : error !== undefined ? (
                    <ErrorMessage text={error.toString()} />
                ) : (
                    data !== undefined && <WidgetContent wid={wid} config={config} query={data} />
                )}
            </div>
            <NodeResizeControl
                minHeight={MIN_SIZE}
                minWidth={MIN_SIZE}
                className='hidden animate-overlayIn !border-0 !bg-transparent group-hover:block'
            >
                <svg
                    className='-ml-2 -mt-2 h-5 w-5 fill-none text-secondary hover:text-primary'
                    viewBox='0 0 24 24'
                    strokeWidth={1.4}
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                >
                    <path d='M20 6V20H6 M16 8V16H8' />
                </svg>
            </NodeResizeControl>
        </div>
    )
}

export const WidgetContent = memo(
    ({ wid, config, query }: { wid: string; config: WidgetConfig; query: Query }): React.JSX.Element => {
        switch (config.options.type) {
            case WidgetType.ComposedChart: {
                return <ComposedChart query={query} config={config.options.config} />
            }
            case WidgetType.Table: {
                return (
                    <div className='nowheel flex size-full cursor-default'>
                        <Table readonly error={undefined} saveColumnSizeID={wid} data={query} />
                    </div>
                )
            }
            case WidgetType.PieChart: {
                return <PieChart query={query} config={config.options.config} />
            }
        }
    }
)

const WidgetIcon = ({ type }: { type: WidgetType }): React.JSX.Element => {
    switch (type) {
        case WidgetType.ComposedChart: {
            return <IconChartAreaLine size={16} stroke={1.5} className='text-indigo-500' />
        }
        case WidgetType.Table: {
            return <TableIcon type={TableType.Table} />
        }
        case WidgetType.PieChart: {
            return <IconChartPie size={16} stroke={1.5} className='text-teal-500' />
        }
    }
}
