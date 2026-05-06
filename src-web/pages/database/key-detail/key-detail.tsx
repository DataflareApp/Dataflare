import * as Tabs from '@radix-ui/react-tabs'
import { IconColumns2, IconCopy, IconEyeBolt, IconMaximize, IconPencil, IconTrash } from '@tabler/icons-react'
import { Fragment, useMemo } from 'react'
import { KeyDetailProps } from '.'
import { useScrollUtils } from '../../../hooks/use-scroll'
import { useTranslation } from '../../../i18n'
import { CloudflareData, Key, RedisData, S3Data } from '../../../tauri'
import {
    Direction,
    ErrorMessage,
    Loading,
    Message,
    Persistent,
    Pin,
    ScrollView,
    SplitView,
    Textarea,
    TextInput
} from '../../../ui'
import { Button, RefreshButton, SearchInput } from '../../../ui'
import { formatBytesSize, formatTimestamp } from '../../../utils/format'
import { useExpiration, useGet } from '../hooks/use-kv'
import { displayKeyValue } from '../utils/kv'
import { Footer } from './footer'

export default function KeyDetail({ hidden, entry }: KeyDetailProps) {
    const { t } = useTranslation()

    const dataRef = useScrollUtils()
    const valueRef = useScrollUtils<HTMLTextAreaElement>()

    const { data, error, isValidating, isLoading, mutate } = useGet(entry.namespace, entry.key)

    if (hidden) {
        return null
    }

    const start: number | undefined = isValidating ? undefined : error ? error.start : data?.start
    const duration: number | undefined = isValidating ? undefined : error ? error.duration : data?.duration

    const types = ['Text', 'JSON', 'Bytes', 'Images']

    return (
        <>
            <div className='flex h-11 min-w-max shrink-0 items-center gap-2 border-b border-separator px-4'>
                <SearchInput disabled className='w-0 min-w-40 grow' value={''} onChange={() => {}} />
                <Button disabled>
                    <IconPencil size={16} strokeWidth={1.5} />
                </Button>
                <RefreshButton refreshing={isValidating} onRefresh={() => mutate()} />
                <Button disabled>
                    <IconMaximize size={16} strokeWidth={1.5} />
                </Button>
                <Button disabled>
                    <IconEyeBolt size={16} strokeWidth={1.5} />
                </Button>
                <Button disabled>
                    <IconCopy size={16} strokeWidth={1.5} />
                </Button>
                <Button disabled>
                    <IconTrash size={16} strokeWidth={1.5} />
                </Button>
                <Button disabled>
                    <IconColumns2 size={16} strokeWidth={1.5} />
                </Button>
            </div>

            {isLoading ? (
                <Loading />
            ) : error !== undefined ? (
                <ErrorMessage text={error.error} />
            ) : (
                <SplitView
                    id='key-detail'
                    direction={Direction.Horizontal}
                    className='grow overflow-hidden'
                    pin={Pin.Last}
                    defaultPinSize={250}
                    minPinSize={150}
                    maxPinSize={360}
                    persistent={Persistent.Temporary}
                >
                    <div className='flex size-full flex-col overflow-hidden px-4 py-2'>
                        <h3 className='mb-2 text-sm font-medium leading-7'>Key</h3>
                        <TextInput value={entry.key.value} className='w-full' />

                        <h3 className='mb-2 mt-4 text-sm font-medium leading-7'>Value</h3>

                        <Tabs.Root className='flex grow flex-col gap-2' defaultValue={types[0]}>
                            <Tabs.List className='flex w-full min-w-fit rounded-md bg-zinc-100 p-0.5 dark:bg-neutral-800'>
                                {types.map((value) => {
                                    return (
                                        <Tabs.Trigger
                                            // TODO
                                            disabled={value !== types[0]}
                                            key={value}
                                            value={value}
                                            className='relative h-6 flex-1 whitespace-nowrap rounded-md px-5 text-sm text-tertiary !outline-none data-[state=active]:bg-main data-[state=active]:text-primary data-[state=active]:shadow-sm'
                                        >
                                            {value}
                                        </Tabs.Trigger>
                                    )
                                })}
                            </Tabs.List>
                            {types.map((value) => {
                                return (
                                    <Tabs.Content key={value} value={value} className='grow outline-none'>
                                        {data?.data.value && (
                                            <Textarea
                                                className='size-full resize-none py-1'
                                                value={displayKeyValue(data.data.value)}
                                                readOnly
                                                ref={valueRef}
                                            />
                                        )}
                                        {data?.data.value === null && <Message text={t('s3FileTooLarge')} />}
                                    </Tabs.Content>
                                )
                            })}
                        </Tabs.Root>
                    </div>

                    <ScrollView
                        axis='y'
                        className='size-full'
                        viewportClassName='px-4 pt-2 pb-4'
                        ref={dataRef}
                    >
                        {data?.data.cloudflare && (
                            <CloudflareDataView key2={entry.key} data={data.data.cloudflare} />
                        )}
                        {data?.data.s3 && <S3DataView data={data.data.s3} />}
                        {data?.data.redis && <RedisDataView data={data.data.redis} />}
                    </ScrollView>
                </SplitView>
            )}

            <Footer queryTime={start} duration={duration} entry={entry} value={data?.data.value ?? null} />
        </>
    )
}

