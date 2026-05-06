import { useTranslation } from '../i18n'

export const Loading = () => {
    const { t } = useTranslation()
    return (
        <div className='flex h-full flex-1 items-center justify-center text-sm text-tertiary'>
            {t('loading')}
        </div>
    )
}

export const Message = ({ text }: { text: string }) => {
    return (
        <div className='flex h-full flex-1 items-center justify-center break-all px-4 text-sm text-tertiary'>
            {text}
        </div>
    )
}

export const ErrorMessage = ({ text }: { text: string }) => {
    return (
        <div className='flex h-full flex-1 items-center justify-center overflow-auto px-4'>
            <p
                className='m-auto min-w-0 select-text break-words text-sm leading-6 text-tertiary'
                onContextMenu={(e) => e.stopPropagation()}
            >
                {text}
            </p>
        </div>
    )
}

export const SqlQueryErrorMessage = ({ error }: { error: string }) => {
    return (
        <div
            className='h-full flex-1 select-text overflow-auto whitespace-pre-wrap break-words px-4 py-2 font-mono text-[13px] leading-5 text-red-500'
            onContextMenu={(e) => e.stopPropagation()}
        >
            {error}
        </div>
    )
}
