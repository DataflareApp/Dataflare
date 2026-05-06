import { IconArrowBackUp, IconCheck, IconExclamationCircle, IconEye, IconLoader2 } from '@tabler/icons-react'
import { useMemo } from 'react'
import useSWRMutation from 'swr/mutation'
import { useTranslation } from '../../../i18n'
import { Query } from '../../../tauri'
import { IconButton, Popover, popoverSize, showMessageBox, Tooltip } from '../../../ui'
import { db, EditValue } from '../db/db'
import { Entry } from '../hooks/use-store'
import { SqlPreview } from '../sql-preview'
import { whereItems } from './utils'

interface Props {
    entry: Entry
    data: Query
    primaryKeys: string[] | undefined
    deleted: ReadonlySet<number> | undefined
    updated: ReadonlyMap<number, EditValue> | undefined
    onDiscard: () => void
    onCommitSuccess: () => void
}

type PreviewData = { sqls: string[]; error: null; msg: string } | { sqls: null; error: string }

export const Commit = ({ onCommitSuccess, onDiscard, entry, data, primaryKeys, deleted, updated }: Props) => {
    const { t, tf, language } = useTranslation()

    // TODO: Call on demand
    const preview: PreviewData = useMemo(() => {
        if (primaryKeys === undefined || primaryKeys.length === 0) {
            return { sqls: null, error: t('primaryKeyNotFound') }
        }
        const msgs: string[] = []
        const sqls: string[] = []
        // Deleted rows
        if (deleted !== undefined && deleted.size > 0) {
            let where: ReturnType<typeof whereItems>
            try {
                where = whereItems(deleted, primaryKeys, data)
            } catch (error) {
                return { sqls: null, error: error as string }
            }
            sqls.push(db.deleteTableRowsSQL(entry, where))
            msgs.push(tf('deleteCommitMsg', deleted.size.toString()))
        }
        // Updated values
        if (updated !== undefined && updated.size > 0) {
            const rows = new Map<number, Record<string, EditValue>>()
            for (const [i, v] of updated) {
                const row = Math.floor(i / data.columns.length)
                const col = i % data.columns.length
                if (deleted?.has(row)) {
                    continue
                }
                let values = rows.get(row)
                if (values === undefined) {
                    rows.set(row, { [data.columns[col].name]: v })
                } else {
                    values[data.columns[col].name] = v
                }
            }
            for (const [row, values] of rows) {
                let where: ReturnType<typeof whereItems>[number]
                try {
                    where = whereItems(row, primaryKeys, data)
                } catch (error) {
                    return { sqls: null, error: error as string }
                }
                sqls.push(db.updateTableRowSql(entry, values, where))
            }
            if (rows.size > 0) {
                msgs.push(tf('updateCommitMsg', rows.size.toString()))
            }
        }
        return { sqls, msg: msgs.join('\n'), error: null }
    }, [language, entry, data, primaryKeys, deleted, updated])

    const previewSql = useMemo(() => {
        return preview.sqls?.join('\n') ?? ''
    }, [preview.sqls])

    const key = ['delete-rows', previewSql] as const
    const { trigger, isMutating } = useSWRMutation(key, async (_, { arg }: { arg: string[] }) => {
        return db.transaction(arg)
    })

    const onSubmit = async () => {
        if (isMutating || preview.error !== null) {
            return
        }
        try {
            await trigger(preview.sqls)
            onCommitSuccess()
        } catch (err: any) {
            showMessageBox(t('error'), err, 'error')
        }
    }

    return (
        <div
            className='absolute bottom-14 left-1/2 z-10 flex animate-commitCardIn rounded border border-separator bg-main/80 p-1 backdrop-blur'
            style={{
                boxShadow: '0 0 24px 0px rgba(0,0,0,0.2)'
            }}
        >
            <Popover
                side='top'
                sideOffset={2}
                trigger={
                    <IconButton className='h-7 w-12' title={t('viewSQL')}>
                        <IconEye size={16} strokeWidth={1.5} className='mx-auto' />
                    </IconButton>
                }
            >
                {preview.error === null ? (
                    <SqlPreview className='px-4 py-2' format value={previewSql} style={popoverSize} />
                ) : (
                    <p className='px-4 py-2 text-xs text-secondary'>{preview.error}</p>
                )}
            </Popover>
            <IconButton
                className='h-7 w-12'
                title={t('discardChanges')}
                onClick={onDiscard}
                disabled={isMutating}
            >
                <IconArrowBackUp size={16} strokeWidth={1.5} className='mx-auto' />
            </IconButton>
            {isMutating ? (
                <IconButton className='h-7 w-12'>
                    <IconLoader2 size={16} strokeWidth={1.5} className='mx-auto animate-spin' />
                </IconButton>
            ) : (
                <Tooltip side='top' title={preview.error ?? preview.msg} delay={20}>
                    <IconButton className='h-7 w-12' disabled={isMutating} onClick={onSubmit}>
                        {preview.error !== null ? (
                            <IconExclamationCircle
                                size={16}
                                strokeWidth={1.7}
                                className='mx-auto text-red-500'
                            />
                        ) : (
                            <IconCheck size={16} strokeWidth={1.7} className='mx-auto' />
                        )}
                    </IconButton>
                </Tooltip>
            )}
        </div>
    )
}
