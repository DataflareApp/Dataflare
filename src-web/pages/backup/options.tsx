import { IconX } from '@tabler/icons-react'
import React, { ReactNode, useMemo, useRef, useState } from 'react'
import { useFuzzySearch } from '../../hooks/use-fuzzy-search'
import { useSearch } from '../../hooks/use-search'
import { useTranslation } from '../../i18n'
import {
    BackupConfig,
    BackupDatabaseType,
    Connection,
    DuckDbBackupConfig,
    MySqlBackupConfig,
    PgFormat,
    PgStatementOption,
    PostgresBackupConfig,
    RedisBackupConfig,
    SqliteBackupConfig
} from '../../tauri'
import {
    BasicInput,
    Button,
    Checkbox,
    IconButton,
    Loading,
    Message,
    SearchInput,
    Select,
    SelectButton,
    Textarea,
    TextInput
} from '../../ui'
import { BackupOptionsEditor, CommandStorage, useOptions, useTables } from './utils'

type Props<T extends BackupConfig> = BackupOptionsEditor<T> & {
    conn: Connection
}

export const Options = (props: Props<BackupConfig>): JSX.Element => {
    switch (props.data.type) {
        case BackupDatabaseType.SQLite: {
            return <SqliteBackupOptions {...(props as any)} />
        }
        case BackupDatabaseType.DuckDB: {
            return <DuckDbBackupOptions {...(props as any)} />
        }
        case BackupDatabaseType.Postgres: {
            return <PostgresBackupOptions {...(props as any)} />
        }
        case BackupDatabaseType.MySQL: {
            return <MySqlBackupOptions {...(props as any)} />
        }
        case BackupDatabaseType.Redis: {
            return <RedisBackupOptions {...(props as any)} />
        }
    }
}

const SqliteBackupOptions = <T extends SqliteBackupConfig>({ data, onChange, conn }: Props<T>) => {
    const { t } = useTranslation()
    const { options, setOpt } = useOptions<T>(data, onChange)
    const { data: tablesData, isLoading, isValidating, error, mutate } = useTables(conn)

    const tables = useMemo(() => {
        return Object.values(tablesData ?? {})
            .flat()
            .map((t) => t.name)
    }, [tablesData])

    return (
        <div className='grid grid-cols-[auto,1fr] gap-4'>
            <CommandInput
                path={options.sqlite3_path}
                onChange={(v) => setOpt('sqlite3_path', v)}
                conn={conn}
                placeholder='sqlite3'
            />
            <Label text={t('table')} />
            <Statusview loading={isLoading || isValidating} error={error} onMutate={() => mutate()}>
                <TablesSelect
                    items={tables}
                    tables={options.tables}
                    onChange={(tables) => setOpt('tables', tables)}
                />
            </Statusview>
        </div>
    )
}

const DuckDbBackupOptions = <T extends DuckDbBackupConfig>({ data, onChange, conn }: Props<T>) => {
    const { t } = useTranslation()
    const { options, setOpt } = useOptions<T>(data, onChange)
    const { data: tablesData, isLoading, isValidating, error, mutate } = useTables(conn)

    // DuckDB only supports main schema
    const tables = useMemo(() => {
        const main = (tablesData ?? {})['main'] ?? []
        return main.map((t) => t.name)
    }, [tablesData])

    return (
        <div className='grid grid-cols-[auto,1fr] gap-4'>
            <CommandInput
                path={options.duckdb_path}
                onChange={(v) => setOpt('duckdb_path', v)}
                conn={conn}
                placeholder='duckdb'
            />
            <Label text={t('table')} />
            <Statusview loading={isLoading || isValidating} error={error} onMutate={() => mutate()}>
                <TablesSelect
                    items={tables}
                    tables={options.tables}
                    onChange={(tables) => setOpt('tables', tables)}
                />
            </Statusview>
            {tablesData !== undefined && (
                <span className='col-start-2 -mt-2 text-right text-xs text-tertiary'>
                    NOTE: Only main schema is supported.
                </span>
            )}
        </div>
    )
}

