import { Root, Trigger, Portal, Content, HoverCardContentProps } from '@radix-ui/react-hover-card'
import React, { ReactNode } from 'react'

export const hoverCardSize: React.CSSProperties = {
    maxWidth: 'var(--radix-hover-card-content-available-width)',
    maxHeight: 'var(--radix-hover-card-content-available-height)'
}

export const HoverCard = ({
    trigger,
    align,
    children,
    style,
    openDelay,
    closeDelay,
    side
}: {
    trigger: JSX.Element
    align?: HoverCardContentProps['align']
    side?: HoverCardContentProps['side']
    children: ReactNode
    style?: React.CSSProperties
    openDelay: number
    closeDelay: number
}) => {
    return (
        <Root openDelay={openDelay} closeDelay={closeDelay}>
            <Trigger asChild>{trigger}</Trigger>
            <Portal>
                <Content
                    className='z-10 rounded border border-separator bg-main/80 shadow-lg backdrop-blur data-[state=open]:animate-hoverCardIn'
                    style={style}
                    sideOffset={2}
                    align={align}
                    side={side}
                    collisionPadding={16}
                >
                    {children}
                </Content>
            </Portal>
        </Root>
    )
}

export const HoverCardTooltip = ({
    text,
    style,
    side,
    trigger
}: {
    text: string
    style?: React.CSSProperties
    side?: HoverCardContentProps['side']
    trigger: JSX.Element
}) => {
    return (
        <HoverCard openDelay={100} closeDelay={100} trigger={trigger} style={style} side={side}>
            <span className='block whitespace-break-spaces px-4 py-2 text-xs text-secondary'>{text}</span>
        </HoverCard>
    )
}
