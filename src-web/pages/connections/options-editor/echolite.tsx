import { IconExternalLink } from '@tabler/icons-react'
import { t } from '../../../i18n'
import { EchoLiteConfig } from '../../../tauri'
import { ECHOLITE_URL, openURL } from '../../../utils/opener'
import { ConnectionEditorOptions } from '../connections'
import { Addr, InitialSQL, Item, Readonly } from '../from'
import { useOptions } from '../hooks'
import { Proxy } from '../proxy'
import { ConnectionTab } from '../tabs'

export const EchoLiteConnection = ({ data, onChange }: ConnectionEditorOptions<EchoLiteConfig>) => {
    const { name, options, setName, setOpt } = useOptions(data, onChange)

    const general = (
        <>
            <Item label={t('name')} value={name} onChange={setName} />
            <Addr
                portPlaceholder='4567'
                host={options.host ?? ''}
                port={options.port}
                onChangeHost={(val) => setOpt('host', val === '' ? null : val)}
                onChangePort={(val) => setOpt('port', val)}
            />
            <Item
                label={t('password')}
                type='password'
                value={options.password ?? ''}
                onChange={(val) => setOpt('password', val)}
            />
            <Item
                placeholder='/home/user/db.sqlite'
                label={t('database')}
                value={options.path}
                onChange={(val) => setOpt('path', val)}
            />

            <div className='flex justify-end'>
                <button
                    className='flex items-center gap-1 rounded-sm text-xs text-tertiary hover:text-theme hover:underline'
                    onClick={() => openURL(ECHOLITE_URL)}
                >
                    EchoLite {t('doc')}
                    <IconExternalLink size={16} stroke={1.6} />
                </button>
            </div>
        </>
    )

    const initSQL = (
        <InitialSQL
            placeholder={`PRAGMA foreign_keys = ON;\nPRAGMA temp_store = MEMORY;`}
            sql={options.initial}
            onChange={(val) => setOpt('initial', val)}
        />
    )

    const security = (
        <>
            <Readonly secure={true} readonly={options.readonly} onChange={(val) => setOpt('readonly', val)} />
        </>
    )

    const proxy = <Proxy proxy={options.proxy} onChange={(proxy) => setOpt('proxy', proxy)} />

    return (
        <ConnectionTab
            general={general}
            security={security}
            proxy={proxy}
            initialSQL={initSQL}
            alert='beta'
        />
    )
}
