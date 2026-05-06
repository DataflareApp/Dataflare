import { lazy, Suspense } from 'react'

export interface ManagerProps {
    hidden: boolean
}

const LazyComponent = lazy(() => import('./manager'))

export const ExtensionManager = (props: ManagerProps) => {
    return (
        <Suspense>
            <LazyComponent {...props} />
        </Suspense>
    )
}
