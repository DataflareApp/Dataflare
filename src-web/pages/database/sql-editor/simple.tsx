import 'monaco-editor/esm/vs/base/browser/ui/codicons/codiconStyles.js'
import 'monaco-editor/esm/vs/editor/contrib/comment/browser/comment.js'
import 'monaco-editor/esm/vs/editor/contrib/find/browser/findController.js'
import 'monaco-editor/esm/vs/editor/contrib/folding/browser/folding.js'
import 'monaco-editor/esm/vs/editor/contrib/linesOperations/browser/linesOperations.js'
import 'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController.js'
import 'monaco-editor/esm/vs/editor/contrib/wordOperations/browser/wordOperations.js'
import React, { useEffect, useRef } from 'react'
import { EditorFontOptions, LanguageHighLight } from '.'
import { t } from '../../../i18n'
import { readClipboardText, writeClipboardText, showContextMenu } from '../../../tauri'
import { isMacOS } from '../../../utils/os'
import { registerCompletionItemProvider, Completion } from './completion'
import { monaco } from './index'
import { LANGUAGE_ID, setMonarchTokensProvider } from './language'
import './theme'
import './worker'

export interface EditorProps {
    fontOptions: EditorFontOptions
    language: LanguageHighLight
    value: string
    completions: Completion[] | undefined
    onChange: (value: string) => void
}

export const SimpleSqlEditor = (props: EditorProps) => {
    const monacoEl = useRef<HTMLDivElement | null>(null)
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
    const triggerChangeEvent = useRef(true)

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
            value: props.value,
            links: false,
            renderLineHighlight: 'none',
            contextmenu: false
        })

        editorRef.current.getModel()?.setEOL(monaco.editor.EndOfLineSequence.LF)
        editorRef.current.focus()
        editorRef.current.onDidChangeModelContent(() => {
            if (triggerChangeEvent.current) {
                props.onChange(editorRef.current?.getValue() ?? '')
            }
        })

        const contextMenuEvent = editorRef.current.onContextMenu((e) => {
            const selection = editorRef.current?.getSelection()
            let selectionValue: string | null = null
            if (selection) {
                let value = editorRef.current?.getModel()?.getValueInRange(selection) ?? null
                if (value !== null && value !== '') {
                    selectionValue = value
                }
            }
            showContextMenu([
                {
                    label: t('cut'),
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
            ])
        })
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
            if (editorRef.current !== null) {
                editorRef.current.dispose()
            }
        }
    }, [])

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.updateOptions(props.fontOptions)
        }
    }, [props.fontOptions])

    useEffect(() => {
        setMonarchTokensProvider(props.language)
    }, [props.language])

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

    return (
        <div className='relative size-full'>
            <div className='size-full' ref={monacoEl} />
        </div>
    )
}
