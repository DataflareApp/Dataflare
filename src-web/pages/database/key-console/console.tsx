import {
    IconBug,
    IconCheck,
    IconCornerDownRight,
    IconExternalLink,
    IconFileDescription,
    IconLoader2
} from '@tabler/icons-react'
import { Fragment, memo, MutableRefObject, useCallback, useMemo, useRef, useState } from 'react'
import useSWRMutation from 'swr/mutation'
import { KeyConsoleProps } from '.'
import { useScrollUtils } from '../../../hooks/use-scroll'
import { useShortcutMeta } from '../../../hooks/use-shortcut'
import { useTranslation } from '../../../i18n'
import {
    CommandOutput,
    CommandOutputType,
    GetOutput,
    KvOutput,
    NameSpace,
    RedisEntry,
    RedisResponseData,
    RedisResponseType
} from '../../../tauri'
import { IconButton, Popover, ScrollView, IconDownloadButton, IconCopyButton } from '../../../ui'
import { writeFileToSelectPath } from '../../../utils/fs'
import { useDownload } from '../hooks/use-kv'
import { KeyEntry, TabType, useTabsStore } from '../hooks/use-store'
import { CloudflareDataView, S3DataView } from '../key-detail/key-detail'
import { Welcome } from '../layout/welcome'
import { displayKeyValue } from '../utils/kv'
import { Footer } from './footer'
import { CommandStatus, Task, useTasks } from './utils'

export default memo(KeyConsole)

export type InputRef = MutableRefObject<HTMLInputElement | null>
export type ScrollRef = MutableRefObject<HTMLDivElement | null>

function KeyConsole({ hidden }: KeyConsoleProps) {
    const scrollUtil = useScrollUtils()
    const inputRef = useRef<HTMLInputElement | null>(null)
    const scrollRef = useRef<HTMLDivElement | null>(null)
    const { tasks, pushTask, resetTasks, updateTask } = useTasks(scrollRef)

    useShortcutMeta(
        'k',
        () => {
            resetTasks()
            inputRef.current?.focus()
        },
        hidden
    )

    const ref = useCallback(
        (el: HTMLDivElement | null) => {
            scrollUtil(el)
            scrollRef.current = el
        },
        [scrollUtil]
    )

    if (hidden) {
        return null
    }

    return (
        <>
            {tasks.length === 0 ? (
                <Welcome size='large' />
            ) : (
                <ScrollView className='min-h-0 flex-1 px-4' viewportClassName='py-2' axis='y' ref={ref}>
                    {tasks.map((task) => {
                        return <TaskItem key={task.id} task={task} />
                    })}
                </ScrollView>
            )}

            <Footer inputRef={inputRef} resetTasks={resetTasks} pushTask={pushTask} updateTask={updateTask} />
        </>
    )
}

const TaskItem = memo(({ task }: { task: Task }) => {
    return (
        <div
            className='group mb-2 rounded border border-separator bg-neutral-200/20 px-4 py-2 text-sm transition hover:!border-theme data-[error]:border-red-500 data-[error]:bg-red-50 data-[error]:text-red-800 dark:bg-neutral-800/20 data-[error]:dark:border-red-600 data-[error]:dark:bg-red-900/20 data-[error]:dark:text-red-200'
            data-error={task.result.status === CommandStatus.Error || undefined}
        >
            <div
                data-error={task.result.status === CommandStatus.Error || undefined}
                className='relative mb-1 break-words text-tertiary data-[error]:text-red-800 data-[error]:dark:text-red-200'
            >
                <IconCornerDownRight size={16} strokeWidth={1.7} className='inline-block' />
                <span className='ml-3 select-text font-jb text-xs' onContextMenu={(e) => e.stopPropagation()}>
                    {task.command}
                </span>
                <IconCopyButton
                    className='absolute -right-3 top-0 hidden animate-overlayIn focus:block group-hover:block'
                    getCopyText={() => task.command}
                />
            </div>

            {task.result.status === CommandStatus.Running && (
                <IconLoader2 size={16} strokeWidth={1.6} className='animate-spin' />
            )}

            {task.result.status === CommandStatus.Error && (
                <div
                    className='select-text whitespace-pre-wrap break-words text-sm'
                    onContextMenu={(e) => e.stopPropagation()}
                >
                    {task.result.message}
                </div>
            )}

            {task.result.status === CommandStatus.Ok && (
                <CommandOutputView namespace={task.namespace} out={task.result.data} />
            )}
        </div>
    )
})

