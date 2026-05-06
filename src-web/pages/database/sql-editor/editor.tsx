import 'monaco-editor/esm/vs/base/browser/ui/codicons/codiconStyles.js'
import 'monaco-editor/esm/vs/editor/contrib/comment/browser/comment.js'
import 'monaco-editor/esm/vs/editor/contrib/find/browser/findController.js'
import 'monaco-editor/esm/vs/editor/contrib/folding/browser/folding.js'
import 'monaco-editor/esm/vs/editor/contrib/linesOperations/browser/linesOperations.js'
import 'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController.js'
import 'monaco-editor/esm/vs/editor/contrib/wordOperations/browser/wordOperations.js'
import React, { useEffect, useRef, useState } from 'react'
import { EditorFontOptions, GetSqlType, LanguageHighLight } from '.'
import { t } from '../../../i18n'
import {
    readClipboardText,
    writeClipboardText,
    showContextMenu,
    StatementPosition,
    Sql
} from '../../../tauri'
import { readFileContent } from '../../../utils/fs'
import { isMacOS } from '../../../utils/os'
import { registerCompletionItemProvider, Completion } from './completion'
import { monaco } from './index'
import { LANGUAGE_ID, setMonarchTokensProvider } from './language'
import './theme'
import './worker'

// Same word highlighting
// import 'monaco-editor/esm/vs/editor/contrib/wordHighlighter/browser/wordHighlighter.js'

export interface EditorUtils {
    getSQL(type: GetSqlType.SelectionValue): string | null
    getSQL(type: GetSqlType.CurrentStatement): string | null
    getSQL(type: GetSqlType.AllStatement): string[] | null
    formatSQL(): void
    minifySQL(): void
}

export interface EditorProps {
    editorID: string
    fontOptions: EditorFontOptions
    language: LanguageHighLight
    value: string
    completions: Completion[] | undefined
    statements: StatementPosition[]
    onChange: (value: string) => void
    onChangeSelection: (selectedCode: boolean) => void
    onInit: (utils: EditorUtils) => void
    onRunSql: (type: GetSqlType) => void
    onFormatSql: () => void
    onMinifySql: () => void
}

