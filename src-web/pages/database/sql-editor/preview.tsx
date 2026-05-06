import clsx from 'clsx'
import React, { useEffect, useLayoutEffect, useInsertionEffect, useRef } from 'react'
import { EditorFontOptions, LanguageHighLight } from '.'
import { ScrollView } from '../../../ui'
import { monaco } from './index'
import { LANGUAGE_ID, setMonarchTokensProvider } from './language'
import { medie } from './theme'

export interface SqlPreviewProps {
    fontOptions: EditorFontOptions
    className?: string
    style?: React.CSSProperties
    value: string
    language: LanguageHighLight
}

export const SqlPreview = ({ fontOptions, className, style, value, language }: SqlPreviewProps) => {
    const monacoEl = useRef<HTMLDivElement | null>(null)
    const code = useRef<string>(value)

    useInsertionEffect(() => {
        code.current = value
    })

    useEffect(() => {
        const fn = () => render()
        medie.addEventListener('change', fn)
        return () => {
            medie.removeEventListener('change', fn)
        }
    }, [])

    useEffect(() => {
        setMonarchTokensProvider(language).then(render)
    }, [language])

    useLayoutEffect(() => {
        render()
    }, [value])

    const render = () => {
        monaco.editor
            .colorize(code.current, LANGUAGE_ID, {
                tabSize: 2
            })
            .then((html) => {
                if (monacoEl.current !== null) {
                    monacoEl.current.innerHTML = html
                }
            })
    }

    return (
        <ScrollView
            axis='both'
            ref={monacoEl}
            style={{
                fontFamily: fontOptions.fontFamily,
                fontSize: fontOptions.fontSize,
                lineHeight: fontOptions.lineHeight + 'px',
                ...style
            }}
            viewportClassName={clsx(className, 'select-text')}
            onContextMenu={(e) => e.stopPropagation()}
        />
    )
}
