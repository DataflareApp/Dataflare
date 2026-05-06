import { t } from '../../../i18n'
import { RedisConfig } from '../../../tauri'
import { ConnectionEditorOptions } from '../connections'
import { Addr, BooleanSelect, Item, Readonly, Row } from '../from'
import { useOptions } from '../hooks'
import { Proxy } from '../proxy'
import { ConnectionTab } from '../tabs'
import { Tls } from '../tls'

export const RedisConnection = ({ data, onChange }: ConnectionEditorOptions<RedisConfig>) => {
    const { name, options, setName, setOpt } = useOptions(data, onChange)

    const general = (
        <>
            <Item label={t('name')} value={name} onChange={setName} />
            <Addr
                portPlaceholder={'6379'}
                host={options.host ?? ''}
                port={options.port}
                onChangeHost={(val) => setOpt('host', val === '' ? null : val)}
                onChangePort={(val) => setOpt('port', val)}
            />
            <Item
                label={t('user')}
                placeholder='default'
                value={options.username ?? ''}
                onChange={(val) => setOpt('username', val === '' ? null : val)}
            />
            <Item
                label={t('password')}
                type='password'
                value={options.password ?? ''}
                onChange={(val) => setOpt('password', val === '' ? null : val)}
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
            <Row label='TLS'>
                <BooleanSelect
                    value={options.tls.enabled}
                    trueText={t('on')}
                    falseText={t('off')}
                    onChange={(enabled) => {
                        setOpt('tls', { ...options.tls, enabled })
                    }}
                />
            </Row>
            {options.tls.enabled && (
                <>
                    <Row label={'Hostname'}>
                        <div className='flex-1'>
                            <BooleanSelect
                                value={options.tls.insecure}
                                trueText={'Disable hostname verification'}
                                falseText={'Enable hostname verification'}
                                onChange={(insecure) => {
                                    setOpt('tls', { ...options.tls, insecure })
                                }}
                            />
                            {options.tls.insecure && (
                                <p className='mt-2 text-xs text-tertiary'>
                                    {t('disableHostnameVerificationWarning')}
                                </p>
                            )}
                        </div>
                    </Row>
                    <Tls
                        config={options.tls.config}
                        onChange={(config) => {
                            setOpt('tls', {
                                ...options.tls,
                                config
                            })
                        }}
                    />
                </>
            )}
        </>
    )

    const proxy = <Proxy proxy={options.proxy} onChange={(proxy) => setOpt('proxy', proxy)} />

    return <ConnectionTab general={general} security={security} proxy={proxy} alert='dev' />
}
