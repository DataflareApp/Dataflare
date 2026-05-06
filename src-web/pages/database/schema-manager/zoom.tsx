import { Viewport } from '@xyflow/react'
import { Slider } from '../../../ui'

export const MIN_ZOOM = 0.3
export const MAX_ZOOM = 1.0

export const ZoomSlider = ({
    viewport,
    setViewport
}: {
    viewport: Viewport
    setViewport: (viewport: Viewport) => void
}) => {
    return (
        <Slider
            className='w-32 rounded bg-main'
            value={viewport.zoom * 10}
            min={MIN_ZOOM * 10}
            max={MAX_ZOOM * 10}
            onRenderValue={(val) => `${Math.trunc(val * 10)}%`}
            onChange={(val) => {
                // TODO
                let el = document.querySelector('.react-flow')
                if (!el) return

                let newZoom = val / 10
                let centerX = el.clientWidth / 2
                let centerY = el.clientHeight / 2
                let newX = centerX + (viewport.x - centerX) * (newZoom / viewport.zoom)
                let newY = centerY + (viewport.y - centerY) * (newZoom / viewport.zoom)
                setViewport({ ...viewport, x: newX, y: newY, zoom: newZoom })
            }}
        />
    )
}
