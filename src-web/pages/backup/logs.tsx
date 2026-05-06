import clsx from 'clsx'
import { memo, useEffect, useRef, useState } from 'react'
import { ScrollView } from '../../ui'

const now = () => {
    return new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
    })
}

export enum Log {
    Info,
    Error,
    Success
}

interface LogItem {
    type: Log
    msg: string
}

export const useLogs = () => {
    const [logs, setLogs] = useState<LogItem[]>([])

    return {
        logs,
        pushLog: (type: Log, message: string, clear: boolean = false) => {
            const log = { type, msg: `${now()} - ${message}` }
            if (clear) {
                setLogs([log])
            } else {
                setLogs((logs) => [...logs, log])
            }
        }
    } as const
}

const DEFAULT_LOGS: LogItem[] = [
    {
        type: Log.Info,
        msg: `${now()} - Ready to backup...`
    },
    {
        type: Log.Info,
        msg: ''
    },
    {
        type: Log.Info,
        msg: ''
    }
]

export const Logs = memo(({ logs }: { logs: LogItem[] }) => {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        ref.current?.scrollTo({
            top: ref.current.scrollHeight,
            behavior: 'smooth'
        })
    }, [logs])

    return (
        <ScrollView
            ref={ref}
            className='h-24 shrink-0 border-t border-separator font-jb'
            viewportClassName='px-4 py-2'
            axis='y'
            onContextMenu={(e) => e.stopPropagation()}
        >
            {(logs.length === 0 ? DEFAULT_LOGS : logs).map((log, i) => {
                return (
                    <div key={i} className='flex gap-2'>
                        <span className='block w-4 shrink-0 text-xs leading-5 text-tertiary'>{i + 1}</span>
                        <span
                            className={clsx('w-0 flex-1 select-text break-words text-xs leading-5', {
                                'text-tertiary': log.type === Log.Info,
                                'text-red-500': log.type === Log.Error,
                                'text-green-500': log.type === Log.Success
                            })}
                        >
                            {log.msg}
                        </span>
                    </div>
                )
            })}
        </ScrollView>
    )
})
