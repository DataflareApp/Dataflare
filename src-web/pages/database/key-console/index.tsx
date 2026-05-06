import { lazy, Suspense } from 'react'

export interface KeyConsoleProps {
    hidden: boolean
}

const LazyConsole = lazy(() => import('./console'))

export const KeyConsole = (props: KeyConsoleProps) => {
    return (
        <Suspense>
            <LazyConsole {...props} />
        </Suspense>
    )
}
