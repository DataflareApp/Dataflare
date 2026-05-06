import { IconBrandGithub, IconBrandX, IconBug, IconKey, IconSpy, IconTelescope } from '@tabler/icons-react'
import { getVersion } from '@tauri-apps/api/app'
import { ReactNode, useEffect, useState } from 'react'
import { useTranslation } from '../../../i18n'
import {
    BUG_FEEDBACK_URL,
    FOLLOW_URL,
    GITHUB_REPOSITORY_URL,
    LICENSE_MANAGER_URL,
    openURL,
    PRIVACY_POLICY_URL,
    RELEASE_URL
} from '../../../utils/opener'

declare const __BUILD_DATE__: string

export const Footer = () => {
    const { t } = useTranslation()
    const [version, setVersion] = useState('')

    useEffect(() => {
        getVersion().then(setVersion)
    }, [])

    return (
        <>
            <div className='flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-tertiary'>
                <Item
                    name={t('whatsnew')}
                    link={RELEASE_URL}
                    icon={<IconTelescope size={16} stroke={1.6} />}
                />
                <Item
                    name={t('bugAndFeature')}
                    link={BUG_FEEDBACK_URL}
                    icon={<IconBug size={16} stroke={1.6} />}
                />
                <Item
                    name={t('licenseManager')}
                    link={LICENSE_MANAGER_URL}
                    icon={<IconKey size={16} stroke={1.6} />}
                />
                <Item
                    name='GitHub'
                    link={GITHUB_REPOSITORY_URL}
                    icon={<IconBrandGithub size={16} stroke={1.6} />}
                />
                <Item
                    name={t('followDataflare')}
                    link={FOLLOW_URL}
                    icon={<IconBrandX size={16} stroke={1.6} />}
                />
                <Item
                    name={t('privacyPolicy')}
                    link={PRIVACY_POLICY_URL}
                    icon={<IconSpy size={16} stroke={1.6} />}
                />
            </div>
            <div className='mt-2 flex justify-center gap-3 text-xs text-tertiary'>
                <span>Dataflare v{version}</span>
                <span>{__BUILD_DATE__}</span>
            </div>
        </>
    )
}

const Item = ({ name, link, icon }: { name: string; link: string; icon: ReactNode }) => {
    return (
        <button
            onClick={() => openURL(link)}
            className='flex items-center gap-1 rounded hover:text-theme hover:underline'
        >
            {icon}
            {name}
        </button>
    )
}
