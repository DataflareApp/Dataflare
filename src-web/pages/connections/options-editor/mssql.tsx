import { t } from '../../../i18n'
import { MsSqlAuthType, MsSqlConfig, SqlServerAuthConfig } from '../../../tauri'
import { Select } from '../../../ui'
import { ConnectionEditorOptions } from '../connections'
import { InitialSQL, Addr, Item, Readonly, Row } from '../from'
import { useOptions } from '../hooks'
import { ConnectionTab } from '../tabs'

export const MsSqlConnection = ({ data, onChange }: ConnectionEditorOptions<MsSqlConfig>) => {
    const { name, options, setName, setOpt } = useOptions(data, onChange)

    const onSwitchAuth = (value: string) => {
        switch (value as MsSqlAuthType) {
            case MsSqlAuthType.SqlServer: {
                return setOpt('auth', {
                    type: MsSqlAuthType.SqlServer,
                    options: {
                        user: '',
                        password: ''
                    }
                })
            }
            case MsSqlAuthType.Integrated: {
                return setOpt('auth', {
                    type: MsSqlAuthType.Integrated
                })
            }
        }
    }

    const general = (
        <>
            <Item label={t('name')} value={name} onChange={setName} />
            <Addr
                portPlaceholder='1433'
                host={options.host ?? ''}
                port={options.port}
                onChangeHost={(val) => setOpt('host', val === '' ? null : val)}
                onChangePort={(val) => setOpt('port', val)}
            />
            <Row label={t('auth')}>
                <Select
                    className='flex-1'
                    options={[
                        {
                            name: 'SQL Server',
                            value: MsSqlAuthType.SqlServer
                        },
                        {
                            name: t('sqlserverLogged'),
                            value: MsSqlAuthType.Integrated
                        }
                    ]}
                    value={options.auth.type}
                    onChange={onSwitchAuth}
                />
            </Row>
            {options.auth.type === MsSqlAuthType.SqlServer && (
                <>
                    <Item
                        label={t('user')}
                        value={options.auth.options.user}
                        onChange={(val) => {
                            const auth = { ...options.auth } as SqlServerAuthConfig
                            auth.options.user = val
                            setOpt('auth', auth)
                        }}
                    />
                    <Item
                        label={t('password')}
                        type='password'
                        value={options.auth.options.password}
                        onChange={(val) => {
                            const auth = { ...options.auth } as SqlServerAuthConfig
                            auth.options.password = val
                            setOpt('auth', auth)
                        }}
                    />
                </>
            )}
            <Item
                label={t('database')}
                value={options.database}
                onChange={(val) => setOpt('database', val)}
            />
        </>
    )

    const security = (
        <Readonly secure={false} readonly={options.readonly} onChange={(val) => setOpt('readonly', val)} />
    )

    const initSQL = (
        <InitialSQL
            placeholder={`SET TIMEZONE 'Central Standard Time';`}
            sql={options.initial}
            onChange={(val) => setOpt('initial', val)}
        />
    )

    return <ConnectionTab general={general} security={security} initialSQL={initSQL} />
}
