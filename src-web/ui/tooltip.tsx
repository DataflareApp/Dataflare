import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'
import { ReactElement } from 'react'

interface TooltipProps {
    title: string
    side?: BaseTooltip.Positioner.Props['side']
    align?: BaseTooltip.Positioner.Props['align']
    delay?: number
    children: ReactElement
}

export function Tooltip({ title, side, align, delay, children }: TooltipProps) {
    return (
        <BaseTooltip.Root>
            <BaseTooltip.Trigger delay={delay} render={children} />
            <BaseTooltip.Portal>
                <BaseTooltip.Positioner
                    side={side}
                    sideOffset={3}
                    align={align}
                    positionMethod='fixed'
                    className='z-20'
                >
                    <BaseTooltip.Popup
                        className='max-w-xs select-text whitespace-pre-wrap break-words rounded border border-separator bg-main/80 px-2 py-1 text-xs text-secondary backdrop-blur transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 data-[instant]:duration-0'
                        style={{
                            boxShadow: '0 0 4px 0px rgba(0,0,0,0.1)'
                        }}
                    >
                        {title}
                    </BaseTooltip.Popup>
                </BaseTooltip.Positioner>
            </BaseTooltip.Portal>
        </BaseTooltip.Root>
    )
}
