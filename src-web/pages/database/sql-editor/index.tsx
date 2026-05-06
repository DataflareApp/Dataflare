import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { SqlDatabaseType } from '../../../tauri'
import type { EditorUtils, EditorProps } from './editor'
import type { SqlPreviewProps } from './preview'

export { monaco }

export * from './utils'

export { SQLEditor } from './editor'
export { SqlPreview } from './preview'

export type { Completion } from './completion'
export { CompletionKind } from './completion'

export type { SqlPreviewProps }
export type { EditorUtils, EditorProps }

export interface LanguageHighLight {
    databaseType: SqlDatabaseType
    keywords: string[]
    functions: string[]
}

export interface EditorFontOptions {
    fontFamily: string
    fontLigatures: boolean
    fontSize: number
    lineHeight: number
    wordWrap: 'on' | 'off'
}

export const enum GetSqlType {
    CurrentStatement,
    AllStatement,
    SelectionValue
}
