import { IconColumns2, IconCube, IconFilter, IconX } from '@tabler/icons-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useFuzzySearch } from '../../../hooks/use-fuzzy-search'
import { useShortcutMeta } from '../../../hooks/use-shortcut'
import { useTranslation } from '../../../i18n'
import { Button, IconButton, BasicInput } from '../../../ui'
import { Column } from '../db/db-types'
import WHERE_KEYWORDS from '../db/static/where-keywords'

// TODO: Throttle / Cache / History / Should also include more types, e.g. now(), CURRENT_TIMESTAMP, etc...

type SuggestItem = { type: SuggestType; value: string; description: string }

const enum SuggestType {
    Column,
    Keyword
}

const KEYWRODS: SuggestItem[] = WHERE_KEYWORDS.map((item) => {
    return {
        type: SuggestType.Keyword,
        value: item,
        description: 'Keyword'
    }
})

interface Props {
    value: string
    onChange: (value: string) => void
    columns: Column[] | undefined
}

export const Where = ({ value, onChange, columns }: Props) => {
    const { t } = useTranslation()
    const [code, setCode] = useState(value)
    const [search, setSearch] = useState<string | null>(null)
    const [selected, setSelected] = useState<number>(0)
    const replaceWith = useRef({ start: 0, end: 0 })
    const inputRef = useRef<HTMLInputElement>(null)
    const suggestsRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (value !== code) {
            setCode(value)
            setSearch(null)
        }
    }, [value])

    useShortcutMeta('f', (_, shift) => {
        !shift && inputRef.current?.focus()
    })

    const allSuggests = useMemo(() => {
        let columnNames =
            columns?.map((item) => {
                return {
                    type: SuggestType.Column,
                    value: item.name,
                    description: item.datatype.toLowerCase()
                }
            }) ?? []
        return [...columnNames, ...KEYWRODS]
    }, [columns])

    const suggests = useFuzzySearch(allSuggests, search, (item) => item.value)

    const onInnerChange = (val: string, selectionStart: number) => {
        setCode(val)
        if (val === '') {
            setSearch(null)
            onChange('')
            return
        }
        let start = 0
        let chunks = val.split(' ').map((item) => {
            let rst = {
                start,
                end: start + item.length,
                chars: item
            }
            start += item.length + 1
            return rst
        })
        // TODO: Use binary search
        let currentChunk = chunks.find((item) => {
            return item.start <= selectionStart && item.end >= selectionStart
        })
        if (currentChunk === undefined || currentChunk.chars === '') {
            setSearch(null)
            return
        }
        replaceWith.current = currentChunk
        setSearch(currentChunk.chars)
        setSelected(0)
    }

    const onApplySuggest = () => {
        let before = code.slice(0, replaceWith.current.start)
        let value = suggests[selected].value
        let after = code.slice(replaceWith.current.end)
        if (!after.startsWith(' ')) {
            value += ' '
        }
        let cursorPosition = before.length + value.length
        flushSync(() => {
            setCode(before + value + after)
        })
        inputRef.current?.setSelectionRange(cursorPosition, cursorPosition)
        setSearch(null)
    }

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const updateSelected = (newSelected: number) => {
            if (suggests.length === 0) return
            e.preventDefault()
            setSelected(newSelected)
            const el = suggestsRef.current?.children[newSelected]
            el && el.scrollIntoView({ block: 'nearest', behavior: 'instant' })
        }
        switch (e.key) {
            case 'Enter': {
                e.preventDefault()
                if (search === null || suggests.length === 0) {
                    return onChange(code)
                }
                onApplySuggest()
                break
            }
            case 'Escape': {
                setSearch(null)
                break
            }
            case 'ArrowUp': {
                updateSelected(selected - 1 < 0 ? suggests.length - 1 : selected - 1)
                break
            }
            case 'ArrowDown': {
                updateSelected(selected + 1 >= suggests.length ? 0 : selected + 1)
                break
            }
        }
    }

    return (
        <div className='mr-auto flex w-0 min-w-40 flex-1 items-center gap-2'>
            <div className='relative flex w-full items-center'>
                <IconFilter
                    size={14}
                    strokeWidth={1.6}
                    data-highlighted={value !== '' || undefined}
                    className='absolute left-2 transform-gpu text-tertiary data-[highlighted]:text-theme'
                />
                <BasicInput
                    placeholder='id > 100'
                    className='w-full pl-7 pr-8'
                    value={code}
                    onChange={(e) => onInnerChange(e.target.value, e.target.selectionStart ?? 0)}
                    onBlur={() => setSearch(null)}
                    onKeyDown={onKeyDown}
                    ref={inputRef}
                />
                {code !== '' && (
                    <IconButton
                        title={t('clear')}
                        className='absolute right-0 h-full'
                        onClick={() => {
                            setCode('')
                            onChange('')
                        }}
                    >
                        <IconX size={14} className='transform-gpu' />
                    </IconButton>
                )}
                {search !== null && suggests.length > 0 && (
                    <div
                        className='scrollbar-hide absolute top-8 z-20 max-h-60 w-full overflow-y-auto rounded border border-separator bg-main bg-main/80 p-1 shadow-lg backdrop-blur'
                        ref={suggestsRef}
                    >
                        {suggests.map((suggest, i) => {
                            return (
                                <SuggestItem
                                    key={suggest.value}
                                    suggest={suggest}
                                    selected={i === selected}
                                    onSelect={() => setSelected(i)}
                                    onSelected={onApplySuggest}
                                />
                            )
                        })}
                    </div>
                )}
            </div>
            {code !== '' && value !== code && (
                <Button primary onClick={() => onChange(code)}>
                    {t('apply')}
                </Button>
            )}
        </div>
    )
}

const SuggestItem = ({
    suggest,
    selected,
    onSelect,
    onSelected
}: {
    selected: boolean
    onSelect: () => void
    onSelected: () => void
    suggest: SuggestItem
}) => {
    return (
        <div
            data-selected={selected || undefined}
            className='flex h-6 items-center gap-1 rounded-sm px-1 text-[13px] text-secondary data-[selected]:bg-neutral-200 dark:data-[selected]:bg-zinc-800/80'
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={onSelect}
            onClick={onSelected}
        >
            <SuggestIcon type={suggest.type} />
            <span className='grow truncate'>{suggest.value}</span>
            {selected && <span className='text-xs text-tertiary'>{suggest.description}</span>}
        </div>
    )
}

const SuggestIcon = ({ type }: { type: SuggestType }) => {
    switch (type) {
        case SuggestType.Column: {
            return <IconColumns2 size={14} stroke={1.5} className='shrink-0 text-tertiary' />
        }
        case SuggestType.Keyword: {
            return <IconCube size={14} stroke={1.5} className='shrink-0 text-tertiary' />
        }
    }
}
