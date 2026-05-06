import { monaco } from '../index'

// Doc: https://github.com/microsoft/vscode/blob/main/src/vs/editor/standalone/common/themes.ts

export const light: monaco.editor.IStandaloneThemeData = {
    base: 'vs',
    inherit: true,
    rules: [
        // { token: '', foreground: '' },
        // { token: 'delimiter', foreground: '' },
        { token: 'number', foreground: '0074f7' },
        // { token: 'operator.sql', foreground: '' },
        { token: 'keyword', foreground: 'D73A49' },
        { token: 'string.sql', foreground: '195CC5' },
        { token: 'comment', foreground: '6A737D' },
        { token: 'predefined.sql', foreground: '6F42C1' }
    ],
    colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#24292e',
        'editor.selectionBackground': '#0366d625',
        'editor.inactiveSelectionBackground': '#0366d611',
        'editor.selectionHighlightBorder': '#fafbfc',
        'editorCursor.foreground': '#24292e',
        'editorWhitespace.foreground': '#959da5',
        'editorIndentGuide.background': '#959da5',
        'editorIndentGuide.activeBackground': '#24292e',
        'editorLineNumber.foreground': '#C2C3C4',
        'editorLineNumber.activeForeground': '#23292D'
    }
}

export const dark: monaco.editor.IStandaloneThemeData = {
    base: 'vs-dark',
    inherit: true,
    rules: [
        { token: '', foreground: 'D4D4D4' },
        { token: 'delimiter', foreground: 'E1E4E8' },
        { token: 'number', foreground: '79B8FF' },
        // { token: 'operator.sql', foreground: 'ff0000' },
        { token: 'keyword', foreground: '9D89EB' },
        { token: 'string.sql', foreground: '6bc28e' },
        { token: 'comment', foreground: '6A737D' },
        { token: 'predefined.sql', foreground: '11A793' }
    ],
    colors: {
        'editor.background': '#00000000',
        'editor.foreground': '#f8f8f2',
        'editor.selectionBackground': '#3392FF22',
        'editor.inactiveSelectionBackground': '#3392ff17',
        'editorCursor.foreground': '#f8f8f0',
        'editorWhitespace.foreground': '#3B3A32',
        'editorIndentGuide.activeBackground': '#9D550FB0',
        'editorLineNumber.foreground': '#616161',
        'editorLineNumber.activeForeground': '#c4c4c4'
    }
}
