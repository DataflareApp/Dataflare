import { t } from '../../../i18n'
import {
    TursoConfig,
    TursoEncryptionCipher,
    TursoEncryptionConfig,
    TursoDatabaseType,
    TursoLibSQLDatabase,
    TursoRemoteDatabase,
    TursoTursoDatabase,
    ALL_TURSO_CIPHERS
} from '../../../tauri'
import { Select } from '../../../ui'
import { ConnectionEditorOptions } from '../connections'
import { DatabasePathSelect, InitialSQL, Item, Readonly, Row } from '../from'
import { useOptions } from '../hooks'
import { AlertType, ConnectionTab } from '../tabs'

export const TursoConnection = ({ data, onChange }: ConnectionEditorOptions<TursoConfig>) => {
    const { name, options, setName, setOpt } = useOptions(data, onChange)
    const { readonly, database, initial } = options

    const alert: AlertType | undefined = (() => {
        switch (database.type) {
            case TursoDatabaseType.LibSQL:
                return undefined
            case TursoDatabaseType.Turso: {
                return 'dev'
            }
            case TursoDatabaseType.Remote: {
                return 'beta'
            }
        }
    })()

    const allOpenType = [
        { name: 'libSQL', value: TursoDatabaseType.LibSQL },
        { name: 'Turso', value: TursoDatabaseType.Turso },
        { name: t('tursoRemote'), value: TursoDatabaseType.Remote }
    ]

    const updateType = (value: string) => {
        const type = value as TursoDatabaseType
        switch (type) {
            case TursoDatabaseType.LibSQL: {
                return setOpt('database', { type, options: { path: '' } })
            }
            case TursoDatabaseType.Turso: {
                return setOpt('database', { type, options: { path: '', encryption: null } })
            }
            case TursoDatabaseType.Remote: {
                return setOpt('database', { type, options: { url: '', token: '' } })
            }
        }
    }

    const general = (
        <>
            <Item label={t('name')} value={name} onChange={setName} />
            <Row label={t('type')}>
                <Select
                    className='flex-1'
                    options={allOpenType}
                    value={database.type}
                    onChange={updateType}
                />
            </Row>
            {database.type === TursoDatabaseType.LibSQL && (
                <LibSqlOptions database={database} onChange={(database) => setOpt('database', database)} />
            )}
            {database.type === TursoDatabaseType.Turso && (
                <TursoOptions database={database} onChange={(database) => setOpt('database', database)} />
            )}
            {database.type === TursoDatabaseType.Remote && (
                <RemoteOptions database={database} onChange={(database) => setOpt('database', database)} />
            )}
        </>
    )

    const security = (
        <Readonly
            secure={database.type === TursoDatabaseType.LibSQL}
            readonly={readonly}
            onChange={(val) => setOpt('readonly', val)}
        />
    )

    const initSQL = (
        <InitialSQL
            placeholder={`PRAGMA foreign_keys = ON;\nPRAGMA temp_store = MEMORY;`}
            sql={initial}
            onChange={(val) => setOpt('initial', val)}
            noteMessage={t('tursoNotSupportedInitialSQL')}
        />
    )

    return <ConnectionTab general={general} security={security} initialSQL={initSQL} alert={alert} />
}

const LibSqlOptions = ({
    database,
    onChange
}: {
    database: TursoLibSQLDatabase
    onChange: (val: TursoLibSQLDatabase) => void
}) => {
    return (
        <DatabasePathSelect
            path={database.options.path}
            onChange={(path) => onChange({ ...database, options: { path } })}
        />
    )
}

const TursoOptions = ({
    database,
    onChange
}: {
    database: TursoTursoDatabase
    onChange: (val: TursoTursoDatabase) => void
}) => {
    const { encryption } = database.options

    const updateEncryption = (val: TursoEncryptionConfig | null) => {
        onChange({ ...database, options: { ...database.options, encryption: val } })
    }

    const updateCipher = (cipher: string) => {
        if (cipher === '') {
            return updateEncryption(null)
        }
        updateEncryption({
            cipher: cipher as TursoEncryptionCipher,
            key: encryption?.key ?? ''
        })
    }

    const cipherOptions = [
        { name: 'None', value: '' },
        ...ALL_TURSO_CIPHERS.map((cipher) => ({ name: cipher, value: cipher }))
    ]

    return (
        <>
            <Row label={'Cipher'}>
                <Select
                    className='flex-1'
                    options={cipherOptions}
                    value={encryption?.cipher ?? ''}
                    onChange={updateCipher}
                />
            </Row>
            {encryption !== null && (
                <Item
                    label={t('key')}
                    type='password'
                    value={encryption.key}
                    onChange={(val) => updateEncryption({ ...encryption, key: val })}
                />
            )}
            <DatabasePathSelect
                path={database.options.path}
                onChange={(path) => onChange({ ...database, options: { ...database.options, path } })}
            />
        </>
    )
}

const RemoteOptions = ({
    database,
    onChange
}: {
    database: TursoRemoteDatabase
    onChange: (val: TursoRemoteDatabase) => void
}) => {
    const update = <K extends keyof TursoRemoteDatabase['options']>(
        key: K,
        value: TursoRemoteDatabase['options'][K]
    ) => {
        onChange({
            ...database,
            options: {
                ...database.options,
                [key]: value
            }
        })
    }
    return (
        <>
            <Item
                label='URL'
                placeholder='libsql://...'
                value={database.options.url}
                onChange={(val) => update('url', val)}
            />
            <Item
                label='Token'
                type='password'
                value={database.options.token}
                onChange={(val) => update('token', val)}
            />
        </>
    )
}