const PostgresBackupOptions = <T extends PostgresBackupConfig>({ data, onChange, conn }: Props<T>) => {
    const { t } = useTranslation()
    const { options, setOpt } = useOptions<T>(data, onChange)

    const allFlags = [
        '--if-exists',
        '--clean',
        '--create',
        '--data-only',
        '--schema-only',
        '--no-owner',
        '--no-privileges'
    ]

    return (
        <div className='grid grid-cols-[auto,1fr,auto_1fr] gap-4'>
            <CommandInput
                path={options.pg_dump_path}
                onChange={(v) => setOpt('pg_dump_path', v)}
                conn={conn}
                placeholder='pg_dump'
            />
            <Label text={t('database')} />
            <TextInput className='min-w-0' value={options.database} onChange={(v) => setOpt('database', v)} />
            <Label text={t('format')} />
            <Select
                options={[PgFormat.Plain, PgFormat.Custom, PgFormat.Tar].map((v) => {
                    return {
                        name: v,
                        value: v
                    }
                })}
                value={options.format}
                onChange={(v) => setOpt('format', v as PgFormat)}
            />
            <Label text='Statement' />
            <Select
                options={[
                    PgStatementOption.Copy,
                    PgStatementOption.ColumnInsert,
                    PgStatementOption.Insert
                ].map((v) => {
                    return {
                        name: v,
                        value: v
                    }
                })}
                value={options.statement}
                onChange={(v) => setOpt('statement', v as PgStatementOption)}
            />

            <Label text='Schema' />
            <TagInput tags={options.schemas} setTags={(tags) => setOpt('schemas', tags)} />
            <Label text='Exclude Schema' />
            <TagInput tags={options.exclude_schemas} setTags={(tags) => setOpt('exclude_schemas', tags)} />
            <Label text='Table' />
            <TagInput tags={options.tables} setTags={(tags) => setOpt('tables', tags)} />
            <Label text='Exclude Table' />
            <TagInput tags={options.exclude_tables} setTags={(tags) => setOpt('exclude_tables', tags)} />
            <FlagsInput
                placeholder='--large-objects --filter=...'
                custom={options.custom}
                onChangeCustom={(custom) => setOpt('custom', custom)}
                allFlags={allFlags}
                flags={options.flags}
                onChangeFlags={(flags) => setOpt('flags', flags)}
            />
        </div>
    )
}

const MySqlBackupOptions = <T extends MySqlBackupConfig>({ data, onChange, conn }: Props<T>) => {
    const { t } = useTranslation()
    const { options, setOpt } = useOptions<T>(data, onChange)

    const allFlags = [
        '--complete-insert',
        '--hex-blob',
        '--no-create-info',
        '--no-data',
        '--no-tablespaces',
        '--routines',
        '--skip-extended-insert',
        '--single-transaction'
    ]

    return (
        <div className='grid grid-cols-[auto,1fr,auto_1fr] gap-4'>
            <CommandInput
                path={options.mysqldump_path}
                onChange={(v) => setOpt('mysqldump_path', v)}
                conn={conn}
                placeholder='mysqldump'
            />
            <Label text={t('database')} />
            <TagInput tags={options.databases} setTags={(tags) => setOpt('databases', tags)} />
            <Label text='Table' />
            <TagInput tags={options.tables} setTags={(tags) => setOpt('tables', tags)} />
            <Label text='Ignore Table' />
            <TagInput tags={options.ignore_tables} setTags={(tags) => setOpt('ignore_tables', tags)} />
            <FlagsInput
                placeholder='--lock-all-tables --ignore-error'
                custom={options.custom}
                onChangeCustom={(custom) => setOpt('custom', custom)}
                allFlags={allFlags}
                flags={options.flags}
                onChangeFlags={(flags) => setOpt('flags', flags)}
            />
        </div>
    )
}

const RedisBackupOptions = <T extends RedisBackupConfig>({ data, onChange, conn }: Props<T>) => {
    const { options, setOpt } = useOptions<T>(data, onChange)

    return (
        <div className='grid grid-cols-[auto,1fr] gap-4'>
            <CommandInput
                path={options.redis_cli_path}
                onChange={(v) => setOpt('redis_cli_path', v)}
                conn={conn}
                placeholder='redis-cli'
            />
        </div>
    )
}

const TagInput = ({ tags, setTags }: { tags: string[]; setTags: (tags: string[]) => void }) => {
    const { t } = useTranslation()
    const [val, setVal] = useState('')
    const ref = useRef<HTMLInputElement>(null)

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        ref.current?.focus()
        if (val.trim() === '') {
            return
        }
        const parts = val.split(' ').filter((part) => part.trim())
        const newTags = [...tags]
        parts.forEach((part) => {
            if (!newTags.includes(part)) {
                newTags.push(part)
            }
        })
        setVal('')
        setTags(newTags)
    }

    return (
        <div>
            <form className='flex gap-2' onSubmit={onSubmit}>
                <BasicInput
                    ref={ref}
                    className='w-0 flex-1'
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                />
                <Button type='submit' disabled={val === ''}>
                    {t('add')}
                </Button>
            </form>
            <Tags tags={tags} onChange={setTags} />
        </div>
    )
}