const CommandOutputView = ({ namespace, out }: { namespace: NameSpace; out: CommandOutput }) => {
    const { t } = useTranslation()

    switch (out.type) {
        case CommandOutputType.Done: {
            return <IconCheck size={16} strokeWidth={1.6} className='animate-overlayIn text-theme' />
        }
        case CommandOutputType.Keys: {
            if (out.value.length === 0) {
                return <div className='text-sm text-secondary'>{t('noSearchResult')}</div>
            }
            return <List items={out.value} />
        }
        case CommandOutputType.Get: {
            return <GetView namespace={namespace} out={out.value} />
        }
        case CommandOutputType.RedisResponse: {
            return <RedisResponseView data={out.value} />
        }
    }
}

const GetView = ({ namespace, out: { key, output: out } }: { namespace: NameSpace; out: GetOutput }) => {
    const { t } = useTranslation()
    const entry: KeyEntry = { namespace, key }
    const { trigger, isMutating } = useDownload()

    const value = useMemo(() => {
        // Only S3 will return null
        if (out.value === null) {
            return t('s3FileTooLarge')
        }
        return displayKeyValue(out.value)
    }, [out.value])

    return (
        <>
            <div
                className='select-text overflow-x-auto whitespace-pre-wrap break-words text-sm text-secondary'
                onContextMenu={(e) => e.stopPropagation()}
            >
                {value}
            </div>
            <div className='mt-1 flex justify-end'>
                {(out.cloudflare !== null || out.s3 !== null) && <DataView out={out} />}
                <IconButtonKeyDetail entry={entry} />
                <IconDownloadButton
                    loading={isMutating}
                    onClick={() => trigger({ namespace, key, value: out.value })}
                />
                <IconCopyButton getCopyText={() => value} />
            </div>
        </>
    )
}

const IconButtonKeyDetail = ({ entry }: { entry: KeyEntry }) => {
    const switchTabTo = useTabsStore((state) => state.switchTabTo)
    return (
        <IconButton
            title='Open in Key Detail'
            onClick={() => {
                switchTabTo({
                    type: TabType.KeyDetail,
                    entry
                })
            }}
        >
            <IconExternalLink size={16} strokeWidth={1.5} />
        </IconButton>
    )
}

const DataView = ({ out }: { out: KvOutput }) => {
    return (
        <Popover
            trigger={
                <IconButton>
                    <IconFileDescription size={16} strokeWidth={1.6} />
                </IconButton>
            }
            className='h-96 w-72'
        >
            <ScrollView axis='y' className='size-full' viewportClassName='py-2 px-4'>
                {out.cloudflare && <CloudflareDataView data={out.cloudflare} />}
                {out.s3 && <S3DataView data={out.s3} />}
            </ScrollView>
        </Popover>
    )
}

type Debug = [boolean, React.Dispatch<React.SetStateAction<boolean>>]

const RedisResponseView = ({ data }: { data: RedisResponseData }) => {
    const debug = useState<boolean>(false)
    if (debug[0]) {
        return <RedisStringResponseView debug={debug} value={data.debug} />
    }
    switch (data.response.type) {
        case RedisResponseType.String: {
            return <RedisStringResponseView debug={debug} value={data.response.value} />
        }
        case RedisResponseType.List: {
            return <List items={data.response.value} debugButton={<IconDebugButton debug={debug} />} />
        }
        case RedisResponseType.Map: {
            return <ListMap items={data.response.value} debugButton={<IconDebugButton debug={debug} />} />
        }
    }
}

