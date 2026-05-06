import { Root, Viewport, Scrollbar, Thumb, Corner } from '@radix-ui/react-scroll-area'
import clsx from 'clsx'
import React, { HTMLAttributes, Ref, forwardRef } from 'react'

export type ScrollViewProps = HTMLAttributes<HTMLDivElement> & {
    border?: boolean
    axis: 'x' | 'y' | 'both'
    viewportClassName?: string
    rootStyle?: React.CSSProperties
}

export const ScrollView = forwardRef(
    (
        { className, rootStyle, axis, viewportClassName, border = false, ...props }: ScrollViewProps,
        ref: Ref<HTMLDivElement>
    ) => {
        return (
            <Root
                className={clsx('overflow-hidden', className)}
                style={rootStyle}
                type='hover'
                scrollHideDelay={300}
            >
                <Viewport
                    className={clsx('relative size-full [&>div]:!block', viewportClassName)}
                    {...props}
                    ref={ref}
                />
                {axis !== 'x' && (
                    <Scrollbar
                        className={clsx(
                            'z-20 flex animate-overlayIn touch-none select-none border-l border-transparent p-0.5 duration-150 data-[orientation=vertical]:w-3 hover:data-[orientation=vertical]:w-3.5',
                            border && '!border-separator bg-main'
                        )}
                        orientation='vertical'
                    >
                        <Thumb className="relative z-10 flex-1 rounded-full bg-[#a7a7a7] transition-colors before:absolute before:left-1/2 before:top-1/2 before:h-full before:w-full before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] hover:bg-[#868686] dark:bg-[#6E6E6E] dark:hover:bg-[#9A9A9A]" />
                    </Scrollbar>
                )}
                {axis !== 'y' && (
                    <Scrollbar
                        className={clsx(
                            'z-20 flex animate-overlayIn touch-none select-none border-t border-transparent p-0.5 duration-150 data-[orientation=horizontal]:h-3 data-[orientation=horizontal]:flex-col hover:data-[orientation=horizontal]:h-3.5',
                            border && '!border-separator bg-main'
                        )}
                        orientation='horizontal'
                    >
                        <Thumb className="relative z-10 flex-1 rounded-full bg-[#a7a7a7] transition-colors before:absolute before:left-1/2 before:top-1/2 before:h-full before:w-full before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] hover:bg-[#868686] dark:bg-[#6E6E6E] dark:hover:bg-[#9A9A9A]" />
                    </Scrollbar>
                )}
                {axis === 'both' && <Corner className={border ? 'z-20 bg-main' : undefined} />}
            </Root>
        )
    }
)