const Tags = ({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) => {
    if (tags.length === 0) {
        return null
    }
    return (
        <div className='mt-2 flex flex-wrap gap-1'>
            {tags.map((tag, i) => (
                <div key={tag} className='flex items-center rounded bg-theme/10 py-1 pl-2 text-sm text-theme'>
                    <span className='max-w-36 truncate'>{tag}</span>
                    <IconButton
                        onClick={() => {
                            onChange(tags.filter((_, index) => index !== i))
                        }}
                        className='text-theme/60 hover:text-theme'
                    >
                        <IconX size={16} strokeWidth={1.6} className='transform-gpu' />
                    </IconButton>
                </div>
            ))}
        </div>
    )
}

const FlagsInput = ({
    placeholder,
    custom,
    onChangeCustom,
    allFlags,
    flags,
    onChangeFlags
}: {
    placeholder: string
    custom: string
    onChangeCustom: (custom: string) => void
    allFlags: string[]
    flags: string[]
    onChangeFlags: (flags: string[]) => void
}) => {
    const { t } = useTranslation()
    return (
        <>
            <Label text={t('option')} />
            <div className='col-span-3 flex flex-wrap gap-2'>
                {allFlags.map((item) => {
                    const selected = flags.includes(item)
                    return (
                        <SelectButton
                            key={item}
                            className='px-3 font-jb text-xs text-secondary'
                            selected={selected}
                            onClick={() => {
                                const newFlags = selected ? flags.filter((i) => i !== item) : [...flags, item]
                                onChangeFlags(newFlags)
                            }}
                        >
                            {item}
                        </SelectButton>
                    )
                })}
            </div>
            <Textarea
                className='col-span-3 col-start-2 -mt-2 h-16 min-h-16 py-1.5 font-jb text-xs'
                placeholder={placeholder}
                value={custom}
                onChange={(e) => onChangeCustom(e.target.value)}
            />
        </>
    )
}

const CommandInput = ({
    path,
    onChange,
    placeholder,
    conn
}: {
    path: string
    onChange: (value: string) => void
    placeholder: string
    conn: Connection
}) => {
    const { t } = useTranslation()
    return (
        <>
            <Label text={t('command')} />
            <TextInput
                className='min-w-0'
                placeholder={placeholder}
                value={path}
                onChange={(v) => {
                    onChange(v)
                    CommandStorage.write(conn, v)
                }}
            />
        </>
    )
}

const Statusview = ({
    loading,
    error,
    onMutate,
    children
}: {
    loading: boolean
    error: any
    onMutate: () => void
    children: ReactNode
}) => {
    const { t } = useTranslation()
    if (loading) {
        return <Loading />
    }
    if (error) {
        return (
            <div className='mt-1 flex flex-col gap-3 overflow-hidden'>
                <p className='select-text break-words text-sm text-red-500'>{error}</p>
                <Button primary className='w-full max-w-36' onClick={onMutate}>
                    {t('refresh')}
                </Button>
            </div>
        )
    }
    return children
}

const TablesSelect = ({
    items,
    tables,
    onChange
}: {
    items: string[]
    tables: string[]
    onChange: (tables: string[]) => void
}) => {
    const { t } = useTranslation()
    const [all, setAll] = useState(true)
    const { displaySearch, search, setSearch } = useSearch('', 200)
    const filtered = useFuzzySearch(items, search)

    const onClick = (selected: boolean, table: string) => {
        if (all) {
            setAll(false)
            onChange(items.filter((t) => t !== table))
            return
        }
        if (selected) {
            onChange(tables.filter((t) => t !== table))
            return
        }
        if (items.length === tables.length + 1) {
            onChange([])
            setAll(true)
            return
        }
        onChange([...tables, table])
    }

    if (items.length === 0) {
        return <Message text={t('noTable')} />
    }

    return (
        <div>
            <div className='grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'>
                <SearchInput value={displaySearch} onChange={setSearch} />
            </div>

            {search === '' && (
                <h2
                    className='mt-3 flex w-min items-center gap-2'
                    onClick={() => {
                        setAll(!all)
                        onChange([])
                    }}
                >
                    <Checkbox checked={all} onChange={() => {}} />
                    <span className='whitespace-nowrap text-sm'>{t('selectAll')}</span>
                </h2>
            )}

            <ul className='mt-3 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'>
                {filtered.map((table) => {
                    const selected = tables.includes(table)
                    const applySelected = all || selected || undefined
                    return (
                        <li
                            key={table}
                            data-selected={applySelected}
                            className='flex items-center gap-2 rounded border border-separator px-2 py-2 text-sm text-secondary data-[selected]:border-theme'
                            onClick={() => onClick(selected, table)}
                        >
                            <button
                                data-selected={applySelected}
                                className='size-3 shrink-0 rounded-full border border-separator p-0.5 data-[selected]:border-theme'
                            >
                                <div
                                    data-selected={applySelected}
                                    className='size-full rounded-full bg-theme/80 opacity-0 transition-all data-[selected]:opacity-100'
                                />
                            </button>
                            <span className='break-all'>{table}</span>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

const Label = ({ text }: { text: string }) => {
    return <label className='text-right text-xs leading-7 text-tertiary'>{text}</label>
}
