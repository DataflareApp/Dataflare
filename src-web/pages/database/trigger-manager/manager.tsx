import { IconSql } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { ManagerProps } from '.'
import { useFuzzySearch } from '../../../hooks/use-fuzzy-search'
import { useScrollUtils } from '../../../hooks/use-scroll'
import { useSearch } from '../../../hooks/use-search'
import { useTranslation } from '../../../i18n'
import {
    IconButton,
    RefreshButton,
    HoverCard,
    SearchInput,
    TextInput,
    ScrollView,
    Select,
    Loading,
    Message,
    ErrorMessage,
    hoverCardSize
} from '../../../ui'
import { db, Trigger } from '../db/db'
import { useSchemaOptions } from '../hooks/use-db'
import { useTables } from '../hooks/use-tables'
import { SqlPreview } from '../sql-preview'
import { useSchemaTriggers } from './hooks'

const TriggerManager = ({ hidden }: ManagerProps) => {
    const { t } = useTranslation()
    const { data: tables } = useTables()
    const { schemas, selectOptions } = useSchemaOptions(tables)
    const [schema, setSchema] = useState('')
    const { displaySearch, search, setSearch } = useSearch('', 200)
    const { data, isLoading, isValidating, mutate, error } = useSchemaTriggers(schema)
    const ref = useScrollUtils()

    const triggers = useFuzzySearch(data, search, (item) => {
        return [item.name, item.tableName, item.functionName, item.sql].join('\t')
    })

    const optionalColumns = useMemo(() => {
        if (data === undefined || data.length === 0) {
            return {}
        }
        return {
            functionName: data[0].functionName !== undefined,
            timing: data[0].timing !== undefined,
            action: data[0].action !== undefined,
            enabledMode: data[0].enabledMode !== undefined
        }
    }, [data])

    if (hidden) {
        return null
    }

    if (schemas.length === 0) {
        // No schemas available
        if (schema !== '') {
            setSchema('')
        }
    } else {
        // Selected schema does not exist
        if (!schemas.includes(schema)) {
            setSchema(schemas[0])
        }
    }

    return (
        <>
            <div className='flex h-11 min-w-max shrink-0 items-center gap-2 px-4'>
                {db.supportsMultipleSchemas() && (
                    <Select
                        className='w-36 bg-main'
                        value={schema}
                        options={selectOptions}
                        onChange={setSchema}
                    />
                )}
                <SearchInput className='w-48' value={displaySearch} onChange={setSearch} />
                <RefreshButton refreshing={isValidating} onRefresh={() => mutate()} />
            </div>

            {error !== undefined ? (
                <ErrorMessage text={error} />
            ) : isLoading ? (
                <Loading />
            ) : triggers.length === 0 ? (
                <Message text={t('noTrigger')} />
            ) : (
                <ScrollView axis='both' border className='min-h-0 flex-1' ref={ref}>
                    <header className='sticky top-0 z-10 mb-2 flex h-8 min-w-min items-center gap-2 border-y border-separator bg-zinc-100 px-4 text-sm text-primary dark:bg-zinc-900'>
                        <div className='w-36 px-2'>{t('name')}</div>
                        <div className='w-36 px-2'>{t('tableName')}</div>
                        {optionalColumns.functionName && <div className='w-48 px-2'>Function</div>}
                        {optionalColumns.timing && <div className='w-24'></div>}
                        {optionalColumns.action && <div className='w-20'></div>}
                        {optionalColumns.enabledMode && <div className='w-24'></div>}
                        <div className='w-8'></div>
                    </header>
                    <div className='pb-4 pt-2'>
                        {triggers.map((item, i) => {
                            return <Item key={i} data={item} />
                        })}
                    </div>
                </ScrollView>
            )}
        </>
    )
}

export default TriggerManager

const Item = ({ data }: { data: Trigger }) => {
    return (
        <div className='mb-2 flex min-w-min items-center gap-2 px-4'>
            <TextInput className='w-36' readonly value={data.name} />
            <TextInput className='w-36' readonly value={data.tableName} />
            {data.functionName !== undefined && (
                <TextInput className='w-48' readonly value={data.functionName} />
            )}
            {data.timing !== undefined && (
                <div className='flex w-24 items-center truncate'>
                    <span className='flex h-5 items-center rounded border border-amber-500 px-1 text-xs text-amber-500'>
                        {data.timing}
                    </span>
                </div>
            )}
            {data.action !== undefined && (
                <div className='flex w-20 items-center truncate'>
                    <span className='flex h-5 items-center rounded border border-amber-500 px-1 text-xs text-amber-500'>
                        {data.action}
                    </span>
                </div>
            )}
            {data.enabledMode !== undefined && (
                <div className='flex w-24 items-center truncate'>
                    <span className='flex h-5 items-center rounded border border-amber-500 px-1 text-xs text-amber-500'>
                        {data.enabledMode}
                    </span>
                </div>
            )}
            <HoverCard
                trigger={
                    <IconButton className='h-6'>
                        <IconSql size={16} stroke={1.5} />
                    </IconButton>
                }
                openDelay={200}
                closeDelay={100}
            >
                <SqlPreview className='px-4 py-2' style={hoverCardSize} value={data.sql} />
            </HoverCard>
        </div>
    )
}
