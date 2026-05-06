import { lazy, Suspense } from 'react'

export interface ManagerProps {
    hidden: boolean
}

const LazyComponent = lazy(() => import('./manager'))

export const FunctionManager = (props: ManagerProps) => {
    return (
        <Suspense>
            <LazyComponent {...props} />
        </Suspense>
    )
}
