import { Tooltip } from '@base-ui/react/tooltip'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { ReactNode, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SWRConfig } from 'swr'
import { restoreWindowZoom } from '../hooks/use-zoom'
import { TauriGlobalEvent } from '../tauri'
import { MessageBox } from '../ui'
import { isLinux, isWindows } from './os'

// Resotre Window Zoom
restoreWindowZoom()

// Render Window
export const render = async (children: ReactNode, external?: ReactNode) => {
    const container = document.querySelector('#root')!
    const App = (
        <Tooltip.Provider delay={1200}>
            <SWRConfig
                value={{
                    shouldRetryOnError: false,
                    revalidateOnFocus: false,
                    revalidateOnReconnect: false
                }}
            >
                <StrictMode>{children}</StrictMode>
            </SWRConfig>
            <MessageBox />
            {external}
        </Tooltip.Provider>
    )

    const root = createRoot(container)
    root.render(App)

    // NOTE: The function returned in useEffect runs on unmount
    // But for cleaning up listeners, listen returns an async function, so cleanup is slower than unlistenAll here
    // This is not a big issue though, it just means the last listener cleanup in useEffect is redundant
    const un = await getCurrentWindow().onCloseRequested(async () => {
        root.unmount()
        await TauriGlobalEvent.unlistenAll()
        await un()
    })
}

// Show Window
getCurrentWindow().show()

// Disable context menu with global
window.addEventListener('contextmenu', (e) => {
    e.preventDefault()
})

// Disable Drop file jump
window.addEventListener('drop', (e) => {
    e.preventDefault()
})
window.addEventListener('dragover', (e) => {
    e.preventDefault()
})

if (isWindows) {
    // Disable F5 refresh
    window.addEventListener('keydown', (e) => {
        if (e.key === 'F5') {
            e.preventDefault()
        }
    })
}

if (isLinux) {
    document.body.classList.add('linux-decoration-border')
}
