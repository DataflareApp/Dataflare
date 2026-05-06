import { t } from '../../../i18n'
import { CloudflareKvConfig } from '../../../tauri'
import { ConnectionEditorOptions } from '../connections'
import { Item, Readonly } from '../from'
import { useOptions } from '../hooks'
import { ConnectionTab } from '../tabs'

export const CloudflareKvConnection = ({ data, onChange }: ConnectionEditorOptions<CloudflareKvConfig>) => {
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
                label={'API Token'}
                type='password'
                value={options.api_token}
                onChange={(val) => setOpt('api_token', val)}
            />
            <Item
                label={t('namespace')}
                value={options.default_namespace}
                onChange={(val) => setOpt('default_namespace', val)}
            />
        </>
    )

    const security = (
        <>
            <Readonly secure readonly={options.readonly} onChange={(val) => setOpt('readonly', val)} />
        </>
    )

    return <ConnectionTab general={general} security={security} alert='dev' />
}
