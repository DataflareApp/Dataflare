import { create } from 'zustand'
import { REFRESH_EDITOR_FONT_OPTIONS, TauriGlobalEvent, emit } from '../../../tauri'
import { parseIntNumber } from '../../../utils/number'
import type { EditorFontOptions } from '../sql-editor'

export const DEFAULT_FONT_FAMILY = 'JetBrainsMono'

const DEFAULT_FONT_SIZE = 13
export const MAX_FONT_SIZE = 26
export const MIN_FONT_SIZE = 10

const DEFAULT_LINE_HEIGHT = 22
export const MAX_LINE_HEIGHT = 50
export const MIN_LINE_HEIGHT = 14

const Storage = {
    set fontFamily(fontFamily: string) {
        localStorage.setItem('EditorFontFamily', fontFamily)
    },
    get fontFamily() {
        return localStorage.getItem('EditorFontFamily') || DEFAULT_FONT_FAMILY
    },
    set fontSize(size: number) {
        localStorage.setItem('EditorFontSize', size.toString())
    },
    get fontSize() {
        return parseIntNumber(
            localStorage.getItem('EditorFontSize'),
            MAX_FONT_SIZE,
            MIN_FONT_SIZE,
            DEFAULT_FONT_SIZE
        )
    },
    set lineHeight(size: number) {
        localStorage.setItem('EditorLineHeight', size.toString())
    },
    get lineHeight() {
        return parseIntNumber(
            localStorage.getItem('EditorLineHeight'),
            MAX_LINE_HEIGHT,
            MIN_LINE_HEIGHT,
            DEFAULT_LINE_HEIGHT
        )
    },
    set wordWrap(wordWrap: EditorFontOptions['wordWrap']) {
        localStorage.setItem('EditorWordWrap', wordWrap)
    },
    get wordWrap() {
        return localStorage.getItem('EditorWordWrap') === 'off' ? 'off' : 'on'
    }
}

const buildState = (): EditorFontOptions => {
    return {
        fontFamily: Storage.fontFamily,
        // TODO
        fontLigatures: true,
        fontSize: Storage.fontSize,
        lineHeight: Storage.lineHeight,
        wordWrap: Storage.wordWrap
    }
}

export const useEditorFontOptions = create<EditorFontOptions>(() => {
    return buildState()
})

export const setFontFamily = (fontFamily: string) => {
    Storage.fontFamily = fontFamily
    emit(REFRESH_EDITOR_FONT_OPTIONS)
}
export const setFontSize = (size: number) => {
    Storage.fontSize = size
    emit(REFRESH_EDITOR_FONT_OPTIONS)
}
export const setLineHeight = (size: number) => {
    Storage.lineHeight = size
    emit(REFRESH_EDITOR_FONT_OPTIONS)
}
export const setWordWrap = (wordWrap: EditorFontOptions['wordWrap']) => {
    Storage.wordWrap = wordWrap
    emit(REFRESH_EDITOR_FONT_OPTIONS)
}

TauriGlobalEvent.listen(REFRESH_EDITOR_FONT_OPTIONS, () => {
    useEditorFontOptions.setState(buildState())
})
