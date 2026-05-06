import { t } from '../../../i18n'
import { SqliteConfig } from '../../../tauri'
import { ConnectionEditorOptions } from '../connections'
import { InitialSQL, DatabasePathSelect, Item, Readonly } from '../from'
import { useOptions } from '../hooks'
import { ConnectionTab } from '../tabs'

export const SqliteConnection = ({ data, onChange }: ConnectionEditorOptions<SqliteConfig>) => {
    const { name, options, setName, setOpt } = useOptions(data, onChange)

    const general = (
        <>
            <Item label={t('name')} value={name} onChange={setName} />
            <DatabasePathSelect path={options.path} onChange={(path) => setOpt('path', path)} />
        </>
    )

    const security = (
        <Readonly secure={true} readonly={options.readonly} onChange={(val) => setOpt('readonly', val)} />
    )

    const initSQL = (
        <InitialSQL
            placeholder={`PRAGMA foreign_keys = ON;\nPRAGMA journal_mode = WAL;`}
            sql={options.initial}
            onChange={(val) => setOpt('initial', val)}
        />
    )

    const proxy = (
        <div className='flex h-full flex-col px-4 pt-10'>
            <h3 className='text-center text-sm text-secondary'>{t('sqliteOnServer')}</h3>
            <p className='mt-3 text-center text-xs text-tertiary'>{t('sqliteOnServerMsg')}</p>
        </div>
    )

    return <ConnectionTab general={general} security={security} initialSQL={initSQL} proxy={proxy} />
}
