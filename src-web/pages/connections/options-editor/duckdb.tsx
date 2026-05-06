import { t } from '../../../i18n'
import { DuckDbConfig } from '../../../tauri'
import { ConnectionEditorOptions } from '../connections'
import { InitialSQL, DatabasePathSelect, Item, Readonly } from '../from'
import { useOptions } from '../hooks'
import { ConnectionTab } from '../tabs'

export const DuckDbConnection = ({ data, onChange }: ConnectionEditorOptions<DuckDbConfig>) => {
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
            placeholder={`INSTALL ulid FROM community;\nLOAD ulid;\n\nSET threads = 4;`}
            sql={options.initial}
            onChange={(val) => setOpt('initial', val)}
        />
    )

    return <ConnectionTab general={general} security={security} initialSQL={initSQL} />
}
