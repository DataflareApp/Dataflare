import { Root, Portal, Overlay, Content, Title, Close } from '@radix-ui/react-dialog'
import { IconX } from '@tabler/icons-react'
import { ReactNode } from 'react'
import { useTranslation } from '../i18n'
import { IconButton } from './button'

export interface PopupProps {
    title: string
    disableClose?: boolean
    onClose: () => void
    onEscapeKeyDown?: (e: KeyboardEvent) => void
    className?: string
    children: ReactNode
}

export const Popup = ({ title, disableClose, onClose, onEscapeKeyDown, className, children }: PopupProps) => {
    const { t } = useTranslation()
    return (
        <Root
            open
            onOpenChange={() => {
                !disableClose && onClose()
            }}
        >
            <Portal>
                <Overlay className='fixed inset-0 z-10' data-tauri-drag-region />
                <Content
                    className='fixed left-1/2 top-1/2 z-10 rounded-md border border-separator bg-main shadow-dialog focus:outline-none data-[state=open]:animate-dialogIn'
                    aria-describedby={undefined}
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onInteractOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={onEscapeKeyDown}
                    // When the popup appears, block other keyboard shortcuts
                    onKeyDown={(e) => {
                        if (e.key !== 'Escape') {
                            e.stopPropagation()
                        }
                    }}
                >
                    <Title
                        className='flex h-11 items-center whitespace-nowrap border-b border-separator px-4 text-base text-primary'
                        data-tauri-drag-region
                    >
                        {title}
                    </Title>
                    <div className={className}>{children}</div>
                    {!disableClose && (
                        <Close asChild>
                            <IconButton title={t('close')} className='absolute right-2 top-[11px]'>
                                <IconX size={18} strokeWidth={1.6} className='transform-gpu' />
                            </IconButton>
                        </Close>
                    )}
                </Content>
            </Portal>
        </Root>
    )
}
