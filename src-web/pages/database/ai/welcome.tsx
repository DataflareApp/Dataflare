import { IconAlertCircle, IconMessage } from '@tabler/icons-react'
import { RefObject } from 'react'
import { useTranslation } from '../../../i18n'

export const Welcome = ({
    loading,
    inputRef
}: {
    loading: boolean
    inputRef: RefObject<HTMLTextAreaElement>
}) => {
    const { t } = useTranslation()
    return (
        <div
            className='flex flex-1 items-center justify-center'
            onMouseDown={(e) => {
                e.preventDefault()
                inputRef.current?.focus()
            }}
        >
            {!loading && (
                <div className='flex animate-popoverIn flex-col items-center justify-center px-4'>
                    <IconMessage size={64} strokeWidth={1} className='text-tertiary' />
                    <p className='mt-3 text-base text-tertiary'>{t('aiAssistant')}</p>
                    <p className='mt-1 text-center text-xs text-quarternary'>{t('aiResponseWarning')}</p>
                    <div className='mt-3 flex items-center gap-2 rounded-md border border-yellow-500 bg-yellow-50 px-3 py-2 text-xs text-yellow-800 dark:border-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-200'>
                        <IconAlertCircle strokeWidth={1.5} size={16} className='shrink-0' />{' '}
                        {t('betaMessage')}
                    </div>
                </div>
            )}
        </div>
    )
}
