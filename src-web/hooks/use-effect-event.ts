import { useCallback, useInsertionEffect, useRef } from 'react'

export const useEffectEvent = <T extends (...args: any[]) => any>(fn: T): T => {
    const ref = useRef(fn)
    useInsertionEffect(() => {
        ref.current = fn
    })
    return useCallback((...args: Parameters<T>) => {
        const f = ref.current
        return f(...args)
    }, []) as T
}
