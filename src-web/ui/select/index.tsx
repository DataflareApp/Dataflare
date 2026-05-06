import { lazy, Suspense } from 'react'
import { isMacOS } from '../../utils/os'

const NativeSelect = lazy(() => import('./native'))
const RadixSelect = lazy(() => import('./radix'))

export interface SelectProps {
    className?: string
    options: {
        value: string
        name: string
    }[]
    value: string
    onChange: (value: string) => void
}

export const Select = (props: SelectProps) => {
    if (isMacOS) {
        return (
            <Suspense>
                <NativeSelect {...props} />
            </Suspense>
        )
    } else {
        return (
            <Suspense>
                <RadixSelect {...props} />
            </Suspense>
        )
    }
}
