import { IconMinus, IconPlus } from '@tabler/icons-react'
import { useZoom } from '../../../hooks/use-zoom'
import { useTranslation } from '../../../i18n'
import { SelectButton } from '../../../ui'

export const ZoomSetting = () => {
    const { zoom, zoomIn, zoomOut } = useZoom()
    const { t } = useTranslation()

    return (
        <div className='grid w-48 grid-cols-3 gap-2 text-xs text-tertiary'>
            <SelectButton selected={false} onClick={zoomOut} title={t('zoomOut')}>
                <IconMinus stroke={1.6} size={16} />
            </SelectButton>

            <span className='flex items-center justify-center'>{zoom}%</span>

            <SelectButton selected={false} onClick={zoomIn} title={t('zoomIn')}>
                <IconPlus stroke={1.6} size={16} />
            </SelectButton>
        </div>
    )
}
