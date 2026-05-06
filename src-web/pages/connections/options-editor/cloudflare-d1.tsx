import { IconHelp } from '@tabler/icons-react'
import { t } from '../../../i18n'
import { CloudflareD1Config } from '../../../tauri'
import { HoverCardTooltip, TextInput } from '../../../ui'
import { ConnectionEditorOptions } from '../connections'
import { Item, Readonly, Row } from '../from'
import { useOptions } from '../hooks'
import { ConnectionTab } from '../tabs'

export const CloudflareD1Connection = ({ data, onChange }: ConnectionEditorOptions<CloudflareD1Config>) => {
    const { name, options, setName, setOpt } = useOptions(data, onChange)

    const general = (
        <>
            <Item label={t('name')} value={name} onChange={(val) => setName(val)} />
            <Item
                label={t('account')}
                placeholder={`Cloudflare ${t('account')} ID`}
                value={options.account_id}
                onChange={(val) => setOpt('account_id', val)}
            />
            <Item
                label={t('database')}
                value={options.database_id}
                placeholder='xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
                onChange={(val) => setOpt('database_id', val)}
            />
            <Item
                label={'API Token'}
                type='password'
                value={options.api_token}
                onChange={(val) => setOpt('api_token', val)}
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
        </>
    )

    const proxy = (
        <Row label='API Origin'>
            <div className='flex flex-1 grow items-center gap-2'>
                <TextInput
                    className='grow'
                    placeholder='https://api.cloudflare.com'
                    value={options.api_origin || ''}
                    onChange={(val) => setOpt('api_origin', val === '' ? null : val)}
                />
                <HoverCardTooltip
                    style={{
                        maxWidth: 320
                    }}
                    text={t('d1ProxyMsg')}
                    trigger={<IconHelp size={16} stroke={1.5} className='text-tertiary hover:text-primary' />}
                />
            </div>
        </Row>
    )

    return <ConnectionTab general={general} security={security} proxy={proxy} />
}
