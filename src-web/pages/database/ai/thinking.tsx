import { IconChevronUp, IconLoader2, IconSparkles } from '@tabler/icons-react'
import clsx from 'clsx'
import React, { useEffect, useRef, useState } from 'react'
import { ScrollView } from '../../../ui'
import { AgentPart } from './services'

export const Thinking = ({ part }: { part: Extract<AgentPart, { type: 'reasoning' }> }) => {
    const contentRef = useRef<HTMLDivElement>(null)
    const streaming = part.state === 'streaming'
    const [expanded, setExpanded] = useState(streaming)

    useEffect(() => {
        if (streaming && contentRef.current) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight
        }
        if (!streaming) {
            setExpanded(false)
        }
    }, [part.text, streaming])

    const statusText = streaming ? 'Thinking...' : 'Thinking'

    return (
        <>
            <button
                className='flex h-7 w-full items-center gap-2 rounded text-tertiary transition-colors hover:text-primary'
                onClick={() => setExpanded(!expanded)}
            >
                {streaming ? (
                    <IconLoader2 size={16} strokeWidth={1.5} className='animate-spin' />
                ) : (
                    <IconSparkles size={16} strokeWidth={1.5} />
                )}
                <span>{statusText}</span>
                <IconChevronUp
                    className={clsx('ml-auto transition-transform', { 'rotate-180': expanded })}
                    size={14}
                    strokeWidth={1.5}
                />
            </button>
            {expanded && (
                <ScrollView
                    ref={contentRef}
                    axis='y'
                    className='select-text whitespace-pre-wrap break-words rounded-md border border-dashed border-separator text-tertiary'
                    viewportClassName='max-h-44 py-2 px-3'
                    onContextMenu={(e) => e.stopPropagation()}
                >
                    {/* Not adding Markdown rendering to the thinking process, since the text content is not complex and will be auto-collapsed when complete */}
                    {part.text}
                </ScrollView>
            )}
        </>
    )
}
