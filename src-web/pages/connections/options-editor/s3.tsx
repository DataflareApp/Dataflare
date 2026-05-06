import { t } from '../../../i18n'
import { S3Config } from '../../../tauri'
import { Checkbox } from '../../../ui'
import { ConnectionEditorOptions } from '../connections'
import { Item, Readonly, Row } from '../from'
import { useOptions } from '../hooks'
import { ConnectionTab } from '../tabs'

export const S3Connection = ({ data, onChange }: ConnectionEditorOptions<S3Config>) => {
    const { name, options, setName, setOpt } = useOptions(data, onChange)

    const general = (
        <>
            <Item label={t('name')} value={name} onChange={(val) => setName(val)} />
            <Item
                label={'Access Key'}
                type='password'
                value={options.access_key}
                onChange={(val) => setOpt('access_key', val)}
            />
            <Item
                label={'Secret Key'}
                type='password'
                value={options.secret_key}
                onChange={(val) => setOpt('secret_key', val)}
            />
            <Item
                label={t('endpoint')}
                value={options.endpoint}
                placeholder='https://s3.us-east-1.amazonaws.com'
                onChange={(val) => setOpt('endpoint', val)}
            />
            <Item
                label={t('region')}
                placeholder='us-east-1'
                value={options.region}
                onChange={(val) => setOpt('region', val)}
            />
            <Item
                label={t('bucket')}
                value={options.default_bucket}
                onChange={(val) => setOpt('default_bucket', val)}
            />
            <Row label=''>
                <div
                    className='flex w-full items-center gap-1'
                    onClick={() => setOpt('list_all_buckets', !options.list_all_buckets)}
                >
                    <Checkbox
                        checked={options.list_all_buckets}
                        onChange={(val) => setOpt('list_all_buckets', val)}
                    />
                    <span className='text-xs text-tertiary'>List all buckets</span>
                </div>
            </Row>
        </>
    )

    const security = (
        <>
            <Readonly secure readonly={options.readonly} onChange={(val) => setOpt('readonly', val)} />
        </>
    )

    return <ConnectionTab general={general} security={security} alert='dev' />
}
