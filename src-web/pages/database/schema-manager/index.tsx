import { lazy, Suspense } from 'react'

export interface ManagerProps {
    defaultSchema?: string
    hidden: boolean
}

const LazyManager = lazy(() => import('./manager'))

export const SchemaManager = (props: ManagerProps) => {
    return (
        <Suspense>
            <LazyManager {...props} />
        </Suspense>
    )
}
