import { create } from 'zustand'
import { REFRESH_TRANSLATION, TauriGlobalEvent, emit } from '../tauri'
import { translationFn, translationText } from './translation'
import { Language } from './translation'

export const LANGUAGE_OPTIONS = [
    {
        name: 'Deutsch',
        value: Language.de
    },
    {
        name: 'English',
        value: Language.en
    },
    {
        name: 'français',
        value: Language.frFR
    },
    {
        name: '简体中文',
        value: Language.zhCN
    },
    {
        name: '日本語',
        value: Language.ja
    }
]

const Storage = {
    get language(): Language {
        const language = localStorage.getItem('language')
        // Has a saved language setting
        if (language !== null) {
            for (const l of LANGUAGE_OPTIONS) {
                if (l.value === language) {
                    return language
                }
            }
        }
        // Auto-detect language
        for (const l of navigator.languages) {
            switch (l.toLocaleLowerCase()) {
                case 'en':
                case 'en-us': {
                    return Language.en
                }
                case 'de':
                case 'de-de': {
                    return Language.de
                }
                case 'fr':
                case 'fr-fr': {
                    return Language.frFR
                }
                case 'zh-cn': {
                    return Language.zhCN
                }
                case 'ja':
                case 'ja-jp': {
                    return Language.ja
                }
            }
        }
        // Default to English
        return Language.en
    },
    set language(language: Language) {
        localStorage.setItem('language', language)
    },

    // Format numbers in tables
    get formatTableNumber(): boolean {
        return localStorage.getItem('formatTableNumber') !== '0'
    },
    set formatTableNumber(enabled: boolean) {
        localStorage.setItem('formatTableNumber', enabled ? '1' : '0')
    }
}

let currentLanguage = Storage.language

export const t = <N extends keyof typeof translationText>(name: N): string => {
    return translationText[name][currentLanguage]
}

export const tf = <N extends keyof typeof translationFn>(name: N, val: string): string => {
    return translationFn[name][currentLanguage](val)
}

interface TranslationStore {
    language: Language
    t: typeof t
    tf: typeof tf
    numberUtil: Intl.NumberFormat
    relativeTimeUtil: Intl.RelativeTimeFormat
    tableNumberUtil: Intl.NumberFormat | undefined
    formatTableNumber: boolean
}

const buildState = (): TranslationStore => {
    const numberUtil = new Intl.NumberFormat(currentLanguage, {
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#maximumfractiondigits
        // NOTE: The documented maximum is 100, but actual testing on macOS 12.6 shows the maximum is 20
        maximumFractionDigits: 20
    })
    const formatTableNumber = Storage.formatTableNumber
    return {
        language: currentLanguage,
        t,
        tf,
        numberUtil,
        relativeTimeUtil: new Intl.RelativeTimeFormat(currentLanguage, {
            style: 'narrow'
        }),
        tableNumberUtil: formatTableNumber ? numberUtil : undefined,
        formatTableNumber
    }
}

export const useTranslation = create<TranslationStore>(() => {
    return buildState()
})

export const setLanguage = (language: Language) => {
    Storage.language = language
    emit(REFRESH_TRANSLATION)
}

export const setFormatTableNumber = (enabled: boolean) => {
    Storage.formatTableNumber = enabled
    emit(REFRESH_TRANSLATION)
}

TauriGlobalEvent.listen(REFRESH_TRANSLATION, () => {
    currentLanguage = Storage.language
    useTranslation.setState(buildState())
})
