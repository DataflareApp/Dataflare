import { lazy, Suspense } from 'react'

export interface ManagerProps {
    hidden: boolean
}

const LazyComponent = lazy(() => import('./manager'))

export const TriggerManager = (props: ManagerProps) => {
    return (
        <Suspense>
            <LazyComponent {...props} />
        </Suspense>
    )
}
