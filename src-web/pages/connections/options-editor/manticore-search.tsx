import { t } from '../../../i18n'
import { ALL_MYSQL_SSL_MODE, ManticoreSearchConfig, MySqlTlsMode } from '../../../tauri'
import { Select } from '../../../ui'
import { ConnectionEditorOptions } from '../connections'
import { InitialSQL, Addr, Item, Readonly, Row } from '../from'
import { useOptions } from '../hooks'
import { Proxy } from '../proxy'
import { ConnectionTab } from '../tabs'
import { Tls } from '../tls'

export const ManticoreSearchConnection = ({
    data,
    onChange
}: ConnectionEditorOptions<ManticoreSearchConfig>) => {
    const { name, options, setName, setOpt } = useOptions(data, onChange)

    const general = (
        <>
            <Item label={t('name')} value={name} onChange={setName} />
            <Addr
                portPlaceholder='9306'
                host={options.host ?? ''}
                port={options.port}
                onChangeHost={(val) => setOpt('host', val === '' ? null : val)}
                onChangePort={(val) => setOpt('port', val)}
            />
        </>
    )

    const security = (
        <>
            <Readonly secure={true} readonly={options.readonly} onChange={(val) => setOpt('readonly', val)} />
            <Row label={t('sslMode')}>
                <Select
                    className='w-full'
                    options={ALL_MYSQL_SSL_MODE.map((item) => {
                        return {
                            name: item,
                            value: item
                        }
                    })}
                    value={options.tls.mode}
                    onChange={(val) => {
                        setOpt('tls', {
                            ...options.tls,
                            mode: val as MySqlTlsMode
                        })
                    }}
                />
            </Row>
            {options.tls.mode !== MySqlTlsMode.Disabled && (
                <Tls
                    config={options.tls.config}
                    onChange={(config) => {
                        setOpt('tls', {
                            ...options.tls,
                            config
                        })
                    }}
                />
            )}
        </>
    )

    const proxy = <Proxy proxy={options.proxy} onChange={(proxy) => setOpt('proxy', proxy)} />

    const initSQL = (
        <InitialSQL
            placeholder={`SET wait_timeout = 28800;`}
            sql={options.initial}
            onChange={(val) => setOpt('initial', val)}
        />
    )

    return (
        <ConnectionTab general={general} security={security} proxy={proxy} initialSQL={initSQL} alert='dev' />
    )
}
