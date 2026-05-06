import { lazy, Suspense } from 'react'

const Component = lazy(() => import('./slider'))

export interface SliderProps {
    value: number
    min: number
    max: number
    step?: number
    onChange: (value: number) => void
    className?: string
    onRenderValue?: (value: number) => string
}

export const Slider = (props: SliderProps) => {
    return (
        <Suspense>
            <Component {...props} />
        </Suspense>
    )
}
