import { IconClockHour3, IconClockRecord } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useTranslation } from '../../../i18n'
import { KvDatabaseType, KvOutput } from '../../../tauri'
import { IconDownloadButton } from '../../../ui'
import { formatDuration, formatTimeAgo } from '../../../utils/format'
import { useDownload } from '../hooks/use-kv'
import { KeyEntry, useConnection } from '../hooks/use-store'

export const Footer = ({
    duration,
    queryTime,
    entry,
    value
}: {
    duration: number | undefined
    queryTime: number | undefined
    entry: KeyEntry
    value: KvOutput['value']
}) => {
    const { tf } = useTranslation()
    const isS3 = useConnection().config.type === KvDatabaseType.S3
    const { trigger, isMutating } = useDownload()

    return (
        <footer className='relative flex min-h-8 items-center gap-4 border-t border-separator px-4 text-xs text-secondary'>
            {duration !== undefined && (
                <IconValue
                    icon={<IconClockHour3 size={16} stroke={1.5} />}
                    value={formatDuration(duration, tf)}
                />
            )}

            {queryTime !== undefined && <QueryTime queryTime={queryTime} />}

            {(value !== null || isS3) && (
                <IconDownloadButton
                    className='ml-auto'
                    loading={isMutating}
                    onClick={() => trigger({ ...entry, value })}
                />
            )}
        </footer>
    )
}

// TODO: Merge with table footer
const QueryTime = ({ queryTime }: { queryTime: number }) => {
    const { relativeTimeUtil, t } = useTranslation()

    const [value, setValue] = useState(() => formatTimeAgo(queryTime, t, relativeTimeUtil))

    useEffect(() => {
        const update = () => setValue(formatTimeAgo(queryTime, t, relativeTimeUtil))
        update()
        const timer = setInterval(update, 5000)
        return () => {
            clearInterval(timer)
        }
    }, [queryTime, relativeTimeUtil])

    return <IconValue icon={<IconClockRecord size={16} stroke={1.5} />} value={value} />
}

const IconValue = ({ icon, value }: { icon: JSX.Element; value: string }) => {
    return (
        <div className='flex items-center gap-1'>
            {icon}
            {value !== undefined && <span className='whitespace-nowrap'>{value}</span>}
        </div>
    )
}
