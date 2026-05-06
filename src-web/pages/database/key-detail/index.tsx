import { lazy, Suspense } from 'react'
import { KeyEntry } from '../hooks/use-store'

export interface KeyDetailProps {
    hidden: boolean
    entry: KeyEntry
}

const LazyComponent = lazy(() => import('./key-detail'))

export const KeyDetail = (props: KeyDetailProps) => {
    return (
        <Suspense>
            <LazyComponent {...props} />
        </Suspense>
    )
}