const RedisStringResponseView = ({ value, debug }: { value: string; debug: Debug }) => {
    const { trigger, isMutating } = useSWRMutation('download-redis-string', (_, { arg }: { arg: string }) => {
        return writeFileToSelectPath(
            {
                defaultPath: 'Untitled.txt'
            },
            arg
        )
    })
    return (
        <>
            <div
                className='select-text whitespace-pre-wrap break-words text-sm text-secondary'
                onContextMenu={(e) => e.stopPropagation()}
            >
                {value}
            </div>
            <div className='mt-1 flex justify-end'>
                <IconDebugButton debug={debug} />
                <IconDownloadButton loading={isMutating} onClick={() => trigger(value)} />
                <IconCopyButton getCopyText={() => value} />
            </div>
        </>
    )
}

const IconDebugButton = ({ debug }: { debug: Debug }) => {
    return (
        <IconButton onClick={() => debug[1](!debug[0])}>
            <IconBug size={16} strokeWidth={1.6} className={debug[0] ? 'text-theme' : undefined} />
        </IconButton>
    )
}

const ListNumber = ({ i }: { i: number }) => {
    return <span className='select-none text-right font-jb text-xs leading-4 text-tertiary'>{i + 1}</span>
}

const ListText = ({ text }: { text: string }) => {
    return (
        <span
            className='select-text whitespace-pre-wrap break-all text-sm leading-4 text-secondary'
            onContextMenu={(e) => e.stopPropagation()}
        >
            {text}
        </span>
    )
}

const ListMap = ({ items, debugButton }: { items: RedisEntry[]; debugButton: React.ReactNode }) => {
    const { trigger, isMutating } = useSWRMutation('download-map', (_, { arg }: { arg: RedisEntry[] }) => {
        return writeFileToSelectPath(
            {
                defaultPath: 'Untitled.txt'
            },
            () => itemsToString(arg)
        )
    })

    const itemsToString = (items: RedisEntry[]) => {
        return items
            .map((item) => {
                return item.key + '\t' + item.value
            })
            .join('\n')
    }

    return (
        <>
            <div
                className='grid select-text grid-cols-[16px_1fr_1fr] gap-x-3 gap-y-1'
                onContextMenu={(e) => e.stopPropagation()}
            >
                {items.map((item, i) => {
                    return (
                        <Fragment key={i}>
                            <ListNumber i={i} />
                            <ListText text={item.key} />
                            <ListText text={item.value} />
                        </Fragment>
                    )
                })}
            </div>
            <div className='mt-1 flex justify-end'>
                {debugButton}
                <IconDownloadButton loading={isMutating} onClick={() => trigger(items)} />
                <IconCopyButton getCopyText={() => itemsToString(items)} />
            </div>
        </>
    )
}

const List = ({ items, debugButton }: { items: string[]; debugButton?: React.ReactNode }) => {
    const { trigger, isMutating } = useSWRMutation('download-list', (_, { arg }: { arg: string[] }) => {
        return writeFileToSelectPath(
            {
                defaultPath: 'Untitled.txt'
            },
            () => arg.join('\n')
        )
    })
    return (
        <>
            <div className='grid select-text grid-cols-[16px_1fr] gap-x-3 gap-y-1'>
                {items.map((item, i) => {
                    return (
                        <Fragment key={item}>
                            <ListNumber i={i} />
                            <ListText text={item} />
                        </Fragment>
                    )
                })}
            </div>
            <div className='mt-1 flex justify-end'>
                {debugButton}
                <IconDownloadButton loading={isMutating} onClick={() => trigger(items)} />
                <IconCopyButton getCopyText={() => items.join('\n')} />
            </div>
        </>
    )
}
