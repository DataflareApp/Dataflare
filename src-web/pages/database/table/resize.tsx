import { forwardRef, Children, ReactNode, Ref, useRef } from 'react'
import { SPLIT_DRAGGING_CLASS } from '../../../ui/split'

export interface ResizeViewProps {
    saveName: string
    columns: {
        name: string
        defaultSize: number
        minSize: number
    }[]
    children: ReactNode
    sizes: SizeMap
    onChangeSize: (sizes: SizeMap) => void
}

export const ResizeView = forwardRef(
    ({ saveName, sizes, columns, children, onChangeSize }: ResizeViewProps, ref: Ref<HTMLDivElement>) => {
        const childrens = Children.toArray(children)

        const start = useRef({
            key: '',
            originSize: 0,
            clientX: 0
        })

        const startListener = () => {
            document.body.classList.add(SPLIT_DRAGGING_CLASS.col)
            let latestSize = { ...sizes }

            const move = (e: MouseEvent) => {
                const newVal = e.clientX - start.current.clientX + start.current.originSize
                const key = start.current.key
                const item = columns.find((item) => item.name === key)
                if (item !== undefined && newVal >= item.minSize) {
                    latestSize = { ...sizes, [key]: newVal }
                    onChangeSize(latestSize)
                }
            }

            window.addEventListener('mousemove', move, { passive: true })
            window.addEventListener(
                'mouseup',
                () => {
                    window.removeEventListener('mousemove', move)
                    document.body.classList.remove(SPLIT_DRAGGING_CLASS.col)
                    saveSize(saveName, latestSize)
                },
                { once: true }
            )
        }

        return (
            <div
                ref={ref}
                className='flex h-8 flex-row overflow-hidden border-b border-separator bg-zinc-100 pr-32 dark:bg-zinc-900'
            >
                {childrens.map((child, index) => {
                    const col = columns[index]
                    const width = sizes[col.name] || col.defaultSize
                    return (
                        <div
                            key={index}
                            className='relative h-full shrink-0'
                            style={{
                                width
                            }}
                        >
                            {child}
                            <div className='absolute -bottom-px right-0 top-0 z-10 w-px translate-x-1/2 bg-separator'>
                                <div
                                    className='h-full w-3 -translate-x-1/2 cursor-col-resize'
                                    onMouseDown={(e) => {
                                        start.current = {
                                            key: col.name,
                                            originSize: width,
                                            clientX: e.clientX
                                        }
                                        startListener()
                                    }}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }
)

export type SizeMap = {
    [column: string]: number
}

export const saveSize = (name: string, size: SizeMap) => {
    sessionStorage.setItem(`ResizeView-${name}`, JSON.stringify(size))
}

export const getSavedSize = (name: string): SizeMap => {
    try {
        const value = sessionStorage.getItem(`ResizeView-${name}`)
        if (value !== null) {
            const items = JSON.parse(value)
            if (typeof items === 'object') {
                return items
            }
        }
    } catch (_) {}
    return {}
}
