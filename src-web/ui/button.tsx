import { IconDownload, IconLoader2, IconSql } from '@tabler/icons-react'
import { IconCopy, IconCheck } from '@tabler/icons-react'
import cn from 'clsx'
import { Ref, forwardRef, ButtonHTMLAttributes, ReactNode } from 'react'
import { useState } from 'react'
import { useAlertMessage } from '../hooks/use-alert'
import { useShortcutMeta } from '../hooks/use-shortcut'
import { useSuccess } from '../hooks/use-success'
import { useTranslation } from '../i18n'
import { writeClipboardText } from '../tauri'
import { KeyModifier, keyboardTitleChars } from '../utils/keyboard-char'
import { Tooltip } from './tooltip'

interface ButtonProps {
    primary?: boolean
    loading?: boolean
}

export const Button = forwardRef(
    (
        {
            primary = false,
            loading,
            className,
            disabled,
            children,
            title,
            ...props
        }: ButtonProps & ButtonHTMLAttributes<HTMLButtonElement>,
        ref: Ref<HTMLButtonElement>
    ) => {
        const button = (
            <button
                className={cn(
                    className,
                    'flex h-7 items-center justify-center gap-1 whitespace-nowrap rounded border px-3 text-sm transition disabled:cursor-not-allowed',
                    primary
                        ? 'border-theme bg-theme text-gray-100 enabled:hover:bg-theme/90'
                        : 'border-separator bg-zinc-100 text-secondary enabled:hover:bg-zinc-200 disabled:text-quarternary dark:border-neutral-700 dark:bg-neutral-800 dark:enabled:hover:bg-neutral-700'
                )}
                disabled={loading || disabled}
                ref={ref}
                {...props}
            >
                {loading ? <IconLoader2 size={16} strokeWidth={1.6} className='animate-spin' /> : children}
            </button>
        )
        if (title === undefined) {
            return button
        }
        return <Tooltip title={title}>{button}</Tooltip>
    }
)

export const IconButton = forwardRef(
    (
        { className, children, title, ...props }: ButtonHTMLAttributes<HTMLButtonElement>,
        ref: Ref<HTMLButtonElement>
    ) => {
        const button = (
            <button
                className={cn(
                    className,
                    'rounded px-2 py-0.5 text-secondary hover:bg-neutral-300/60 hover:text-primary focus:text-primary hover:dark:bg-zinc-800/60'
                )}
                ref={ref}
                {...props}
            >
                {children}
            </button>
        )
        if (title === undefined) {
            return button
        }
        return <Tooltip title={title}>{button}</Tooltip>
    }
)

export const ViewSqlButton = forwardRef(
    (props: ButtonProps & ButtonHTMLAttributes<HTMLButtonElement>, ref: Ref<HTMLButtonElement>) => {
        const { t } = useTranslation()
        return (
            <Button title={t('viewSQL')} ref={ref} {...props}>
                <IconSql size={18} strokeWidth={1.5} />
            </Button>
        )
    }
)

export const SelectButton = ({
    children,
    onClick,
    selected,
    title,
    className
}: {
    children: ReactNode
    onClick: () => void
    selected: boolean
    title?: string
    className?: string
}) => {
    const button = (
        <button
            className={cn(
                'flex h-7 items-center justify-center rounded border border-separator transition',
                selected ? 'border-theme bg-theme text-white' : 'hover:bg-zinc-100 dark:hover:bg-neutral-800',
                className
            )}
            onClick={onClick}
        >
            {children}
        </button>
    )
    if (title === undefined) {
        return button
    }
    return <Tooltip title={title}>{button}</Tooltip>
}

export interface RefreshButtonProps {
    refreshing: boolean
    onRefresh: () => void
    className?: string
}

export const RefreshButton = ({ refreshing, onRefresh, className }: RefreshButtonProps) => {
    const { t } = useTranslation()
    useShortcutMeta('r', (_, shift) => {
        !shift && onRefresh()
    })

    return (
        <Button
            className={className}
            title={keyboardTitleChars(t('refresh'), [KeyModifier.Meta, 'R'])}
            disabled={refreshing}
            onClick={onRefresh}
        >
            <IconRefresh loading={refreshing} />
        </Button>
    )
}

// Originally used IconRefresh from tabler/icons-react, but it was rotated 180deg, so we wrote our own
export const IconRefresh = ({ loading }: { loading: boolean }) => {
    return (
        <svg
            viewBox='0 0 24 24'
            fill='none'
            width={16}
            height={16}
            strokeWidth={1.5}
            className={loading ? 'animate-spin' : undefined}
        >
            <path
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M4 10.985a8.1 8.1 0 0 1 15.5-2m.5-4v4h-4M20 12.985a8.1 8.1 0 0 1-15.5 2m-.5 4v-4h4'
            />
        </svg>
    )
}

export const IconCopyButton = ({
    getCopyText,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { getCopyText: () => string }) => {
    const { t } = useTranslation()
    const [copySuccess, setCopySuccess] = useSuccess()
    const [loading, setLoading] = useState(false)
    const alertMessage = useAlertMessage()

    const onClick = async () => {
        if (copySuccess) {
            return
        }
        setLoading(true)
        try {
            await writeClipboardText(getCopyText())
            setCopySuccess()
        } catch (err: any) {
            alertMessage(t('error'), err, 'error')
        }
        setLoading(false)
    }

    return (
        <IconButton title={t('copy')} disabled={loading} onClick={onClick} {...props}>
            {copySuccess ? (
                <IconCheck size={16} className='transform-gpu text-theme' />
            ) : (
                <IconCopy size={16} className='transform-gpu' stroke={1.5} />
            )}
        </IconButton>
    )
}

export const IconDownloadButton = forwardRef(
    (
        { loading, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean },
        ref: Ref<HTMLButtonElement>
    ) => {
        const { t } = useTranslation()
        return (
            <IconButton title={t('export')} ref={ref} {...props}>
                {loading ? (
                    <IconLoader2 size={16} strokeWidth={1.6} className='animate-spin' />
                ) : (
                    <IconDownload size={16} strokeWidth={1.5} />
                )}
            </IconButton>
        )
    }
)
