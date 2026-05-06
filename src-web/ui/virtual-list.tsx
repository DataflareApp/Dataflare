import cn from 'clsx'
import { useState, useCallback, RefCallback } from 'react'
import { useElementHeight } from '../hooks/use-size'
import { ScrollView, ScrollViewProps } from './scrollview'

export interface VirtualListProps<T> {
    scrollbarBorder?: boolean
    axis: ScrollViewProps['axis']
    className?: string
    viewportElementID?: string
    data: T[]
    itemHeight: number
    prepareCount: number
    renderItem: (i: number, top: number, item: T) => JSX.Element
    paddingTop?: number
    paddingBottom: number
    onScrollX?: (val: number) => void
    emptyElement: JSX.Element
    elementRef?: RefCallback<HTMLDivElement>
}

export const VirtualList = <T,>({
    scrollbarBorder,
    axis,
    className,
    viewportElementID,
    data,
    itemHeight,
    prepareCount,
    renderItem,
    paddingTop = 0,
    paddingBottom,
    onScrollX,
    emptyElement,
    elementRef
}: VirtualListProps<T>) => {
    const { ref: heightRef, height } = useElementHeight()
    const [lackCount, setLackCount] = useState(prepareCount)
    const [startCount, setStartCount] = useState(0)
    const showCount = Math.ceil(height / itemHeight) + 1
    const endCount = startCount + showCount + prepareCount * 2 - lackCount

    const ref = useCallback(
        (el: HTMLDivElement | null) => {
            heightRef(el)
            elementRef && elementRef(el)
        },
        [heightRef, elementRef]
    )

    if (data.length === 0) {
        return emptyElement
    }

    return (
        <ScrollView
            ref={ref}
            axis={axis}
            border={scrollbarBorder}
            id={viewportElementID}
            className={cn('w-full', className)}
            onScroll={(e) => {
                const start = Math.floor(e.currentTarget.scrollTop / itemHeight)
                setLackCount(Math.max(prepareCount - start, 0))
                setStartCount(Math.max(start - prepareCount, 0))
                if (onScrollX) {
                    onScrollX(e.currentTarget.scrollLeft)
                }
            }}
        >
            <div
                style={{
                    height: data.length * itemHeight + paddingTop + paddingBottom
                }}
            >
                {data.slice(startCount, endCount).map((item, i) => {
                    return renderItem(startCount + i, (startCount + i) * itemHeight + paddingTop, item)
                })}
            </div>
        </ScrollView>
    )
}
