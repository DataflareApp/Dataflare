import { useTranslation } from '../../../i18n'
import { Button } from '../../../ui'

interface Props {
    error: string
    onClick: () => void
}

export const ErrorTry = (props: Props) => {
    const { t } = useTranslation()
    return (
        <div className='h-0 grow overflow-y-auto px-4 py-6'>
            <p
                className='select-text break-words text-sm text-primary'
                onContextMenu={(e) => e.stopPropagation()}
            >
                {props.error}
            </p>
            <Button className='mx-auto mt-2' primary onClick={props.onClick}>
                {t('refresh')}
            </Button>
        </div>
    )
}
