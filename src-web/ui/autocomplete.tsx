import { Autocomplete as BAutocomplete } from '@base-ui/react/autocomplete'
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import clsx from 'clsx'
import { useRef, useState } from 'react'
import { useFuzzySearch } from '../hooks/use-fuzzy-search'
import { useShortcutMeta } from '../hooks/use-shortcut'
import { IconButton } from './button'

export interface AutocompleteProps {
    className?: string
    placeholder?: string
    shortcutKey?: boolean
    suggestions: string[]
    value: string
    onChange: (value: string, fromSuggestion: boolean) => void
}

export const Autocomplete = ({
    className,
    placeholder,
    shortcutKey = false,
    value,
    onChange,
    suggestions
}: AutocompleteProps) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const [showAll, setShowAll] = useState(false)

    const fuzzyResults = useFuzzySearch(suggestions, showAll ? null : value)

    useShortcutMeta(
        'f',
        (_, shift) => {
            !shift && inputRef.current?.focus()
        },
        !shortcutKey
    )

    return (
        <BAutocomplete.Root
            items={suggestions}
            value={value}
            onValueChange={(val, details) => {
                onChange(val, details.reason === 'item-press')
                if (details.reason === 'input-change' || details.reason === 'input-clear') {
                    setShowAll(false)
                }
            }}
            onOpenChange={(open, details) => {
                if (!open) {
                    setShowAll(false)
                } else if (details.reason === 'trigger-press') {
                    setShowAll(true)
                }
            }}
            filter={null}
            filteredItems={fuzzyResults}
            openOnInputClick
        >
            <div className={clsx('relative h-7 rounded', className)}>
                <BAutocomplete.Input
                    ref={inputRef}
                    className='block size-full rounded border border-separator bg-transparent pl-2 pr-8 text-sm text-secondary placeholder-quarternary'
                    placeholder={placeholder}
                    spellCheck='false'
                    autoComplete='off'
                    autoCapitalize='none'
                    onContextMenu={(e) => e.stopPropagation()}
                />
                <BAutocomplete.Trigger
                    render={(props, state) => (
                        <IconButton
                            title={state.open ? 'Close suggestions' : 'Show all suggestions'}
                            {...props}
                            className='absolute right-0 top-0 h-full'
                        >
                            {state.open ? (
                                <IconChevronUp size={16} strokeWidth={1.6} />
                            ) : (
                                <IconChevronDown size={16} strokeWidth={1.6} />
                            )}
                        </IconButton>
                    )}
                />
            </div>
            <BAutocomplete.Portal>
                <BAutocomplete.Positioner
                    className='z-20 data-[empty]:hidden'
                    sideOffset={4}
                    positionMethod='fixed'
                >
                    <BAutocomplete.Popup className='w-[var(--anchor-width)] rounded border border-separator bg-main/80 shadow-lg backdrop-blur'>
                        <BAutocomplete.List className='max-h-48 overflow-y-auto p-1'>
                            {(item: string) => (
                                <BAutocomplete.Item
                                    key={item}
                                    value={item}
                                    className='h-7 cursor-default truncate rounded-sm px-4 text-[13px] leading-7 text-secondary data-[highlighted]:bg-neutral-200 dark:data-[highlighted]:bg-zinc-800/80'
                                >
                                    {item}
                                </BAutocomplete.Item>
                            )}
                        </BAutocomplete.List>
                    </BAutocomplete.Popup>
                </BAutocomplete.Positioner>
            </BAutocomplete.Portal>
        </BAutocomplete.Root>
    )
}
