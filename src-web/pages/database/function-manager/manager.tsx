import { IconSql } from '@tabler/icons-react'
import { useState } from 'react'
import { ManagerProps } from '.'
import { useFuzzySearch } from '../../../hooks/use-fuzzy-search'
import { useScrollUtils } from '../../../hooks/use-scroll'
import { useSearch } from '../../../hooks/use-search'
import { useTranslation } from '../../../i18n'
import {
    IconButton,
    RefreshButton,
    HoverCard,
    TextInput,
    SearchInput,
    ScrollView,
    Select,
    Loading,
    Message,
    ErrorMessage,
    hoverCardSize
} from '../../../ui'
import { db, DbFunction } from '../db/db'
import { useSchemaOptions } from '../hooks/use-db'
import { useTables } from '../hooks/use-tables'
import { SqlPreview } from '../sql-preview'
import { useSchemaFunctions } from './hooks'

const FunctionManager = ({ hidden }: ManagerProps) => {
    const { t } = useTranslation()
    const { data: tables } = useTables()
    const { schemas, selectOptions } = useSchemaOptions(tables)
    const [schema, setSchema] = useState('')
    const { displaySearch, search, setSearch } = useSearch('', 200)
    const { data, isLoading, isValidating, mutate, error } = useSchemaFunctions(schema)
    const ref = useScrollUtils()

    const functions = useFuzzySearch(data, search, (item) => {
        return [item.name, item.args, item.returnType, item.sql].join('\t')
    })

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
            ) : functions.length === 0 ? (
                <Message text={t('noFunction')} />
            ) : (
                <ScrollView axis='both' border className='min-h-0 flex-1' ref={ref}>
                    <Header />
                    <div className='pb-4 pt-2'>
                        {functions.map((item, i) => {
                            return <Item key={i} data={item} />
                        })}
                    </div>
                </ScrollView>
            )}
        </>
    )
}

export default FunctionManager

const Header = () => {
    const { t } = useTranslation()
    return (
        <header className='sticky top-0 z-10 mb-2 flex h-8 min-w-min items-center gap-2 border-y border-separator bg-zinc-100 px-4 text-sm text-primary dark:bg-zinc-900'>
            <div className='w-36 px-2'>{t('name')}</div>
            <div className='w-48 px-2'>{t('args')}</div>
            <div className='w-32'>{t('returnType')}</div>
            <div className='w-8'></div>
        </header>
    )
}

const Item = ({ data }: { data: DbFunction }) => {
    return (
        <div className='mb-2 flex min-w-min items-center gap-2 px-4'>
            <TextInput className='w-36' readonly value={data.name} />
            <TextInput className='w-48' readonly value={data.args} />
            <div className='flex w-32 items-center truncate'>
                <span className='flex h-5 max-w-full items-center rounded border border-orange-600 px-1 text-xs text-orange-600'>
                    {data.returnType}
                </span>
            </div>
            <HoverCard
                trigger={
                    <IconButton className='h-6'>
                        <IconSql size={16} stroke={1.5} />
                    </IconButton>
                }
                openDelay={100}
                closeDelay={100}
            >
                <SqlPreview className='px-4 py-2' value={data.sql} style={hoverCardSize} />
            </HoverCard>
        </div>
    )
}
