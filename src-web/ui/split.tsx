import React, { useState } from 'react'
import { useElementSize } from '../hooks/use-size'
import { parseIntNumber } from '../utils/number'

export interface SplitViewProps {
    id: string
    direction: Direction
    pin: Pin
    persistent: Persistent
    minPinSize: number
    maxPinSize?: number
    defaultPinSize: number
    minFlexSize?: number
    className?: string
    children: [React.JSX.Element | undefined | boolean, React.JSX.Element | undefined | boolean]
}

export const enum Direction {
    Horizontal,
    Vertical
}

export const enum Pin {
    First,
    Last
}

export const enum Persistent {
    Permanent,
    Temporary
}

export const SPLIT_DRAGGING_CLASS = {
    col: 'split-view-dragging-col',
    row: 'split-view-dragging-row'
} as const

export const SplitView = ({
    id,
    direction,
    pin,
    persistent,
    minPinSize,
    maxPinSize,
    defaultPinSize,
    minFlexSize = 100,
    className,
    children
}: SplitViewProps) => {
    const { ref, size: containerSize } = useElementSize()
    const [pinSize, setPinSize] = useState(() => read(id, persistent, minPinSize, defaultPinSize))

    // If maxSize exceeds the limit, set it to the maximum available value
    if (containerSize !== undefined) {
        const size = direction === Direction.Horizontal ? containerSize.width : containerSize.height
        const n = size - minFlexSize
        maxPinSize = Math.min(maxPinSize ?? n, n)
        if (pinSize > minPinSize && pinSize > maxPinSize) {
            const v = Math.max(maxPinSize, minPinSize)
            setPinSize(v)
            save(id, v, persistent)
        }
    }

    const horizontal = direction === Direction.Horizontal
    const [first, last] = children

    const mouseDown = (e: MouseEvent) => {
        const originSize = pinSize
        const startPosition = horizontal ? e.clientX : e.clientY
        let latestSize = pinSize

        document.body.classList.add(horizontal ? SPLIT_DRAGGING_CLASS.col : SPLIT_DRAGGING_CLASS.row)

        const move = (e: MouseEvent) => {
            const n = horizontal ? e.clientX : e.clientY
            const newSize =
                pin === Pin.First ? n - startPosition + originSize : startPosition + originSize - n
            if (maxPinSize !== undefined && newSize >= minPinSize && newSize <= maxPinSize) {
                latestSize = newSize
                requestAnimationFrame(() => {
                    setPinSize(newSize)
                })
            }
        }

        window.addEventListener('mousemove', move, { passive: true })
        window.addEventListener(
            'mouseup',
            () => {
                window.removeEventListener('mousemove', move)
                save(id, latestSize, persistent)
                document.body.classList.remove(SPLIT_DRAGGING_CLASS.col, SPLIT_DRAGGING_CLASS.row)
            },
            { once: true }
        )
    }

    const style = (position: Pin): React.CSSProperties => {
        const p = pin === position
        if (horizontal) {
            return {
                width: p ? pinSize : undefined,
                maxWidth: p ? '100%' : undefined,
                flexShrink: p ? 0 : undefined,
                flexGrow: p ? undefined : 1,
                minWidth: p ? undefined : 0
            }
        } else {
            return {
                height: p ? pinSize : undefined,
                maxHeight: p ? '100%' : undefined,
                flexShrink: p ? 0 : undefined,
                flexGrow: p ? undefined : 1,
                minHeight: p ? undefined : 0
            }
        }
    }

    return (
        <div
            className={className}
            style={{
                display: 'flex',
                flexDirection: horizontal ? 'row' : 'column'
            }}
            ref={ref}
        >
            {first && <div style={style(Pin.First)}>{first}</div>}
            {last && (
                <>
                    <div style={horizontal ? hc : vc} className='relative bg-separator'>
                        <div style={horizontal ? hs : vs} onMouseDown={mouseDown as any} />
                    </div>
                    <div style={style(Pin.Last)}>{last}</div>
                </>
            )}
        </div>
    )
}

const hc: React.CSSProperties = {
    width: '1px',
    height: '100%',
    zIndex: 1
}
const vc: React.CSSProperties = {
    width: '100%',
    height: '1px',
    zIndex: 1
}
const hs: React.CSSProperties = {
    width: '11px',
    height: '100%',
    margin: '0 -5px',
    cursor: 'col-resize'
}
const vs: React.CSSProperties = {
    width: '100%',
    height: '11px',
    margin: '-5px 0',
    cursor: 'row-resize'
}

const read = (id: string, persistent: Persistent, minSize: number, defaultSize: number): number => {
    const storage = persistent === Persistent.Temporary ? sessionStorage : localStorage
    const key = 'SplitView-' + id
    return parseIntNumber(storage.getItem(key), Infinity, minSize, defaultSize)
}

const save = (id: string, size: number, persistent: Persistent) => {
    const storage = persistent === Persistent.Temporary ? sessionStorage : localStorage
    const key = 'SplitView-' + id
    storage.setItem(key, size.toString())
}
