import { t } from '../../../i18n'
import { SqlCipherConfig } from '../../../tauri'
import { ConnectionEditorOptions } from '../connections'
import { InitialSQL, DatabasePathSelect, Item, Readonly } from '../from'
import { useOptions } from '../hooks'
import { ConnectionTab } from '../tabs'

export const SqlCipherConnection = ({ data, onChange }: ConnectionEditorOptions<SqlCipherConfig>) => {
    const { name, options, setName, setOpt } = useOptions(data, onChange)

    const general = (
        <>
            <Item label={t('name')} value={name} onChange={setName} />
            <DatabasePathSelect path={options.path} onChange={(path) => setOpt('path', path)} />
            <Item label='Key' type='password' value={options.key} onChange={(val) => setOpt('key', val)} />
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

    return <ConnectionTab general={general} security={security} initialSQL={initSQL} />
}
