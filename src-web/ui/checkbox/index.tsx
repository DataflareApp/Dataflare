import { lazy, Suspense } from 'react'

const LazyCheckbox = lazy(() => import('./checkbox'))

export interface CheckboxProps {
    checked: boolean
    onChange: (value: boolean) => void
    className?: string
    disabled?: boolean
}

export const Checkbox = (props: CheckboxProps) => {
    return (
        <Suspense>
            <LazyCheckbox {...props} />
        </Suspense>
    )
}
