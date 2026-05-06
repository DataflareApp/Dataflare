import { useTranslation } from '../../../i18n'
import { ScrollView } from '../../../ui'
import { Footer } from './footer'
import { UpdateSettings } from './update'

export const AboutSettings = () => {
    const { t } = useTranslation()

    return (
        <ScrollView className='grow' axis='y'>
            <div className='grid grid-cols-[minmax(100px,auto)_1fr] gap-x-5 gap-y-3 p-4 text-xs text-tertiary'>
                <label className='text-right leading-7'>{t('update')}</label>
                <UpdateSettings />

                <div className='col-span-2 border-b border-separator' />
                <Footer />
            </div>
        </ScrollView>
    )
}
