import { useEffect, useRef } from 'react'
import { MessageBoxOption, showMessageBox } from '../ui'

export const useAlertMessage = () => {
    const isMounted = useRef(true)

    useEffect(() => {
        isMounted.current = true
        return () => {
            isMounted.current = false
        }
    }, [])

    return (title: string, msg: string, type: MessageBoxOption['type']) => {
        if (isMounted.current) {
            showMessageBox(title, msg, type)
        }
    }
}
