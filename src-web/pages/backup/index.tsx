import { useEffect, useState } from 'react'
import { shortcutCloseWindowAndShowConnections } from '../../hooks/use-shortcut'
import { useTranslation } from '../../i18n'
import { BackupConfig, Connection } from '../../tauri'
import { ErrorMessage, Loading, Titlebar } from '../../ui'
import { render } from '../../utils/init'
import { Backup } from './backup'
import { toBackupConfig } from './utils'

shortcutCloseWindowAndShowConnections()

const conn = JSON.parse((window as any)['__CONNECTION'] as string) as Connection
if (import.meta.env.DEV) {
    console.log(conn)
}

const BackupEntry = ({ conn }: { conn: Connection }) => {
    const { t } = useTranslation()
    const [config, setConfig] = useState<BackupConfig | string | null>(null)

    useEffect(() => {
        toBackupConfig(conn).then(setConfig).catch(setConfig)
    }, [])

    return (
        <div className='flex h-full flex-col'>
            <Titlebar title={`${t('backup')} — ${conn.name}`} />
            {config === null ? (
                <Loading />
            ) : typeof config === 'string' ? (
                <ErrorMessage text={config} />
            ) : (
                <Backup conn={conn} initConfig={config} />
            )}
        </div>
    )
}

render(<BackupEntry conn={conn} />)
