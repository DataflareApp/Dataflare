import { lazy, Suspense } from 'react'

const KeysListLazy = lazy(() => import('./keys'))

export const KeysList = () => {
    return (
        <Suspense>
            <KeysListLazy />
        </Suspense>
    )
}
