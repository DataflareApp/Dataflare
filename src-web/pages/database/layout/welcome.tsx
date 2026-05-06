import clsx from 'clsx'
import { memo } from 'react'

export const Welcome = memo(({ size }: { size: 'small' | 'large' }) => {
    return (
        <div
            data-tauri-drag-region
            className='flex size-full flex-col items-center justify-center overflow-hidden p-4'
        >
            {/* LOGO */}
            <svg
                data-tauri-drag-region
                className={clsx('fill-neutral-100 dark:fill-[#3d3d3d33]', size === 'small' ? 'w-32' : 'w-40')}
                viewBox='0 0 550 550'
            >
                <path
                    data-tauri-drag-region
                    d='M275 7L495.533 113.161L550 351.704L275 275.5L397.387 543H152.613L0 351.704L54.4671 113.161L275 275.5V7Z'
                />
            </svg>
        </div>
    )
})
