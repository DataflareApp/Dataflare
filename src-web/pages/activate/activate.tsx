import { IconArrowRight, IconKey } from '@tabler/icons-react'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useRef, useState } from 'react'
import useSWRMutation from 'swr/mutation'
import icon from '../../assets/icon.png'
import { useTranslation } from '../../i18n'
import { Device, setLicenseActivated, emit, LICENSE_ACTIVATE_SUCCESS } from '../../tauri'
import { Titlebar, Button, showMessageBox, BasicInput, ScrollView, Tooltip } from '../../ui'
import { LicenseApi, License, LicenseStorage } from '../../utils/license'
import { LICENSE_MANAGER_URL, openURL, PRICING_URL } from '../../utils/opener'

export const Activate = () => {
    const { t, tf } = useTranslation()
    const [key, setKey] = useState('')
    const ref = useRef<HTMLInputElement>(null)
    const { isMutating, trigger } = useSWRMutation(['activate-license', key], async () => {
        const hostname = await Device.hostname()
        return LicenseApi.activate(key, hostname)
    })

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (key === '') {
            return ref.current?.focus()
        }
        try {
            const rst = await trigger()
            const license: License = { key, token: rst.token }
            try {
                await LicenseStorage.save(license)
            } catch (err: any) {
                return showMessageBox(t('error'), `Save license failed: ${err}`, 'error')
            }
            setLicenseActivated()
            emit(LICENSE_ACTIVATE_SUCCESS)
            showMessageBox(
                t('activateSuccessTitle'),
                t('activateSuccessMessage'),
                'success',
                undefined,
                () => {
                    getCurrentWebviewWindow().close()
                }
            )
        } catch (err: any) {
            showMessageBox(t('error'), err, 'error', undefined, () => {
                setTimeout(() => {
                    ref.current?.focus()
                }, 100)
            })
        }
    }

    return (
        <div className='flex h-full flex-col'>
            <Titlebar title={tf('activate', 'Dataflare')} minimizable={false} maximizable={false} />
            <ScrollView className='grow' axis='y'>
                <div className='mx-auto flex w-full max-w-96 flex-col px-3 py-6'>
                    <img src={icon} alt='Dataflare Icon' className='pointer-events-none mx-auto size-20' />
                    <h1 className='mt-4 text-center text-2xl text-primary'>{tf('activate', 'Dataflare')}</h1>
                    <p className='mt-6 rounded-lg border border-dashed border-yellow-500/50 bg-yellow-500/10 p-4 text-center text-xs text-secondary text-yellow-500'>
                        {t('activateLimit')}
                    </p>
                    <p className='mt-6 flex items-center gap-2 text-tertiary'>
                        <IconKey size={16} strokeWidth={1.6} />
                        <span className='text-xs'>{t('licenseKey')}</span>
                    </p>
                    <form className='w-full' onSubmit={onSubmit}>
                        <BasicInput
                            value={key}
                            ref={ref}
                            placeholder='xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
                            className='mt-2 h-9 w-full font-jb text-base'
                            onChange={(e) => setKey(e.target.value)}
                        />
                        <Button primary loading={isMutating} className='mt-4 h-9 w-full' type='submit'>
                            {t('activate')}
                            <IconArrowRight size={16} strokeWidth={1.8} className='ml-1' />
                        </Button>
                    </form>
                    <div className='mt-6 flex justify-between gap-4 text-xs text-tertiary'>
                        <Tooltip title={PRICING_URL}>
                            <button
                                className='hover:text-theme hover:underline'
                                onClick={() => openURL(PRICING_URL)}
                            >
                                {t('purchaseLicense')}
                            </button>
                        </Tooltip>
                        <Tooltip title={LICENSE_MANAGER_URL}>
                            <button
                                className='hover:text-theme hover:underline'
                                onClick={() => openURL(LICENSE_MANAGER_URL)}
                            >
                                {t('licenseManager')}
                            </button>
                        </Tooltip>
                    </div>
                </div>
            </ScrollView>
        </div>
    )
}
