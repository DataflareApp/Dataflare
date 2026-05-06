import { IconDatabase } from '@tabler/icons-react'
import { lazy, useState, Suspense, memo } from 'react'
import useSWR from 'swr'
import { useTranslation } from '../../../i18n'
import { showBackupWindow, SqlDatabaseType } from '../../../tauri'
import {
    IconButton,
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuSeparator,
    ScrollView,
    Loading,
    Message,
    DropdownMenuLabel
} from '../../../ui'
import { db } from '../db/db'
import { useConnectID, useDbStore, useIsKv } from '../hooks/use-store'

const useDatabases = () => {
    const connectID = useConnectID()
    const key = connectID !== null ? ['database-list', connectID] : null
    return useSWR(key, () => db.databases())
}

const NewPopup = lazy(() => import('./new-popup'))

export const ManageDatabase = memo(() => {
    const { t } = useTranslation()
    const { connect, connection } = useDbStore()
    const [showNewDatabase, setShowNewDatabase] = useState(false)
    const isKv = useIsKv()

    const onSwitchDatabase = (db: string) => {
        const conn = structuredClone(connection)
        switch (conn.config.type) {
            case SqlDatabaseType.Postgres:
            case SqlDatabaseType.CockroachDB:
            case SqlDatabaseType.MariaDB:
            case SqlDatabaseType.MySql:
            case SqlDatabaseType.MsSql:
            case SqlDatabaseType.ClickHouse:
            case SqlDatabaseType.Databend: {
                conn.config.options.database = db
                connect(conn)
                break
            }
            case SqlDatabaseType.BigQuery: {
                conn.config.options.dataset = db
                connect(conn)
                break
            }
            case SqlDatabaseType.Databricks:
            case SqlDatabaseType.Presto:
            case SqlDatabaseType.Trino: {
                conn.config.options.catalog = db
                connect(conn)
                break
            }
        }
    }

    return (
        <>
            <DropdownMenu
                trigger={
                    <IconButton title={t('database')}>
                        <IconDatabase size={16} strokeWidth={1.5} />
                    </IconButton>
                }
                className='!p-0'
            >
                <ScrollView axis='y' viewportClassName='max-h-[calc(100vh-92px)] p-1'>
                    <DropdownMenuItem onClick={() => showBackupWindow(connection)}>
                        {t('backupDatabase')}
                    </DropdownMenuItem>
                    {!isKv && db.allowSwitchDatabase() && (
                        <>
                            <DropdownMenuSeparator />
                            <SwitchDatabaseContent
                                onNewDatabase={() => setShowNewDatabase(true)}
                                onSwitchDatabase={onSwitchDatabase}
                            />
                        </>
                    )}
                </ScrollView>
            </DropdownMenu>

            {showNewDatabase && (
                <Suspense>
                    <NewPopup
                        title={t('newDatabase')}
                        getSQL={(name) => db.createDatabaseSql(name)}
                        onClose={(name) => {
                            setShowNewDatabase(false)
                            if (name !== undefined) onSwitchDatabase(name)
                        }}
                    />
                </Suspense>
            )}
        </>
    )
})

const SwitchDatabaseContent = ({
    onNewDatabase,
    onSwitchDatabase
}: {
    onNewDatabase: () => void
    onSwitchDatabase: (name: string) => void
}) => {
    const { t } = useTranslation()
    const connectID = useConnectID()
    const { data: databases, isLoading, error } = useDatabases()

    return (
        <>
            <DropdownMenuItem onClick={onNewDatabase}>{t('newDatabase')}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel label={t('database')} />
            {isLoading || connectID === null ? (
                <div className='h-20 px-4'>
                    <Loading />
                </div>
            ) : error !== undefined ? (
                <div className='max-w-xs py-2'>
                    <Message text={error} />
                </div>
            ) : (
                databases?.items.map((item) => {
                    return (
                        <DropdownMenuItem key={item} className='gap-2' onClick={() => onSwitchDatabase(item)}>
                            <div
                                data-selected={databases.current === item || undefined}
                                className='aspect-square w-2 rounded-full data-[selected]:bg-green-500'
                            />
                            <div title={item} className='max-w-48 truncate'>
                                {item}
                            </div>
                        </DropdownMenuItem>
                    )
                })
            )}
        </>
    )
}
