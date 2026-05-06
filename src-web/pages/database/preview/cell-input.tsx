import { IconCode, IconDots, IconKey, IconX } from '@tabler/icons-react'
import clsx from 'clsx'
import { useElementStoreSize } from '../../../hooks/use-size'
import { useTranslation } from '../../../i18n'
import { IconButton, DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, Textarea } from '../../../ui'
import { formatBytesSize, formatTimestamp } from '../../../utils/format'
import { readSelectedFile } from '../../../utils/fs'
import { EditValue, Column, DEFAULT } from '../db/db'
import { DefaultValueIcon, NotNullIcon } from '../icon'

interface Props {
    column: Column
    data: EditValue | undefined
    onChange: (data: EditValue | undefined) => void
    autoFocus: boolean
    changed: boolean
    savedSizeID: string
}

export const CellInput = ({ column, data, onChange, autoFocus, changed, savedSizeID }: Props) => {
    const { ref, defaultSize } = useElementStoreSize(savedSizeID)
    const notString = data === undefined || data === DEFAULT || data === null || data instanceof Uint8Array

    let placeholder = cellPlaceholderValue(data)
    if (placeholder === undefined && column.defaultValue !== null) {
        placeholder = column.defaultValue === '' ? 'EMPTY' : column.defaultValue
    }

    return (
        <div className='mb-2 px-4'>
            <div className='mb-1 flex items-center gap-1 pt-1'>
                <div className='flex grow items-center gap-1 truncate'>
                    {column.primaryKey && (
                        <IconKey size={16} stroke={1.5} className='shrink-0 text-yellow-600' />
                    )}
                    <div className='truncate leading-4 text-tertiary'>
                        <label className='mr-2 text-sm text-secondary'>{column.name}</label>
                        <label className='text-xs'>{column.datatype}</label>
                    </div>
                    <NotNullIcon notNull={column.notNull} />
                    <DefaultValueIcon defaultValue={column.defaultValue} />
                </div>

                {data !== undefined && (
                    <IconButton title='Clear' onClick={() => onChange(undefined)}>
                        <IconX size={14} className='transform-gpu' />
                    </IconButton>
                )}

                {!notString && (
                    <RawSqlButton
                        raw={data.raw}
                        onClick={() => {
                            onChange({
                                raw: !data.raw,
                                value: data.value
                            })
                        }}
                    />
                )}

                <CellActionMenu onChange={onChange} />
            </div>

            <Textarea
                ref={ref}
                className={clsx('h-12 w-full py-1', changed && 'border-theme')}
                style={{
                    minHeight: 48,
                    height: defaultSize.height
                }}
                autoFocus={autoFocus}
                placeholder={placeholder}
                value={cellDisplayValue(data)}
                onChange={(e) => {
                    onChange({
                        raw: notString ? false : data.raw,
                        value: e.target.value
                    })
                }}
            />
        </div>
    )
}

export const RawSqlButton = ({ raw, onClick }: { raw: boolean; onClick: () => void }) => {
    const { t } = useTranslation()
    return (
        <IconButton onClick={onClick} title={t('asRawSqlValue')}>
            <IconCode size={14} className={raw ? 'text-theme' : undefined} />
        </IconButton>
    )
}

export const CellActionMenu = ({ onChange }: { onChange: (value: EditValue) => void }) => {
    const { t } = useTranslation()
    return (
        <DropdownMenu
            trigger={
                <IconButton title={t('option')}>
                    <IconDots size={16} strokeWidth={1.5} className='fill-current' />
                </IconButton>
            }
        >
            <DropdownMenuItem onClick={() => onChange(null)}>{t('setAsNull')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChange(DEFAULT)}>{t('setAsDefault')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChange({ raw: false, value: '' })}>
                {t('setAsEmpty')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
                onClick={async () => {
                    const value = await readSelectedFile('text')
                    if (value !== null) {
                        onChange({ raw: false, value })
                    }
                }}
            >
                {t('selectTextFile')}
            </DropdownMenuItem>
            <DropdownMenuItem
                onClick={async () => {
                    const value = await readSelectedFile('binary')
                    if (value !== null) {
                        onChange(value)
                    }
                }}
            >
                {t('selectBinaryFile')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
                onClick={() => {
                    onChange({ raw: false, value: formatTimestamp(Date.now()) })
                }}
            >
                {t('currentDatetime')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChange({ raw: false, value: Date.now().toString() })}>
                {t('currentUnixTimestamp')}
            </DropdownMenuItem>
            {/* <DropdownMenuItem onClick={() => {}}>Random UUID</DropdownMenuItem> */}
            {/* TODO: Support convenient use of various database functions */}
        </DropdownMenu>
    )
}

export const cellPlaceholderValue = (val: EditValue | undefined): string | undefined => {
    if (val === undefined) {
        return undefined
    }
    if (val === DEFAULT) {
        return 'DEFAULT'
    }
    if (val === null) {
        return 'NULL'
    }
    if (val instanceof Uint8Array) {
        return formatBytesSize(val.length)
    }
    if (val.raw && val.value.length === 0) {
        return 'Error: Can not be empty'
    }
    if (val.value.length === 0) {
        return 'EMPTY'
    }
}

export const cellDisplayValue = (val: EditValue | undefined): string => {
    if (val !== undefined && val !== DEFAULT && val !== null && !(val instanceof Uint8Array)) {
        return val.value
    }
    return ''
}
