import { useState } from 'react'
import { useTranslation } from '../../i18n'
import {
    ClientData,
    Connection,
    DatabaseConfig,
    emit,
    KvDatabaseType,
    REFRESH_CONNECTIONS,
    SqlDatabaseType
} from '../../tauri'
import { Direction, Persistent, Pin, showMessageBox, SplitView, Titlebar } from '../../ui'
import { Welcome } from '../database/layout/welcome'
import { ConnectionMenuActions } from './actions'
import { ActivateButton } from './activate'
import { ConnectionFooter } from './footer'
import { useConnections } from './hooks'
import { ConnectionList } from './list'
import { NewConnectionMenu } from './new'
import { BigQueryConnection } from './options-editor/bigquery'
import { ClickHouseConnection } from './options-editor/clickhouse'
import { CloudflareD1Connection } from './options-editor/cloudflare-d1'
import { CloudflareKvConnection } from './options-editor/cloudflare-kv'
import { DatabendConnection } from './options-editor/databend'
import { DatabricksConnection } from './options-editor/databricks'
import { DuckDbConnection } from './options-editor/duckdb'
import { EchoLiteConnection } from './options-editor/echolite'
import { ManticoreSearchConnection } from './options-editor/manticore-search'
import { MsSqlConnection } from './options-editor/mssql'
import { MySqlConnection } from './options-editor/mysql'
import { PostgresConnection } from './options-editor/postgres'
import { PrestoConnection } from './options-editor/presto'
import { QuestDbConnection } from './options-editor/questdb'
import { R2SqlConnection } from './options-editor/r2sql'
import { RedisConnection } from './options-editor/redis'
import { RqliteConnection } from './options-editor/rqlite'
import { S3Connection } from './options-editor/s3'
import { SqlCipherConnection } from './options-editor/sqlcipher'
import { SqliteConnection } from './options-editor/sqlite'
import { TrinoConnection } from './options-editor/trino'
import { TursoConnection } from './options-editor/turso'
import { WorkersAnalyticsEngineConnection } from './options-editor/workers-analytics-engine'

export const Connections = () => {
    const { t } = useTranslation()
    const { data: connections } = useConnections()
    const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null)

    const onDeleteConnection = async (id: string) => {
        if (connections === undefined) return
        try {
            await ClientData.deleteConnection(id)
        } catch (err: any) {
            showMessageBox(t('deleteFailed'), err, 'error')
            return
        }
        if (selectedConnection !== null) {
            // After deletion, nothing left, or the deleted one was the currently selected
            if (connections.length - 1 <= 0 || id === selectedConnection.cid) {
                setSelectedConnection(null)
            }
        }
        emit(REFRESH_CONNECTIONS)
    }

    return (
        <div className='flex size-full flex-col'>
            <Titlebar title='Dataflare' />
            <SplitView
                direction={Direction.Horizontal}
                pin={Pin.First}
                defaultPinSize={240}
                minPinSize={220}
                maxPinSize={480}
                className='grow overflow-hidden'
                id='connections'
                persistent={Persistent.Permanent}
            >
                <div className='flex size-full flex-col'>
                    <div className='mb-2 mt-3 flex gap-2 px-4'>
                        <NewConnectionMenu onCreate={setSelectedConnection} />
                        <ConnectionMenuActions />
                    </div>
                    <ConnectionList
                        select={selectedConnection?.cid ?? null}
                        onChangeSelect={(config) => {
                            setSelectedConnection(structuredClone(config))
                        }}
                        onDelete={onDeleteConnection}
                    />
                    <ActivateButton />
                </div>
                {selectedConnection === null ? (
                    <Welcome size='small' />
                ) : (
                    <div
                        key={selectedConnection.cid}
                        className='flex size-full flex-col overflow-hidden px-4 py-3'
                    >
                        <CurrentConnection
                            data={selectedConnection}
                            onChange={setSelectedConnection as any}
                        />
                        <ConnectionFooter conn={selectedConnection} onChangeSelect={setSelectedConnection} />
                    </div>
                )}
            </SplitView>
        </div>
    )
}

export interface ConnectionEditorOptions<T extends DatabaseConfig> {
    data: Connection<T>
    onChange: React.Dispatch<React.SetStateAction<Connection<T>>>
}

const CurrentConnection = (props: ConnectionEditorOptions<any>): JSX.Element => {
    const connectionEditor = {
        [SqlDatabaseType.Sqlite]: <SqliteConnection {...props} />,
        [SqlDatabaseType.SqlCipher]: <SqlCipherConnection {...props} />,
        [SqlDatabaseType.DuckDB]: <DuckDbConnection {...props} />,
        [SqlDatabaseType.Postgres]: <PostgresConnection {...props} defaultPort={5432} />,
        [SqlDatabaseType.CockroachDB]: <PostgresConnection {...props} defaultPort={26257} />,
        [SqlDatabaseType.QuestDB]: <QuestDbConnection {...props} />,
        [SqlDatabaseType.MySql]: <MySqlConnection {...props} />,
        [SqlDatabaseType.MariaDB]: <MySqlConnection {...props} />,
        [SqlDatabaseType.ManticoreSearch]: <ManticoreSearchConnection {...props} />,
        [SqlDatabaseType.MsSql]: <MsSqlConnection {...props} />,
        [SqlDatabaseType.ClickHouse]: <ClickHouseConnection {...props} />,
        [SqlDatabaseType.Databend]: <DatabendConnection {...props} />,
        [SqlDatabaseType.Databricks]: <DatabricksConnection {...props} />,
        [SqlDatabaseType.BigQuery]: <BigQueryConnection {...props} />,
        [SqlDatabaseType.Trino]: <TrinoConnection {...props} />,
        [SqlDatabaseType.Presto]: <PrestoConnection {...props} />,
        [SqlDatabaseType.Turso]: <TursoConnection {...props} />,
        [SqlDatabaseType.Rqlite]: <RqliteConnection {...props} />,
        [SqlDatabaseType.EchoLite]: <EchoLiteConnection {...props} />,
        [SqlDatabaseType.CloudflareD1]: <CloudflareD1Connection {...props} />,
        [SqlDatabaseType.WorkersAnalyticsEngine]: <WorkersAnalyticsEngineConnection {...props} />,
        [SqlDatabaseType.R2Sql]: <R2SqlConnection {...props} />,
        [KvDatabaseType.CloudflareWorkersKv]: <CloudflareKvConnection {...props} />,
        [KvDatabaseType.Redis]: <RedisConnection {...props} />,
        [KvDatabaseType.S3]: <S3Connection {...props} />
    }
    return (connectionEditor as any)[props.data.config.type]
}
