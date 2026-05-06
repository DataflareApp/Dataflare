import { useCallback, useRef } from 'react'

export const useScrollUtils = <T extends HTMLElement = HTMLDivElement>() => {
    const elementRef = useRef<T | null>(null)
    const position = useRef({ left: 0, top: 0 })
    const listenerRef = useRef<(() => void) | null>(null)

    const ref = useCallback((el: T | null) => {
        if (elementRef.current && listenerRef.current) {
            elementRef.current.removeEventListener('scroll', listenerRef.current)
            listenerRef.current = null
        }
        elementRef.current = el
        if (el === null) {
            return
        }
        el.scrollTo(position.current)
        listenerRef.current = () => {
            position.current.left = el.scrollLeft
            position.current.top = el.scrollTop
        }
        el.addEventListener('scroll', listenerRef.current, {
            passive: true
        })
    }, [])

    return ref
}
