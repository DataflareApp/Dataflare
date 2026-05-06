import { t } from '../../../i18n'
import { R2SqlConfig } from '../../../tauri'
import { ConnectionEditorOptions } from '../connections'
import { Item } from '../from'
import { useOptions } from '../hooks'
import { ConnectionTab } from '../tabs'

export const R2SqlConnection = ({ data, onChange }: ConnectionEditorOptions<R2SqlConfig>) => {
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
                label={'Bucket'}
                placeholder='Bucket Name'
                value={options.bucket_name}
                onChange={(val) => setOpt('bucket_name', val)}
            />
            <Item
                label={'API Token'}
                type='password'
                value={options.api_token}
                onChange={(val) => setOpt('api_token', val)}
            />
        </>
    )

    return <ConnectionTab general={general} alert='dev' />
}
