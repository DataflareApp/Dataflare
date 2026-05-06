import { LANGUAGE_OPTIONS, setLanguage, useTranslation } from '../../../i18n'
import { ScrollView, Select } from '../../../ui'
import { SettingsGroup, SettingsItem } from '../item'
import { AppearanceSetting } from './appearance'
import { Footer } from './footer'
import { UpdateSettings } from './update'
import { ZoomSetting } from './zoom'

export const GeneralSettings = () => {
    const { language, t } = useTranslation()

    return (
        <ScrollView className='size-full' viewportClassName='pb-4' axis='y'>
            <SettingsGroup name={t('general')}>
                <SettingsItem name={t('appearance')}>
                    <AppearanceSetting />
                </SettingsItem>
                <SettingsItem name={t('language')}>
                    <Select
                        className='w-48'
                        value={language}
                        options={LANGUAGE_OPTIONS}
                        onChange={(val) => setLanguage(val as any)}
                    />
                </SettingsItem>
                <SettingsItem name={t('zoom')}>
                    <ZoomSetting />
                </SettingsItem>
            </SettingsGroup>

            <SettingsGroup name={t('about')}>
                <SettingsItem name={t('update')}>
                    <div className='text-xs text-tertiary'>
                        <UpdateSettings />
                    </div>
                </SettingsItem>
                <div className='my-4'>
                    <Footer />
                </div>
            </SettingsGroup>
        </ScrollView>
    )
}
