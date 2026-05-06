import { IconCirclePlus } from '@tabler/icons-react'
import { save, open } from '@tauri-apps/plugin-dialog'
import { revealItemInDir } from '@tauri-apps/plugin-opener'
import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { useTranslation } from '../../../i18n'
import { ClientData, QueryItem, showContextMenu } from '../../../tauri'
import { IconButton, ListItem, showMessageBox, showRenameDialog, Message, VirtualList } from '../../../ui'
import { readFileContent } from '../../../utils/fs'
import { useCreateQuery, useDeleteQuery, useQuerys, useRenameQuery } from '../hooks/use-querys'
import { TabType, useConnection, useTabsStore } from '../hooks/use-store'
import { QueryIcon } from '../icon'
import { ErrorTry } from './error-try'

export const QueryList = () => {
    const { t } = useTranslation()
    const { data: querys, error, isValidating, mutate } = useQuerys()
    const createQuery = useCreateQuery()
    const [dragStyle, setDragStyle] = useState(false)

    const disabled = error !== undefined || isValidating
    const showList = querys !== undefined && !isValidating && !dragStyle

    const onDropQuery = async (e: React.DragEvent<HTMLDivElement>) => {
        setDragStyle(false)
        if (disabled) return
        for (let file of e.dataTransfer.files) {
            let fileContent = await readFileContent(file)
            if (fileContent === null) {
                continue
            }
            await createQuery(file.name, fileContent, false)
        }
        mutate()
    }

    return (
        <div className='flex size-full flex-col'>
            <div className='flex h-10 items-center gap-2 px-4'>
                <h2 className='flex-1 truncate text-xs font-medium text-tertiary'>{t('query')}</h2>
                <IconButton
                    disabled={disabled}
                    title={t('newQuery')}
                    onClick={() => createQuery('SQL Query')}
                >
                    <IconCirclePlus size={16} stroke={1.5} />
                </IconButton>
            </div>

            <div
                className={clsx(
                    'flex flex-1 flex-col overflow-hidden',
                    dragStyle && 'border border-dashed border-theme'
                )}
                onDrop={onDropQuery}
                onDragEnter={() => !disabled && setDragStyle(true)}
                onDragLeave={() => setDragStyle(false)}
            >
                {!isValidating && error !== undefined && <ErrorTry error={error} onClick={() => mutate()} />}
                {showList && <List querys={querys} />}
            </div>
        </div>
    )
}

const List = ({ querys }: { querys: QueryItem[] }) => {
    const { t } = useTranslation()
    const connection = useConnection()
    const { mutate } = useQuerys()
    const switchTabTo = useTabsStore((state) => state.switchTabTo)
    const activeTab = useTabsStore((state) => state.activeTab)
    const deleteQuery = useDeleteQuery()
    const renameQuery = useRenameQuery()
    const [contextMenuIndex, setContextMenuIndex] = useState<number>(-1)
    const activeQuery = useMemo(() => {
        if (activeTab !== null) {
            if (activeTab.type === TabType.Query) {
                return activeTab.query.qid
            }
        }
        return null
    }, [activeTab])

    const onContextMenu = (e: React.MouseEvent, i: number, item: QueryItem) => {
        e.stopPropagation()
        e.preventDefault()
        setContextMenuIndex(i)
        showContextMenu(
            [
                {
                    label: t('rename'),
                    onClick() {
                        showRenameDialog({
                            from: item.name,
                            onHandler: (to) => {
                                return ClientData.renameQuery(item.qid, to)
                            },
                            onSuccess: (newName) => {
                                renameQuery(item, newName)
                            }
                        })
                    }
                },
                {
                    label: t('duplicate'),
                    onClick: () => onDuplicateQuery(item.qid)
                },
                {
                    label: t('import'),
                    separator: true,
                    onClick: onImportQuery
                },
                {
                    label: t('export'),
                    onClick: () => onExportQuery(item.qid, item.name)
                },
                {
                    label: t('delete'),
                    separator: true,
                    onClick: () => deleteQuery(i)
                }
            ],
            () => setContextMenuIndex(-1)
        )
    }

    const onDuplicateQuery = async (queryId: string) => {
        try {
            await ClientData.duplicateQuery(queryId)
            mutate()
        } catch (err: any) {
            showMessageBox(t('error'), err, 'error')
        }
    }

    const onImportQuery = async () => {
        const paths = await open({})
        if (paths === null) return
        try {
            await ClientData.importQuery(connection.cid, paths as string)
            mutate()
        } catch (err: any) {
            showMessageBox(t('importFailed'), err, 'error')
        }
    }

    const onExportQuery = async (qid: string, name: string) => {
        const path = await save({
            defaultPath: name,
            filters: [{ name: 'SQL', extensions: ['sql'] }]
        })
        if (path === null) return
        try {
            await ClientData.exportQuery(qid, path)
            revealItemInDir(path)
        } catch (err: any) {
            showMessageBox(t('exportFailed'), err, 'error')
        }
    }

    return (
        <VirtualList
            className='grow'
            axis='y'
            data={querys}
            itemHeight={28}
            prepareCount={6}
            paddingBottom={16}
            emptyElement={<Message text={t('noQuery')} />}
            renderItem={(i, top, item) => {
                return (
                    <ListItem
                        key={item.qid}
                        top={top}
                        selected={activeQuery === item.qid}
                        highlight={contextMenuIndex === i}
                        onClick={() =>
                            switchTabTo({
                                type: TabType.Query,
                                query: item
                            })
                        }
                        onContextMenu={(e) => onContextMenu(e, i, item)}
                        icon={<QueryIcon />}
                        label={item.name}
                    />
                )
            }}
        />
    )
}
