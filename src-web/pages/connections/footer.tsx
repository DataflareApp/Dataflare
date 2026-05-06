import { IconCheck } from '@tabler/icons-react'
import { useEffect, useRef } from 'react'
import useSWRMutation from 'swr/mutation'
import { useAlertMessage } from '../../hooks/use-alert'
import { useSuccess } from '../../hooks/use-success'
import { t } from '../../i18n'
import { ClientData, Connection, newDatabaseWindow, Database } from '../../tauri'
import { Button } from '../../ui'
import { useCheckCreateConnection, useConnections } from './hooks'

export const ConnectionFooter = ({
    conn,
    onChangeSelect
}: {
    conn: Connection
    onChangeSelect: (conn: Connection) => void
}) => {
    const { data: connections, mutate } = useConnections()
    const lastTestID = useRef(0)
    const [saveSuccess, setSaveSuccess] = useSuccess()
    const showMessageBox = useAlertMessage()
    const checker = useCheckCreateConnection()

    const {
        isMutating: loading,
        trigger: testConnection,
        reset
    } = useSWRMutation('connection-footer', () => {
        return Database.test(conn.config)
    })

    // Reset the previous test whenever the connection config changes
    useEffect(() => {
        lastTestID.current += 1
        reset()
    }, [conn.config])

    const onTest = async () => {
        const id = lastTestID.current
        try {
            const info = await testConnection()
            if (id === lastTestID.current) {
                if (info === null) {
                    showMessageBox(t('success'), t('connectionSuccess'), 'success')
                } else {
                    showMessageBox(t('connectionSuccess'), info, 'success')
                }
            }
        } catch (err: any) {
            if (id === lastTestID.current) {
                showMessageBox(t('error'), err, 'error')
            }
        }
    }

    const onSave = async (saveSuccessCallback?: () => void) => {
        const isCreate = (connections ?? []).every((item) => item.cid !== conn.cid)
        if (isCreate && !checker(1)) {
            throw ''
        }
        try {
            if (isCreate) {
                conn.cid = await ClientData.createConnection(conn.name, conn.config)
                onChangeSelect(conn)
            } else {
                await ClientData.updateConnection(conn.cid, conn.name, conn.config)
            }
            saveSuccessCallback?.()
            mutate()
        } catch (err: any) {
            showMessageBox(t('saveFailed'), err, 'error')
            throw err
        }
    }
    const onConnect = async () => {
        await onSave()
        await newDatabaseWindow(conn, true, true)
    }

    return (
        <div className='flex gap-2'>
            <Button className='mr-auto' loading={loading} onClick={onTest}>
                {t('test')}
            </Button>

            <Button disabled={saveSuccess} onClick={() => onSave(setSaveSuccess)}>
                {saveSuccess ? <IconCheck size={16} stroke={1.5} className='text-theme' /> : t('save')}
            </Button>

            <Button primary onClick={onConnect}>
                {t('connect')}
            </Button>
        </div>
    )
}
