import { IconChevronDown, IconEye, IconEyeClosed } from '@tabler/icons-react'
import { IconSearch, IconX } from '@tabler/icons-react'
import clsx from 'clsx'
import React, { Ref, InputHTMLAttributes, forwardRef, useState, useRef, ForwardedRef } from 'react'
import { useShortcutMeta } from '../hooks/use-shortcut'
import { useTranslation } from '../i18n'
import { IconButton } from './button'
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from './dropdown-menu'
import { ScrollView } from './scrollview'

export interface PasswordInputProps {
    className?: string
    placeholder?: string
    value: string
    onChange: (value: string) => void
}

export const PasswordInput = ({ className, value, placeholder, onChange }: PasswordInputProps) => {
    const { t } = useTranslation()
    const [show, setShow] = useState(false)
    return (
        <div className={clsx('relative h-7', className)}>
            <input
                type={show ? 'text' : 'password'}
                className={
                    'block size-full rounded border border-separator bg-transparent pl-2 pr-10 text-sm text-secondary placeholder-quarternary'
                }
                placeholder={placeholder}
                onContextMenu={(e) => e.stopPropagation()}
                spellCheck='false'
                autoComplete='off'
                autoCapitalize='none'
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            <IconButton
                title={show ? t('hiddenPassword') : t('showPassword')}
                className='absolute right-0 top-0 h-full'
                onClick={() => setShow(!show)}
            >
                {show ? <IconEye size={16} stroke={1.7} /> : <IconEyeClosed size={16} stroke={1.7} />}
            </IconButton>
        </div>
    )
}

export interface SuggestionInputProps {
    className?: string
    placeholder?: string
    value: string
    onChange: (value: string) => void
    suggestions: (string | null)[]
}

export const SuggestionInput = ({
    className,
    placeholder,
    value,
    onChange,
    suggestions
}: SuggestionInputProps) => {
    const { t } = useTranslation()
    return (
        <div className={clsx('relative h-7', className)}>
            <input
                className='block size-full rounded border border-separator bg-transparent pl-2 pr-8 text-sm text-secondary placeholder-quarternary'
                onContextMenu={(e) => e.stopPropagation()}
                spellCheck='false'
                autoComplete='off'
                autoCapitalize='none'
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            <DropdownMenu
                trigger={
                    <IconButton title={t('showSuggestions')} className='absolute right-0 top-0 h-full'>
                        <IconChevronDown size={16} strokeWidth={1.6} />
                    </IconButton>
                }
                className='!p-0'
            >
                <ScrollView axis='y' viewportClassName='max-h-60 p-1'>
                    {suggestions.map((suggestion, i) => {
                        if (suggestion === null) {
                            return <DropdownMenuSeparator key={i} />
                        }
                        return (
                            <DropdownMenuItem key={suggestion} onClick={() => onChange(suggestion)}>
                                {suggestion}
                            </DropdownMenuItem>
                        )
                    })}
                </ScrollView>
            </DropdownMenu>
        </div>
    )
}

export const BasicInput = forwardRef(
    (
        { className, onContextMenu, ...props }: React.InputHTMLAttributes<HTMLInputElement>,
        ref: ForwardedRef<HTMLInputElement>
    ) => {
        return (
            <input
                className={clsx(
                    className,
                    'block h-7 rounded border border-separator bg-transparent px-2 text-sm text-secondary placeholder-quarternary'
                )}
                spellCheck='false'
                autoComplete='off'
                autoCapitalize='none'
                onContextMenu={(e) => {
                    e.stopPropagation()
                    onContextMenu?.(e)
                }}
                {...props}
                ref={ref}
            />
        )
    }
)

export interface TextInputProps {
    className?: string
    placeholder?: string
    autoFocus?: boolean
    readonly?: boolean
    value: string
    onChange?: (value: string) => void
    disabled?: boolean
    onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
}

export const TextInput = ({
    className,
    placeholder,
    autoFocus,
    readonly,
    value,
    onChange,
    disabled,
    onKeyDown
}: TextInputProps) => {
    return (
        <input
            placeholder={placeholder}
            autoFocus={autoFocus}
            readOnly={readonly}
            className={clsx(
                className,
                'block h-7 rounded border border-separator bg-transparent px-2 text-sm text-secondary placeholder-quarternary'
            )}
            spellCheck='false'
            autoComplete='off'
            autoCapitalize='none'
            disabled={disabled}
            value={value}
            onChange={(e) => onChange && onChange(e.target.value)}
            onContextMenu={(e) => e.stopPropagation()}
            onKeyDown={onKeyDown}
        />
    )
}

export type TextareaProps = InputHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef((props: TextareaProps, ref: Ref<HTMLTextAreaElement>) => {
    return (
        <textarea
            ref={ref}
            {...props}
            className={clsx(
                props.className,
                'block rounded border border-separator bg-transparent px-2 text-sm text-secondary placeholder-quarternary'
            )}
            onContextMenu={(e) => e.stopPropagation()}
            spellCheck='false'
            autoComplete='off'
            autoCapitalize='none'
        />
    )
})

export type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
    onChange: (value: string) => void
    includeShiftKeyToFocus?: boolean
}

export const SearchInput = ({
    className,
    onChange,
    includeShiftKeyToFocus,
    onKeyDown,
    value,
    ...props
}: SearchInputProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'>) => {
    const { t } = useTranslation()
    const inputRef = useRef<HTMLInputElement>(null)

    useShortcutMeta('f', (_, shift) => {
        if (includeShiftKeyToFocus) {
            shift && inputRef.current?.focus()
        } else {
            !shift && inputRef.current?.focus()
        }
    })

    return (
        <div className={clsx('relative flex items-center', className)}>
            <IconSearch size={14} className='absolute left-2 transform-gpu text-tertiary' />
            <BasicInput
                {...props}
                className='w-full pl-7 pr-8'
                ref={inputRef}
                placeholder={t('search')}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        return onChange('')
                    }
                    onKeyDown?.(e)
                }}
            />
            {value !== '' && (
                <IconButton
                    title={t('clear')}
                    className='absolute right-0 top-0 h-full'
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                        onChange('')
                        inputRef.current?.focus()
                    }}
                >
                    <IconX size={14} className='transform-gpu' strokeWidth={1.8} />
                </IconButton>
            )}
        </div>
    )
}
