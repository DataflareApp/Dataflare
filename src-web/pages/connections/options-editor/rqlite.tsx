import { t } from '../../../i18n'
import { RqliteConfig } from '../../../tauri'
import { ConnectionEditorOptions } from '../connections'
import { Addr, BooleanSelect, Item, Readonly, Row } from '../from'
import { useOptions } from '../hooks'
import { Proxy } from '../proxy'
import { ConnectionTab } from '../tabs'

export const RqliteConnection = ({ data, onChange }: ConnectionEditorOptions<RqliteConfig>) => {
    const { name, options, setName, setOpt } = useOptions(data, onChange)

    const general = (
        <>
            <Item label={t('name')} value={name} onChange={setName} />
            <Row label={t('protocol')}>
                <BooleanSelect
                    value={options.https}
                    trueText='HTTPS'
                    falseText='HTTP'
                    onChange={(val) => setOpt('https', val)}
                />
            </Row>
            <Addr
                portPlaceholder='4001'
                host={options.host ?? ''}
                port={options.port}
                onChangeHost={(val) => setOpt('host', val === '' ? null : val)}
                onChangePort={(val) => setOpt('port', val)}
            />
            <Item
                label={t('user')}
                value={options.user ?? ''}
                onChange={(val) => setOpt('user', val === '' ? null : val)}
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

    return <ConnectionTab general={general} security={security} proxy={proxy} />
}
