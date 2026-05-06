import { memo, useMemo } from 'react'
import useSWRImmutable from 'swr/immutable'
import { Sql } from '../../tauri'
import { useLanguageHighLight } from './hooks/use-db'
import { useEditorFontOptions } from './hooks/use-sql-editor-options'
import { SqlPreview as Preview, SqlPreviewProps } from './sql-editor'

type Props = Pick<SqlPreviewProps, 'className' | 'style' | 'value'> & {
    format?: boolean
}

export const SqlPreview = ({ value, format = false, className, style }: Props) => {
    const fontOptions = useEditorFontOptions()
    const language = useLanguageHighLight()
    const { data: sql } = useSWRImmutable(
        ['sql-preview', format, value],
        () => {
            if (format) {
                return Sql.format(value)
            } else {
                return value
            }
        },
        {
            keepPreviousData: true
        }
    )

    return (
        <Preview
            fontOptions={fontOptions}
            language={language}
            className={className}
            style={{ ...style, fontSize: '13px', lineHeight: '22px', whiteSpace: 'nowrap' }}
            value={sql ?? ''}
        />
    )
}

// This component is specifically for previewing AI tool call SQL and Markdown SQL, only used in AI Chat
export const FixedHeightSqlPreview = memo(
    ({ sql, className, paddingHeight }: { sql: string; className?: string; paddingHeight: number }) => {
        const fontOptions = useEditorFontOptions()
        const language = useLanguageHighLight()

        const height = useMemo(() => {
            const items = sql.split('\n')
            return items.length * 22 + paddingHeight
        }, [sql, paddingHeight])

        return (
            <Preview
                fontOptions={fontOptions}
                language={language}
                style={{
                    fontSize: '13px',
                    lineHeight: '22px',
                    height,
                    whiteSpace: 'nowrap'
                }}
                value={sql}
                className={className}
            />
        )
    }
)
