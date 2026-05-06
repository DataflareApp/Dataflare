import { t } from '../../../i18n'
import { ConnectProtocol, TrinoAuthType, TrinoConfig } from '../../../tauri'
import { Select } from '../../../ui'
import { ConnectionEditorOptions } from '../connections'
import { Addr, BooleanSelect, Item, Readonly, Row } from '../from'
import { useOptions } from '../hooks'
import { Proxy } from '../proxy'
import { ConnectionTab } from '../tabs'

const defaultPort = (protocol: ConnectProtocol): number => {
    switch (protocol) {
        case ConnectProtocol.Http:
            return 8080
        case ConnectProtocol.Https:
            return 443
    }
}

export const TrinoConnection = ({ data, onChange }: ConnectionEditorOptions<TrinoConfig>) => {
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
                placeholder='user'
                label={t('user')}
                value={options.user}
                onChange={(val) => setOpt('user', val)}
            />
            <Item
                placeholder='system'
                label={'Catalog'}
                value={options.catalog}
                onChange={(val) => setOpt('catalog', val)}
            />
            <Item
                placeholder='runtime'
                label={'Schema'}
                value={options.schema}
                onChange={(val) => setOpt('schema', val)}
            />
        </>
    )

    const authOptions = [
        { name: 'None', value: TrinoAuthType.None },
        { name: 'Password', value: TrinoAuthType.Password },
        { name: 'JWT', value: TrinoAuthType.Jwt }
    ]
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
            <Row label={t('auth')}>
                <Select
                    className='flex-1'
                    options={authOptions}
                    value={options.auth.type}
                    onChange={(val) => {
                        const authType = val as TrinoAuthType
                        switch (authType) {
                            case TrinoAuthType.None:
                                setOpt('auth', { type: TrinoAuthType.None })
                                break
                            case TrinoAuthType.Password:
                                setOpt('auth', { type: TrinoAuthType.Password, options: { password: '' } })
                                break
                            case TrinoAuthType.Jwt:
                                setOpt('auth', { type: TrinoAuthType.Jwt, options: { token: '' } })
                                break
                        }
                    }}
                />
            </Row>
            {options.auth.type === TrinoAuthType.Password && (
                <Item
                    label={t('password')}
                    type='password'
                    value={options.auth.options.password}
                    onChange={(val) =>
                        setOpt('auth', { type: TrinoAuthType.Password, options: { password: val } })
                    }
                />
            )}
            {options.auth.type === TrinoAuthType.Jwt && (
                <Item
                    label='JWT Token'
                    type='password'
                    value={options.auth.options.token}
                    onChange={(val) => setOpt('auth', { type: TrinoAuthType.Jwt, options: { token: val } })}
                />
            )}
        </>
    )

    const proxy = <Proxy proxy={options.proxy} onChange={(proxy) => setOpt('proxy', proxy)} />

    return <ConnectionTab general={general} security={security} proxy={proxy} alert='beta' />
}