export const SQLEditor = (props: EditorProps) => {
    const monacoEl = useRef<HTMLDivElement | null>(null)
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
    const triggerChangeEvent = useRef(true)
    const statements = useRef<monaco.Range[]>([])
    const decoration = useRef<monaco.editor.IEditorDecorationsCollection | null>(null)
    const [dragStyle, setDragStyle] = useState(false)

    const updateDecoration = (position: monaco.Position | null) => {
        if (decoration.current === null) {
            return
        }
        if (position === null) {
            return decoration.current.clear()
        }
        let find = false
        for (const range of statements.current) {
            if (range.containsPosition(position)) {
                decoration.current.set([
                    {
                        range,
                        options: { className: 'monaco-sql-statement' }
                    }
                ])
                find = true
                break
            }
        }
        !find && decoration.current.clear()
    }

    const getSQL = (type: GetSqlType): string | string[] | null => {
        switch (type) {
            case GetSqlType.CurrentStatement: {
                const position = editorRef.current?.getPosition() ?? null
                if (position === null || decoration.current === null) {
                    return null
                }
                for (const range of statements.current) {
                    if (range.containsPosition(position)) {
                        return editorRef.current?.getModel()?.getValueInRange(range) ?? null
                    }
                }
                return null
            }
            case GetSqlType.SelectionValue: {
                const selection = editorRef.current?.getSelection()
                if (selection) {
                    return editorRef.current?.getModel()?.getValueInRange(selection) ?? null
                }
                return null
            }
            case GetSqlType.AllStatement: {
                const model = editorRef.current?.getModel()
                if (model) {
                    return statements.current.map((range) => model.getValueInRange(range))
                }
                return null
            }
        }
    }

    const editCurrentStatement = async (getValue: (value: string) => Promise<string>) => {
        if (editorRef.current === null || decoration.current === null) {
            return
        }
        const edit = async (range: monaco.IRange, value: string | undefined) => {
            if (value !== undefined && value !== '') {
                editorRef.current
                    ?.getModel()
                    ?.pushEditOperations(null, [{ range, text: await getValue(value) }], () => null)
                // Deselect the current selection
                let position = editorRef.current?.getPosition()
                if (position) {
                    editorRef.current?.setPosition(position)
                }
            }
        }
        // From selection value
        const selection = editorRef.current.getSelection()
        if (selection !== null && !selection.isEmpty()) {
            let value = editorRef.current.getModel()?.getValueInRange(selection)
            edit(selection, value)
            return
        }
        // From current statement
        const position = editorRef.current.getPosition()
        if (position === null) {
            return
        }
        for (const range of statements.current) {
            if (range.containsPosition(position)) {
                let value = editorRef.current.getModel()?.getValueInRange(range)
                edit(range, value)
                break
            }
        }
    }

    const formatSQL = () => {
        editCurrentStatement((value) => Sql.format(value))
    }
    const minifySQL = () => {
        editCurrentStatement((value) => Sql.minify(props.language.databaseType, value))
    }

    useEffect(() => {
        if (monacoEl.current === null) {
            return
        }
        editorRef.current = monaco.editor.create(monacoEl.current!, {
            language: LANGUAGE_ID,
            automaticLayout: true,
            minimap: {
                enabled: false
            },
            scrollbar: {
                useShadows: false,
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10
            },
            value: '',
            links: false,
            renderLineHighlight: 'none',
            contextmenu: false,
            tabSize: 2
        })

        editorRef.current.getModel()?.setEOL(monaco.editor.EndOfLineSequence.LF)
        editorRef.current.focus()

        let restored = false
        editorRef.current.onDidChangeModelContent(() => {
            if (triggerChangeEvent.current) {
                props.onChange(editorRef.current?.getValue() ?? '')
            }
            // Restore editor state
            if (!restored && editorRef.current !== null) {
                restored = true
                restoreViewState(editorRef.current, props.editorID)
                updateDecoration(editorRef.current.getPosition() ?? null)
                setTimeout(() => {
                    editorRef.current?.focus()
                }, 100)
            }
        })

        decoration.current = editorRef.current.createDecorationsCollection()

        props.onInit({
            getSQL: getSQL as any,
            formatSQL,
            minifySQL
        })

        return () => {
            if (editorRef.current !== null) {
                saveViewState(editorRef.current, props.editorID)
                editorRef.current.dispose()
            }
        }
    }, [props.editorID])

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.updateOptions(props.fontOptions)
        }
    }, [props.fontOptions])

    useEffect(() => {
        setMonarchTokensProvider(props.language)
    }, [props.language])

    useEffect(() => {
        statements.current = props.statements.map(
            (item) => new monaco.Range(item.startLine, item.startColumn, item.endLine, item.endColumn)
        )
        const position = editorRef.current?.getPosition() ?? null
        updateDecoration(position)
    }, [props.statements])

    useEffect(() => {
        if (editorRef.current && props.completions !== undefined) {
            const reg = registerCompletionItemProvider(props.completions)
            return () => {
                reg.dispose()
            }
        }
    }, [props.completions])

    useEffect(() => {
        if (editorRef.current !== null) {
            if (editorRef.current.getValue() !== props.value) {
                triggerChangeEvent.current = false
                editorRef.current.setValue(props.value)
                triggerChangeEvent.current = true
            }
        }
    }, [props.value])

    useEffect(() => {
        if (editorRef.current === null) {
            return
        }
        const contextMenuEvent = editorRef.current.onContextMenu((e) => {
            const selection = editorRef.current?.getSelection()
            let selectionValue: string | null = null
            if (selection) {
                let value = editorRef.current?.getModel()?.getValueInRange(selection) ?? null
                if (value !== null && value !== '') {
                    selectionValue = value
                }
            }
            showContextMenu(
                [
                    {
                        label: t('runCurrentStatement'),
                        disabled: selectionValue !== null,
                        onClick: () => props.onRunSql(GetSqlType.CurrentStatement)
                    },
                    {
                        label: t('runAllStatement'),
                        disabled: selectionValue !== null,
                        onClick: () => props.onRunSql(GetSqlType.AllStatement)
                    },
                    {
                        label: t('runSelectionSQL'),
                        disabled: selectionValue === null,
                        onClick: () => props.onRunSql(GetSqlType.SelectionValue)
                    },
                    {
                        label: t('formatSQL'),
                        separator: true,
                        onClick: props.onFormatSql
                    },
                    {
                        label: t('minifySQL'),
                        onClick: props.onMinifySql
                    },
                    {
                        label: t('cut'),
                        separator: true,
                        disabled: selectionValue === null,
                        onClick() {
                            editorRef.current?.trigger('keyboard', 'cut', null)
                            writeClipboardText(selectionValue!)
                        }
                    },
                    {
                        label: t('copy'),
                        disabled: selectionValue === null,
                        onClick() {
                            writeClipboardText(selectionValue!)
                        }
                    },
                    {
                        label: t('paste'),
                        disabled: (selection ?? null) === null,
                        onClick: () => {
                            readClipboardText().then((text) => {
                                if (text !== null) {
                                    editorRef.current?.executeEdits(null, [
                                        {
                                            range: selection!,
                                            text: text,
                                            forceMoveMarkers: true
                                        }
                                    ])
                                }
                            })
                        }
                    }
                ],
                () => {
                    editorRef.current?.focus()
                }
            )
        })
        editorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            const selection = editorRef.current?.getSelection()
            if (selection) {
                const length = editorRef.current?.getModel()?.getValueLengthInRange(selection) ?? 0
                if (length > 0) {
                    return props.onRunSql(GetSqlType.SelectionValue)
                }
            }
            props.onRunSql(GetSqlType.CurrentStatement)
        })
        editorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () =>
            props.onRunSql(GetSqlType.AllStatement)
        )
        editorRef.current.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL,
            props.onFormatSql
        )
        editorRef.current.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyJ,
            props.onMinifySql
        )
        if (isMacOS) {
            editorRef.current.addCommand(
                monaco.KeyMod.WinCtrl | monaco.KeyMod.Shift | monaco.KeyCode.KeyN,
                () => editorRef.current?.trigger('keyboard', 'cursorDownSelect', null)
            )
            editorRef.current.addCommand(
                monaco.KeyMod.WinCtrl | monaco.KeyMod.Shift | monaco.KeyCode.KeyP,
                () => editorRef.current?.trigger('keyboard', 'cursorUpSelect', null)
            )
        }
        return () => {
            contextMenuEvent.dispose()
        }
    }, [props.onRunSql, props.onFormatSql, props.onMinifySql])

    useEffect(() => {
        const changeSelectionEvent = editorRef.current?.onDidChangeCursorSelection((e) => {
            const model = editorRef.current?.getModel()
            const length = model?.getValueLengthInRange(e.selection) ?? 0
            props.onChangeSelection(length !== 0)
            if (length !== 0) {
                return updateDecoration(null)
            }
            const position = editorRef.current?.getPosition() ?? null
            updateDecoration(position)
        })
        return () => {
            changeSelectionEvent?.dispose()
        }
    }, [props.onChangeSelection])

    const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        setDragStyle(false)
        const position = editorRef.current?.getPosition()
        if (!position) return
        const range = new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
        )
        let text = ''
        for (let file of e.dataTransfer.files) {
            let fileContent = await readFileContent(file)
            if (fileContent === null) return
            text += await readFileContent(file)
        }
        editorRef.current?.executeEdits(null, [
            {
                range: range,
                text: text,
                forceMoveMarkers: true
            }
        ])
    }

    return (
        <div
            className='relative size-full'
            onDragEnter={(e) => {
                editorRef.current?.focus()
                setDragStyle(true)
            }}
        >
            <div className='size-full' ref={monacoEl} />
            {dragStyle && (
                <div
                    className='absolute inset-0 z-10 size-full border border-dashed border-theme'
                    onDragLeave={(e) => setDragStyle(false)}
                    onDrop={onDrop}
                />
            )}
        </div>
    )
}

const restoreViewState = (editor: monaco.editor.IStandaloneCodeEditor, editorID: string) => {
    let value = sessionStorage.getItem(`EditorState-${editorID}`)
    if (value !== null) {
        try {
            let state = JSON.parse(value)
            editor.restoreViewState(state)
        } catch (_) {}
    }
}

const saveViewState = (editor: monaco.editor.IStandaloneCodeEditor, editorID: string) => {
    let state = editor.saveViewState()
    if (state !== null) {
        sessionStorage.setItem(`EditorState-${editorID}`, JSON.stringify(state))
    }
}
