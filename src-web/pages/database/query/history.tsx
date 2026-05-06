import { IconHistory, IconTrash } from '@tabler/icons-react'
import clsx from 'clsx'
import { Fragment, useEffect, useRef, useState } from 'react'
import { useAlertMessage } from '../../../hooks/use-alert'
import { useEffectEvent } from '../../../hooks/use-effect-event'
import { useTranslation } from '../../../i18n'
import { ClientData, HistoryQueryItem } from '../../../tauri'
import { Button, IconButton, HoverCard, Popover, ScrollView, Message, hoverCardSize } from '../../../ui'
import { formatTimestamp } from '../../../utils/format'
import { SqlPreview } from '../sql-preview'

interface Props {
    queryId: string
}

export const QueryHistory = ({ queryId }: Props) => {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    return (
        <Popover
            trigger={
                <Button title={t('queryHistory')}>
                    <IconHistory size={16} stroke={1.5} />
                </Button>
            }
            open={open}
            onOpenChange={setOpen}
            onOpenAutoFocus={(e) => e.preventDefault()}
        >
            <History queryId={queryId} setOpen={setOpen} />
        </Popover>
    )
}

const History = ({ queryId, setOpen }: Props & { setOpen: (open: boolean) => void }) => {
    const { t } = useTranslation()
    const alertMessage = useAlertMessage()
    const page = useRef(1)
    const loading = useRef(false)
    const [historys, setHistorys] = useState<HistoryQueryItem[]>([])

    useEffect(() => {
        loadNextPage()
    }, [])

    const onClearHistory = () => {
        ClientData.clearQueryHistory(queryId)
        setOpen(false)
    }

    const loadNextPage = useEffectEvent(() => {
        const LIMIT = 30
        if (loading.current) {
            return
        }
        loading.current = true
        ClientData.queryHistoryList(queryId, page.current, LIMIT)
            .then((list) => {
                if (list.length === LIMIT) {
                    loading.current = false
                }
                page.current += 1
                setHistorys((historys) => {
                    return historys.concat(list)
                })
            })
            .catch((err) => {
                loading.current = false
                alertMessage('Error', err, 'error')
            })
    })

    return (
        <div className='flex flex-col' style={{ width: 420 }}>
            <div className='flex items-center justify-between gap-2 px-4'>
                <span className='text-sm leading-10 text-primary'>{t('history')}</span>
                <IconButton title={t('delete')} onClick={onClearHistory}>
                    <IconTrash size={16} stroke={1.5} />
                </IconButton>
            </div>
            {historys.length === 0 ? (
                <div className='h-52'>
                    <Message text={t('noHistory')} />
                </div>
            ) : (
                <HistoryList list={historys} onLoadMore={loadNextPage} />
            )}
        </div>
    )
}

const HistoryList = ({ list, onLoadMore }: { list: HistoryQueryItem[]; onLoadMore: () => void }) => {
    return (
        <ScrollView
            axis='y'
            viewportClassName='max-h-[calc(100vh-172px)]'
            onScroll={(e) => {
                if (
                    e.currentTarget.scrollTop + e.currentTarget.clientHeight + 360 >=
                    e.currentTarget.scrollHeight
                ) {
                    onLoadMore()
                }
            }}
        >
            {list.map((item) => {
                return (
                    <Fragment key={item.hid}>
                        <div className='mx-4 flex items-center gap-2'>
                            <Status error={item.error} />
                            <span className='text-xs text-tertiary'>{formatTimestamp(item.createdAt)}</span>
                        </div>
                        <div className='mb-3 mt-1 px-4'>
                            <SqlPreview
                                className='max-h-36 rounded bg-neutral-200/20 px-4 py-2 dark:bg-neutral-800/20'
                                value={item.content}
                            />
                        </div>
                    </Fragment>
                )
            })}
        </ScrollView>
    )
}

const Status = ({ error }: { error: string | null }) => {
    return (
        <HoverCard
            openDelay={0}
            closeDelay={100}
            side='left'
            trigger={
                <div
                    className={clsx(
                        'aspect-square w-[10px] select-text rounded-full transition-transform hover:scale-125',
                        error === null ? 'bg-green-500' : 'bg-red-500'
                    )}
                />
            }
        >
            <ScrollView
                axis='both'
                viewportClassName='px-4 py-2 select-text whitespace-pre text-sm text-secondary'
                style={hoverCardSize}
                onContextMenu={(e) => e.stopPropagation()}
            >
                {error ?? 'No error'}
            </ScrollView>
        </HoverCard>
    )
}
