import { t } from '../../../i18n'
import { ConnectProtocol, DatabricksConfig } from '../../../tauri'
import { ConnectionEditorOptions } from '../connections'
import { Addr, BooleanSelect, Item, Readonly, Row } from '../from'
import { useOptions } from '../hooks'
import { Proxy } from '../proxy'
import { ConnectionTab } from '../tabs'

const defaultPort = (protocol: ConnectProtocol): number => {
    switch (protocol) {
        case ConnectProtocol.Http:
            return 80
        case ConnectProtocol.Https:
            return 443
    }
}

export const DatabricksConnection = ({ data, onChange }: ConnectionEditorOptions<DatabricksConfig>) => {
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
                placeholder='/sql/1.0/warehouses/...'
                label='HTTP Path'
                value={options.http_path}
                onChange={(val) => setOpt('http_path', val)}
            />
            <Item
                label='Token'
                type='password'
                value={options.auth.options.token}
                onChange={(val) => setOpt('auth', { type: options.auth.type, options: { token: val } })}
            />
            <Item
                label='Catalog'
                value={options.catalog ?? ''}
                onChange={(val) => setOpt('catalog', val || null)}
            />
            <Item
                label='Schema'
                value={options.schema ?? ''}
                onChange={(val) => setOpt('schema', val || null)}
            />
        </>
    )

    const security = (
        <>
            <Readonly
                secure={false}
                readonly={options.readonly}
                onChange={(val) => setOpt('readonly', val)}
            />
            <Row label={t('cert')}>
                <div className='flex-1'>
                    <BooleanSelect
                        value={options.allow_invalid_certs}
                        trueText={t('allowInvalidCerts')}
                        falseText={t('system')}
                        onChange={(val) => setOpt('allow_invalid_certs', val)}
                    />
                    {options.allow_invalid_certs && (
                        <p className='mt-2 text-xs text-tertiary'>{t('certWarning')}</p>
                    )}
                </div>
            </Row>
        </>
    )

    const proxy = <Proxy proxy={options.proxy} onChange={(proxy) => setOpt('proxy', proxy)} />

    return <ConnectionTab general={general} security={security} proxy={proxy} alert='beta' />
}
