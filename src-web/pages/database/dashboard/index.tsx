import { lazy, Suspense } from 'react'

export interface DashboardProps {
    hidden: boolean
}

const LazyDashboard = lazy(() => import('./dashboard'))

export const Dashboard = (props: DashboardProps) => {
    return (
        <Suspense>
            <LazyDashboard {...props} />
        </Suspense>
    )
}
