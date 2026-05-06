import { IconFolder } from '@tabler/icons-react'
import { open } from '@tauri-apps/plugin-dialog'
import clsx from 'clsx'
import { ReactNode } from 'react'
import { t } from '../../i18n'
import { Select, Textarea, TextInput, PasswordInput, IconButton } from '../../ui'

const Label = ({ name, className }: { name: string; className?: string }) => {
    return (
        <label
            className={clsx('shrink-0 truncate text-right text-xs leading-7 text-tertiary', className)}
            title={name}
        >
            {name}
        </label>
    )
}

export const Row = ({ label, children }: { label: string; children: ReactNode }) => {
    return (
        <div className='relative mb-3 flex gap-3'>
            <Label name={label} className='w-16' />
            {children}
        </div>
    )
}

export const Item = ({
    label,
    type = 'text',
    placeholder,
    value,
    onChange
}: {
    label: string
    type?: 'text' | 'password'
    placeholder?: string
    value: string
    onChange: (value: string) => void
}) => {
    return (
        <Row label={label}>
            {type === 'password' ? (
                <PasswordInput
                    className='flex-1'
                    placeholder={placeholder}
                    value={value}
                    onChange={(val) => onChange(val)}
                />
            ) : (
                <TextInput
                    className='flex-1'
                    placeholder={placeholder}
                    value={value}
                    onChange={(val) => onChange(val)}
                />
            )}
        </Row>
    )
}

export const Addr = ({
    host,
    hostPlaceholder,
    port,
    portPlaceholder,
    onChangeHost,
    onChangePort
}: {
    host: string
    hostPlaceholder?: string
    port: number | null
    portPlaceholder: string
    onChangeHost: (host: string) => void
    onChangePort: (port: number | null) => void
}) => {
    return (
        <div className='mb-3 flex items-center gap-3'>
            <Label className='w-16' name={t('host')} />
            <TextInput
                className='min-w-0 flex-1 overflow-hidden'
                placeholder={hostPlaceholder ?? 'localhost'}
                value={host}
                onChange={onChangeHost}
            />
            <Label name={t('port')} />
            <TextInput
                className='w-20'
                placeholder={portPlaceholder}
                value={port === null ? '' : port.toString()}
                onChange={(port) => {
                    const n = Number.parseInt(port)
                    const invalid = Number.isNaN(n) || n < 0 || n > 65535
                    onChangePort(invalid ? null : n)
                }}
            />
        </div>
    )
}

export interface BooleanSelectProps {
    value: boolean
    onChange: (value: boolean) => void
    trueText: string
    falseText: string
}

export const BooleanSelect = ({ value, onChange, trueText, falseText }: BooleanSelectProps) => {
    return (
        <Select
            className='w-full flex-1'
            value={value ? '0' : '1'}
            options={[
                {
                    name: trueText,
                    value: '0'
                },
                {
                    name: falseText,
                    value: '1'
                }
            ]}
            onChange={(val) => onChange(val === '0')}
        />
    )
}

interface ReadonlyProps {
    secure: boolean
    readonly: boolean
    onChange: (readonly: boolean) => void
}

export const Readonly = ({ secure, readonly, onChange }: ReadonlyProps) => {
    return (
        <Row label={t('mode')}>
            <div className='flex-1'>
                <BooleanSelect
                    trueText={t('readOnly')}
                    falseText={t('readWrite')}
                    value={readonly}
                    onChange={onChange}
                />
                {readonly && !secure && <p className='mt-2 text-xs text-tertiary'>{t('readOnlyWarning')}</p>}
            </div>
        </Row>
    )
}

export const DatabasePathSelect = ({
    path,
    onChange
}: {
    path: string
    onChange: (path: string) => void
}) => {
    const onSelect = async () => {
        let files = await open({})
        if (files === null) {
            return
        }
        onChange(files as string)
    }

    return (
        <Row label={t('database')}>
            <Textarea
                className='h-20 flex-1 resize-none break-all py-1 pr-9'
                placeholder=':memory:'
                value={path}
                onChange={(e) => onChange(e.target.value)}
            />
            <IconButton className='absolute right-0 top-0 h-7' title={t('select')} onClick={onSelect}>
                <IconFolder size={16} strokeWidth={1.6} />
            </IconButton>
        </Row>
    )
}

interface InitialSQLProps {
    placeholder: string
    sql: string | null
    onChange: (sql: string | null) => void
    noteMessage?: string
}

export const InitialSQL = ({ placeholder, sql, onChange, noteMessage }: InitialSQLProps) => {
    return (
        <div className='flex h-full flex-col pb-8'>
            <Textarea
                className='w-full grow resize-none py-1.5 font-jb text-xs'
                placeholder={'-- Example\n' + placeholder}
                value={sql ?? ''}
                onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
            />
            <p className='mt-2 text-xs text-tertiary'>{t('initialSQLDesc')}</p>
            {noteMessage && <p className='mt-2 text-xs text-tertiary'>{noteMessage}</p>}
        </div>
    )
}
