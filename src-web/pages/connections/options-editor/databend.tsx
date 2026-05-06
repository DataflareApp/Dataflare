import { t } from '../../../i18n'
import { ConnectProtocol, DatabendConfig } from '../../../tauri'
import { ConnectionEditorOptions } from '../connections'
import { Addr, BooleanSelect, Item, Readonly, Row } from '../from'
import { useOptions } from '../hooks'
import { Proxy } from '../proxy'
import { ConnectionTab } from '../tabs'

const defaultPort = (protocol: ConnectProtocol): number => {
    switch (protocol) {
        case ConnectProtocol.Http:
            return 8000
        case ConnectProtocol.Https:
            return 443
    }
}

export const DatabendConnection = ({ data, onChange }: ConnectionEditorOptions<DatabendConfig>) => {
    const { name, options, setName, setOpt } = useOptions(data, onChange)

    const general = (
        <>
            <Item label={t('name')} value={name} onChange={setName} />
            <Row label={t('protocol')}>
                <BooleanSelect
                    value={options.protocol === ConnectProtocol.Http}
                    trueText='HTTP'
                    falseText='HTTPS'
                    onChange={(val) => setOpt('protocol', val ? ConnectProtocol.Http : ConnectProtocol.Https)}
                />
            </Row>
            <Addr
                portPlaceholder={defaultPort(options.protocol).toString()}
                host={options.host}
                port={options.port}
                onChangeHost={(val) => setOpt('host', val)}
                onChangePort={(val) => setOpt('port', val)}
            />
            <Item
                placeholder='root'
                label={t('user')}
                value={options.user}
                onChange={(val) => setOpt('user', val)}
            />
            <Item
                label={t('password')}
                type='password'
                value={options.password}
                onChange={(val) => setOpt('password', val)}
            />
            <Item
                placeholder='default'
                label={t('database')}
                value={options.database}
                onChange={(val) => setOpt('database', val)}
            />
        </>
    )

    const security = (
        <Readonly secure={false} readonly={options.readonly} onChange={(val) => setOpt('readonly', val)} />
    )

    const proxy = <Proxy proxy={options.proxy} onChange={(proxy) => setOpt('proxy', proxy)} />

    return <ConnectionTab general={general} security={security} proxy={proxy} alert='beta' />
}
