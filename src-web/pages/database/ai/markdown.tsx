// From: https://ai-sdk.dev/cookbook/next/markdown-chatbot-with-memoization
import { marked } from 'marked'
import { memo, useMemo } from 'react'
import ReactMarkdown, { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ScrollView, Tooltip } from '../../../ui'
import { openURL } from '../../../utils/opener'
import { FixedHeightSqlPreview } from '../sql-preview'

const customComponents: Components = {
    h1: ({ children }) => {
        return <h1 className='mb-2 mt-3 text-lg'>{children}</h1>
    },
    h2: ({ children }) => {
        return <h2 className='mb-1 mt-2 text-base'>{children}</h2>
    },
    h3: ({ children }) => {
        return <h3 className='my-1 text-base'>{children}</h3>
    },
    h4: ({ children }) => {
        return <h4 className='my-1 text-sm'>{children}</h4>
    },
    h5: ({ children }) => {
        return <h5 className='my-1 text-sm'>{children}</h5>
    },
    h6: ({ children }) => {
        return <h6 className='my-1 text-sm'>{children}</h6>
    },
    hr: () => {
        return <hr className='my-3 border-separator' />
    },
    strong: ({ children }) => {
        return <strong className='font-semibold'>{children}</strong>
    },
    del: ({ children }) => {
        return <del className='text-tertiary line-through'>{children}</del>
    },
    a: ({ href, children }) => {
        return (
            <Tooltip title={href ?? ''}>
                <button
                    className='max-w-full cursor-pointer whitespace-pre-wrap break-words rounded text-left leading-4 text-blue-600 hover:underline'
                    onClick={() => openURL(href ?? '')}
                >
                    {children}
                </button>
            </Tooltip>
        )
    },
    img: ({ src, alt }) => {
        return <img src={src} alt={alt} className='my-2 h-auto max-w-full rounded-md' loading='lazy' />
    },
    pre: ({ children }) => {
        return <pre className='my-2'>{children}</pre>
    },
    code: ({ className, ...props }) => {
        const isInline = !className
        if (isInline) {
            return (
                <code className='whitespace-pre-wrap break-words rounded border border-separator px-1 py-px font-jb'>
                    {props.children}
                </code>
            )
        }
        if (className.includes('language-sql')) {
            return (
                <div className='rounded-md border border-separator bg-neutral-200/20 dark:bg-neutral-800/20'>
                    <FixedHeightSqlPreview
                        className='px-3 py-2'
                        paddingHeight={16}
                        sql={String(props.children).trim()}
                    />
                </div>
            )
        }
        return (
            <ScrollView
                axis='x'
                className='rounded-md border border-separator bg-neutral-200/20 py-2 dark:bg-neutral-800/20'
            >
                <div className='mx-3 inline-block whitespace-pre font-jb'>{props.children}</div>
            </ScrollView>
        )
    },
    ul: ({ children }) => {
        return <ul className='my-2 ml-4 list-inside list-disc'>{children}</ul>
    },
    ol: ({ children }) => {
        return <ol className='my-2 ml-4 list-inside list-decimal'>{children}</ol>
    },
    li: ({ children }) => {
        return <li className='my-1'>{children}</li>
    },
    blockquote: ({ children }) => {
        return <blockquote className='my-2 border-l-2 border-separator pl-4 italic'>{children}</blockquote>
    },
    table: ({ children }) => {
        return (
            <ScrollView className='my-2 overflow-clip rounded-md border border-separator' axis='x'>
                <table className='min-w-full'>{children}</table>
            </ScrollView>
        )
    },
    thead: ({ children }) => {
        return <thead className='border-b border-separator bg-zinc-100 dark:bg-zinc-900'>{children}</thead>
    },
    tbody: ({ children }) => {
        return <tbody>{children}</tbody>
    },
    tr: ({ children }) => {
        return <tr className='border-b border-separator [&:last-child]:border-b-0'>{children}</tr>
    },
    th: ({ children, style }) => {
        return (
            <th
                className='whitespace-nowrap border-r border-r-separator px-3 py-1.5 text-left font-semibold [&:last-child]:border-r-0'
                style={style}
            >
                {children}
            </th>
        )
    },
    td: ({ children, style }) => {
        return (
            <td
                className='whitespace-nowrap border-r border-r-separator px-3 py-1.5 [&:last-child]:border-r-0'
                style={style}
            >
                {children}
            </td>
        )
    },
    input: () => {
        return null
    }
}

const remarkPlugins = [remarkGfm]

const MarkdownBlock = memo(
    ({ content }: { content: string }) => {
        return (
            <ReactMarkdown components={customComponents} remarkPlugins={remarkPlugins}>
                {content}
            </ReactMarkdown>
        )
    },
    (prevProps, nextProps) => {
        return prevProps.content === nextProps.content
    }
)

export const Markdown = memo(
    ({ content }: { content: string }) => {
        const blocks = useMemo(() => {
            const tokens = marked.lexer(content)
            return tokens.map((token) => token.raw)
        }, [content])

        return (
            <div
                className='select-text break-words text-secondary'
                onContextMenu={(e) => e.stopPropagation()}
            >
                {blocks.map((block, index) => {
                    return <MarkdownBlock content={block} key={index} />
                })}
            </div>
        )
    },
    (prevProps, nextProps) => {
        return prevProps.content === nextProps.content
    }
)
