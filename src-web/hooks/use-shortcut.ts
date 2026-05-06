import { getCurrentWindow } from '@tauri-apps/api/window'
import { useEffect, useInsertionEffect, useRef } from 'react'
import { showConnectionsWindow } from '../tauri'
import { isMacOS } from '../utils/os'

export const shortcutCloseWindowAndShowConnections = () => {
    window.addEventListener('keydown', (e) => {
        if (!e.shiftKey && (isMacOS ? e.metaKey : e.ctrlKey)) {
            switch (e.key.toLowerCase()) {
                case 'w': {
                    e.preventDefault()
                    e.stopPropagation()
                    getCurrentWindow().close()
                    return
                }
                case 'n': {
                    e.preventDefault()
                    e.stopPropagation()
                    showConnectionsWindow()
                    return
                }
            }
        }
    })
}

export const useShortcutMeta = (
    keys: string,
    fn: (key: string, shift: boolean) => void,
    disabled = false
) => {
    const fnRef = useRef(fn)
    useInsertionEffect(() => {
        fnRef.current = fn
    })
    useEffect(() => {
        if (disabled) {
            return
        }
        const keyChars = keys.split(',').map((item) => item.toLowerCase())
        const keydown = (e: KeyboardEvent) => {
            if (isMacOS ? e.metaKey : e.ctrlKey) {
                const key = e.key.toLowerCase()
                if (keyChars.includes(key)) {
                    e.preventDefault()
                    e.stopPropagation()
                    fnRef.current(key, e.shiftKey)
                }
            }
        }
        window.addEventListener('keydown', keydown)
        return () => {
            window.removeEventListener('keydown', keydown)
        }
    }, [keys, disabled])
}

export const useShortcutMetaNumber = (fn: (n: number) => void) => {
    useEffect(() => {
        const keydown = (e: KeyboardEvent) => {
            if (isMacOS ? e.metaKey : e.ctrlKey) {
                const n = parseInt(e.key)
                if (Number.isInteger(n)) {
                    e.preventDefault()
                    e.stopPropagation()
                    fn(n)
                }
            }
        }
        window.addEventListener('keydown', keydown)
        return () => {
            window.removeEventListener('keydown', keydown)
        }
    }, [fn])
}
