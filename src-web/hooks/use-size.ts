import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface Size {
    width: number
    height: number
}

export const useElementSize = <T extends HTMLElement = any>() => {
    const frameID = useRef(0)
    const ref = useRef<T>(null)
    const [size, setSize] = useState<Size | undefined>(undefined)

    const observer = useMemo(() => {
        return new ResizeObserver((entries) => {
            const entry = entries[0]
            if (entry) {
                cancelAnimationFrame(frameID.current)
                frameID.current = requestAnimationFrame(() => {
                    if (ref.current) {
                        setSize(entry.contentRect)
                    }
                })
            }
        })
    }, [])

    useEffect(() => {
        if (ref.current) {
            observer?.observe(ref.current)
        }
        return () => {
            observer?.disconnect()
            if (frameID.current) {
                cancelAnimationFrame(frameID.current)
            }
        }
    }, [ref.current])

    return {
        ref,
        size
    } as const
}

export const useElementHeight = () => {
    const [height, setHeight] = useState(0)
    const observer = useRef<ResizeObserver | null>(null)

    const ref = useCallback((el: HTMLDivElement | null) => {
        if (el === null) {
            observer.current?.disconnect()
            observer.current = null
            return
        }
        observer.current = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setHeight(entry.borderBoxSize[0].blockSize)
            }
        })
        observer.current.observe(el)
    }, [])

    return {
        height,
        ref
    }
}

const saveSize = (key: string, { width, height }: Size) => {
    sessionStorage.setItem(key, `${width},${height}`)
}

const readSize = (key: string): Partial<Size> => {
    const value = sessionStorage.getItem(key)
    if (value !== null) {
        const [width, height] = value.split(',').map(Number)
        if (!isNaN(width) && !isNaN(height)) {
            return { width, height }
        }
    }
    return { width: undefined, height: undefined }
}

export const useElementStoreSize = (savedID: string) => {
    const observer = useRef<ResizeObserver | null>(null)

    const ref = useCallback(
        (el: HTMLTextAreaElement | null) => {
            if (el === null) {
                observer.current?.disconnect()
                observer.current = null
                return
            }
            observer.current = new ResizeObserver((entries) => {
                const { inlineSize: width, blockSize: height } = entries[0].borderBoxSize[0]
                saveSize(savedID, { width, height })
            })
            observer.current.observe(el)
        },
        [savedID]
    )

    const defaultSize = useMemo(() => {
        return readSize(savedID)
    }, [savedID])

    return { ref, defaultSize }
}
