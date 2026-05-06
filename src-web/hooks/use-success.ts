import { useCallback, useEffect, useRef, useState } from 'react'

export const useSuccess = () => {
    const [success, setSuccess] = useState(false)
    const timer = useRef<number | null>(null)

    useEffect(() => {
        if (success) {
            timer.current !== null && clearTimeout(timer.current)
            timer.current = setTimeout(() => {
                setSuccess(false)
            }, 1500)
            return () => {
                timer.current !== null && clearTimeout(timer.current)
            }
        }
    }, [success])

    const set = useCallback(() => setSuccess(true), [])

    return [success, set] as const
}
