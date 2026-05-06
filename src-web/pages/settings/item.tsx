import { ReactNode } from 'react'

export const SettingsGroup = ({
    name,
    desc,
    children
}: {
    name: string
    desc?: string
    children: ReactNode
}) => {
    return (
        <>
            <div className='mb-3 mt-5 px-4'>
                <h2 className='text-sm font-medium text-primary'>{name}</h2>
                {desc !== undefined && <p className='text-xs text-tertiary'>{desc}</p>}
            </div>
            <div className='mx-4 rounded-md border border-separator px-3'>{children}</div>
        </>
    )
}

export const SettingsItem = ({ name, children }: { name: string; children: ReactNode }) => {
    return (
        <div className='flex items-center justify-between gap-3 border-b border-gray-100 py-2 last:border-none dark:border-neutral-900'>
            <span className='mr-auto whitespace-nowrap text-xs text-secondary'>{name}</span>
            {children}
        </div>
    )
}
