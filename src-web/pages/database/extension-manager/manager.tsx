import { IconDots } from '@tabler/icons-react'
import clsx from 'clsx'
import { ManagerProps } from '.'
import { useFuzzySearch } from '../../../hooks/use-fuzzy-search'
import { useScrollUtils } from '../../../hooks/use-scroll'
import { useSearch } from '../../../hooks/use-search'
import { useTranslation } from '../../../i18n'
import {
    IconButton,
    RefreshButton,
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    SearchInput,
    ScrollView,
    Loading,
    Message,
    ErrorMessage
} from '../../../ui'
import { Extension, SetupExtension } from '../db/db-types'
import { useReadonly, useSchemaOptions } from '../hooks/use-db'
import { useTables } from '../hooks/use-tables'
import { ExtensionIcon } from '../icon'
import { useExtensions, useSetupExtension } from './hooks'

const ExtensionManager = ({ hidden }: ManagerProps) => {
    const { t } = useTranslation()
    const ref = useScrollUtils()
    const { displaySearch, search, setSearch } = useSearch('', 200)
    const { data, isLoading, isValidating, mutate, error } = useExtensions()
    const { trigger, isMutating } = useSetupExtension()
    const { data: tables } = useTables()
    const { schemas } = useSchemaOptions(tables)

    const extensions = useFuzzySearch(data, search, (item) => {
        return [item.name, item.comment].join('\t')
    })

    if (hidden) {
        return null
    }

    return (
        <>
            <div className='flex h-11 min-w-max shrink-0 items-center gap-2 border-b border-separator px-4'>
                <SearchInput className='w-48' value={displaySearch} onChange={setSearch} />
                <RefreshButton refreshing={isValidating || isMutating} onRefresh={() => mutate()} />
            </div>

            {error !== undefined ? (
                <ErrorMessage text={error} />
            ) : isLoading ? (
                <Loading />
            ) : extensions.length === 0 ? (
                <Message text={t('noExtension')} />
            ) : (
                <ScrollView axis='y' className='min-h-0 flex-1' ref={ref}>
                    <div className='grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'>
                        {extensions.map((item) => {
                            return (
                                <ExtensionItem
                                    trigger={trigger}
                                    ext={item}
                                    schemas={schemas}
                                    key={item.name}
                                />
                            )
                        })}
                    </div>
                </ScrollView>
            )}
        </>
    )
}

export default ExtensionManager

interface Props {
    ext: Extension
    schemas: string[]
    trigger: (opt: SetupExtension) => void
}

const ExtensionItem = ({ ext, schemas, trigger }: Props) => {
    const readonly = useReadonly()
    const { t } = useTranslation()
    const title = `${ext.name} ${ext.installedVersion ?? ext.defaultVersion}`
    return (
        <div className='rounded border border-separator shadow'>
            <header className='flex h-10 items-center gap-2 border-b border-separator px-4'>
                <ExtensionIcon />
                <div className='truncate' title={title}>
                    <span className='mr-2 text-primary'>{ext.name}</span>
                    {ext.installedVersion !== null ? (
                        <span className='text-xs text-teal-500'>v{ext.installedVersion}</span>
                    ) : (
                        <span className='text-xs text-tertiary'>v{ext.defaultVersion}</span>
                    )}
                </div>
                <div className='ml-auto flex items-center gap-2'>
                    {ext.schema !== null && (
                        <span className='flex h-5 items-center rounded border border-teal-500 px-1 text-xs text-teal-500'>
                            {ext.schema}
                        </span>
                    )}
                    {!readonly && <Actions ext={ext} trigger={trigger} schemas={schemas} />}
                </div>
            </header>
            <div
                className={clsx(
                    'px-4 py-3 text-sm',
                    ext.comment === null ? 'text-tertiary' : 'text-secondary'
                )}
            >
                {ext.comment ?? t('noComment')}
            </div>
        </div>
    )
}

const Actions = ({ ext, schemas, trigger }: Props) => {
    const { t } = useTranslation()
    return (
        <DropdownMenu
            trigger={
                <IconButton>
                    <IconDots size={16} strokeWidth={1.5} className='fill-current' />
                </IconButton>
            }
            className={ext.installedVersion === null ? '!p-0' : undefined}
        >
            {ext.installedVersion === null ? (
                <ScrollView axis='y' viewportClassName='max-h-[46vh] p-1'>
                    <DropdownMenuLabel label={t('installExtAt')} />
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() =>
                            trigger({
                                name: ext.name,
                                schema: null
                            })
                        }
                    >
                        {t('defaultSchema')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {schemas.map((schema) => {
                        return (
                            <DropdownMenuItem
                                key={schema}
                                onClick={() =>
                                    trigger({
                                        name: ext.name,
                                        schema
                                    })
                                }
                            >
                                {schema}
                            </DropdownMenuItem>
                        )
                    })}
                </ScrollView>
            ) : (
                <DropdownMenuItem onClick={() => trigger({ name: ext.name })}>
                    {t('disable')}
                </DropdownMenuItem>
            )}
        </DropdownMenu>
    )
}
