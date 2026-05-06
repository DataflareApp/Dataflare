import { Root, Trigger, Content, Portal, Anchor, PopoverContentProps } from '@radix-ui/react-popover'
import cn from 'clsx'
import { ReactNode } from 'react'

export const popoverSize: React.CSSProperties = {
    maxWidth: 'var(--radix-popover-content-available-width)',
    maxHeight: 'var(--radix-popover-content-available-height)'
}

export interface PopoverProps {
    trigger?: JSX.Element
    anchor?: JSX.Element
    children: ReactNode
    className?: string
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onOpenAutoFocus?: PopoverContentProps['onOpenAutoFocus']
    side?: PopoverContentProps['side']
    sideOffset?: number
}

export const Popover = ({
    trigger,
    anchor,
    children,
    className,
    open,
    onOpenChange,
    onOpenAutoFocus,
    side,
    sideOffset = 4
}: PopoverProps) => {
    return (
        <Root open={open} onOpenChange={onOpenChange}>
            {anchor !== undefined && <Anchor asChild>{anchor}</Anchor>}
            {trigger !== undefined && <Trigger asChild>{trigger}</Trigger>}
            <Portal>
                <Content
                    className={cn(
                        'z-10 rounded border border-separator bg-main/80 shadow-lg outline-none backdrop-blur data-[state=open]:animate-popoverIn',
                        className
                    )}
                    side={side}
                    sideOffset={sideOffset}
                    collisionPadding={16}
                    onOpenAutoFocus={onOpenAutoFocus}
                >
                    {children}
                </Content>
            </Portal>
        </Root>
    )
}
