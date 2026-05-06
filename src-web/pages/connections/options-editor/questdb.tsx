import { t } from '../../../i18n'
import { ALL_POSTGRES_SSL_MODE, PostgresTlsMode, QuestDbConfig } from '../../../tauri'
import { Select } from '../../../ui'
import { ConnectionEditorOptions } from '../connections'
import { Addr, Item, Readonly, Row } from '../from'
import { useOptions } from '../hooks'
import { Proxy } from '../proxy'
import { ConnectionTab } from '../tabs'
import { Tls } from '../tls'

const PROTOCOL_OPTIONS = [
    {
        name: 'PGWire',
        value: 'pgwire'
    }
]

export const QuestDbConnection = ({ data, onChange }: ConnectionEditorOptions<QuestDbConfig>) => {
    const { name, options, setName, setOpt } = useOptions(data, onChange)

    const general = (
        <>
            <Item label={t('name')} value={name} onChange={setName} />
            <Row label={t('protocol')}>
                <Select
                    className='w-full'
                    options={PROTOCOL_OPTIONS}
                    value={options.protocol}
                    onChange={() => {}}
                />
            </Row>
            <Addr
                portPlaceholder='8812'
                host={options.host ?? ''}
                port={options.port}
                onChangeHost={(val) => setOpt('host', val === '' ? null : val)}
                onChangePort={(val) => setOpt('port', val)}
            />
            <Item label={t('user')} value={options.user} onChange={(val) => setOpt('user', val)} />
            <Item
                label={t('password')}
                type='password'
                value={options.password}
                onChange={(val) => setOpt('password', val)}
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
            <Row label={t('sslMode')}>
                <Select
                    className='w-full'
                    options={ALL_POSTGRES_SSL_MODE.map((item) => {
                        return {
                            name: item,
                            value: item
                        }
                    })}
                    value={options.tls.mode}
                    onChange={(val) => {
                        setOpt('tls', {
                            ...options.tls,
                            mode: val as PostgresTlsMode
                        })
                    }}
                />
            </Row>
            {options.tls.mode !== PostgresTlsMode.Disabled && (
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

    return <ConnectionTab general={general} security={security} proxy={proxy} />
}
