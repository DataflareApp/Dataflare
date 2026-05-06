import useSWR from 'swr'
import { useTranslation } from '../../../i18n'
import { Device } from '../../../tauri'
import { SuggestionInput, Select, Slider } from '../../../ui'
import {
    MAX_FONT_SIZE,
    MAX_LINE_HEIGHT,
    MIN_FONT_SIZE,
    MIN_LINE_HEIGHT,
    DEFAULT_FONT_FAMILY,
    useEditorFontOptions,
    setFontFamily,
    setFontSize,
    setLineHeight,
    setWordWrap
} from '../../database/hooks/use-sql-editor-options'
import type { EditorFontOptions } from '../../database/sql-editor'
import { SettingsGroup, SettingsItem } from '../item'

const useFonts = () => {
    const { data } = useSWR('system-fonts', async () => {
        const fonts = await Device.fontFamilies()
        return [DEFAULT_FONT_FAMILY, null].concat(fonts)
    })
    return data ?? [DEFAULT_FONT_FAMILY]
}

export const EditorSettings = () => {
    const { t } = useTranslation()
    const fontOptions = useEditorFontOptions()
    const fonts = useFonts()

    return (
        <SettingsGroup name={t('sqlEditor')}>
            <SettingsItem name={t('fontFamily')}>
                <SuggestionInput
                    className='w-48'
                    value={fontOptions.fontFamily}
                    onChange={setFontFamily}
                    suggestions={fonts}
                />
            </SettingsItem>
            <SettingsItem name={t('fontSize')}>
                <Slider
                    className='w-48'
                    value={fontOptions.fontSize}
                    min={MIN_FONT_SIZE}
                    max={MAX_FONT_SIZE}
                    onChange={setFontSize}
                />
            </SettingsItem>
            <SettingsItem name={t('lineHeight')}>
                <Slider
                    className='w-48'
                    value={fontOptions.lineHeight}
                    min={MIN_LINE_HEIGHT}
                    max={MAX_LINE_HEIGHT}
                    onChange={setLineHeight}
                />
            </SettingsItem>
            <SettingsItem name={t('wordWrap')}>
                <Select
                    className='w-48'
                    value={fontOptions.wordWrap}
                    options={[
                        { value: 'on', name: t('on') },
                        { value: 'off', name: t('off') }
                    ]}
                    onChange={(val) => setWordWrap(val as EditorFontOptions['wordWrap'])}
                />
            </SettingsItem>
        </SettingsGroup>
    )
}
