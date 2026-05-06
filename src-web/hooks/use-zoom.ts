import { getAllWebviews } from '@tauri-apps/api/webview'
import { useState } from 'react'

const MAX_ZOOM = 200
const MIN_ZOOM = 80

const Storage = {
    get zoom(): number {
        let val = parseInt(localStorage.getItem('zoom') ?? '100')
        if (Number.isInteger(val) && val >= MIN_ZOOM && val <= MAX_ZOOM) {
            return val
        }
        return 100
    },
    set zoom(zoom: number) {
        localStorage.setItem('zoom', zoom.toString())
    }
}

const setAllWindowZoom = (zoom: number) => {
    getAllWebviews().then((webviews) => {
        webviews.forEach((webview) => {
            webview.setZoom(zoom)
        })
    })
}

export const restoreWindowZoom = () => {
    const zoom = Storage.zoom
    if (zoom / 100 !== 1) {
        setAllWindowZoom(zoom / 100)
    }
}

export const useZoom = () => {
    const [zoom, setZoom] = useState(() => {
        return Storage.zoom
    })
    const update = (zoom: number) => {
        setZoom(zoom)
        setAllWindowZoom(zoom / 100)
        Storage.zoom = zoom
    }
    return {
        zoom,
        zoomIn: () => {
            update(Math.min(Math.max(zoom + 10, MIN_ZOOM), MAX_ZOOM))
        },
        zoomOut: () => {
            update(Math.min(Math.max(zoom - 10, MIN_ZOOM), MAX_ZOOM))
        }
    }
}