export const CloudflareDataView = ({ key2, data }: { key2?: Key; data: CloudflareData }) => {
    const metadata = useMemo(() => {
        if (data.metadata === null) {
            return null
        }
        return JSON.stringify(data.metadata, null, 2)
    }, [data.metadata])

    return (
        <>
            <h3 className='mb-2 flex h-7 items-center justify-between text-sm font-medium'>
                Expiration
                {data.expiration !== null && <CloudflareExpiration ms={data.expiration * 1000} />}
            </h3>
            {data.expiration === null ? (
                <div className='flex h-7 items-center whitespace-nowrap rounded border border-separator px-4 text-sm text-tertiary'>
                    No expiration
                </div>
            ) : (
                <TextInput className='w-full' value={formatTimestamp(data.expiration * 1000)} />
            )}

            <h3 className='mb-2 mt-4 text-sm font-medium leading-7'>Metadata</h3>
            {metadata === null ? (
                <div className='flex justify-center rounded border border-separator py-6 text-sm text-tertiary'>
                    None
                </div>
            ) : (
                <div
                    className='select-text whitespace-pre-wrap break-all rounded border border-separator p-2 font-jb text-xs leading-5 text-secondary'
                    onContextMenu={(e) => e.stopPropagation()}
                >
                    {metadata}
                </div>
            )}
        </>
    )
}

const CloudflareExpiration = ({ ms }: { ms: number }) => {
    const ago = useExpiration(ms)
    return <div className='text-xs font-normal text-tertiary'>{ago}</div>
}

export const S3DataView = ({ data }: { data: S3Data }) => {
    const metadata = Object.entries(data.metadata)
    const raw = Object.entries(data.raw)

    return (
        <>
            <h3 className='mb-2 flex h-7 items-center justify-between text-sm font-medium'>Content Type</h3>
            <TextInput className='w-full' value={data.content_type ?? ''} readonly />

            <h3 className='mb-2 mt-4 flex h-7 items-center justify-between text-sm font-medium'>
                Content Length
            </h3>
            <TextInput className='w-full' value={formatBytesSize(data.content_length ?? 0)} readonly />

            <h3 className='mb-2 mt-4 flex h-7 items-center justify-between text-sm font-medium'>Metadata</h3>
            {metadata.length === 0 ? (
                <div className='flex justify-center rounded border border-separator py-6 text-sm text-tertiary'>
                    Empty
                </div>
            ) : (
                <div className='grid grid-cols-2 gap-2'>
                    {metadata.map(([key, val]) => {
                        return (
                            <Fragment key={key}>
                                <TextInput value={key} readonly />
                                <TextInput value={val} readonly />
                            </Fragment>
                        )
                    })}
                </div>
            )}

            <h3 className='mb-2 mt-4 flex h-7 items-center justify-between text-sm font-medium'>
                Raw Response
            </h3>
            <>
                <ScrollView
                    axis='x'
                    className='select-text rounded border border-separator font-jb text-xs leading-5 text-secondary'
                    viewportClassName='px-2 pt-1 pb-4'
                    onContextMenu={(e) => e.stopPropagation()}
                >
                    {raw.map(([key, val]) => {
                        return (
                            <span key={key} className='block whitespace-nowrap'>
                                {key}
                                <span className='mr-1 text-xs text-tertiary'>:</span>
                                {val}
                            </span>
                        )
                    })}
                </ScrollView>
            </>
        </>
    )
}

const RedisDataView = ({ data }: { data: RedisData }) => {
    const ttl = useMemo(() => {
        if (data.ttl === null) {
            return null
        }
        return Date.now() + data.ttl * 1000
    }, [data.ttl])
    return (
        <>
            <h3 className='mb-2 flex h-7 items-center justify-between text-sm font-medium'>Type</h3>
            <TextInput className='w-full' value={data.type} readonly />
            <h3 className='mb-2 mt-4 flex h-7 items-center justify-between text-sm font-medium'>
                Memory Usage
            </h3>
            <TextInput className='w-full' value={formatBytesSize(data.memory_usage)} readonly />
            <h3 className='mb-2 mt-4 flex h-7 items-center justify-between text-sm font-medium'>
                Expiration
                {ttl !== null && <CloudflareExpiration ms={ttl} />}
            </h3>
            {ttl === null ? (
                <div className='flex h-7 items-center whitespace-nowrap rounded border border-separator px-4 text-sm text-tertiary'>
                    No expiration
                </div>
            ) : (
                <TextInput className='w-full' value={formatTimestamp(ttl)} />
            )}
        </>
    )
}
