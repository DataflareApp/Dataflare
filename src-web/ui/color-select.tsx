import clsx from 'clsx'
import { Popover } from './popover'

export interface ColorSelectProps {
    value: string
    onChange: (color: string) => void
    className?: string
}

export const ColorSelect = ({ value, onChange, className }: ColorSelectProps) => {
    return (
        <Popover
            trigger={
                <button className={clsx('h-5 w-10 rounded border border-separator p-0.5', className)}>
                    <div
                        className='size-full rounded-sm'
                        style={{
                            backgroundColor: value
                        }}
                    />
                </button>
            }
            className='grid grid-cols-5 gap-0.5 p-2'
            sideOffset={5}
        >
            <Content value={value} onChange={onChange} />
        </Popover>
    )
}

const Content = ({ value, onChange }: ColorSelectProps) => {
    return (
        <>
            {COLORS.map((color, i) => {
                return (
                    <div
                        key={i}
                        className='h-5 w-7 rounded border border-separator p-px'
                        style={{
                            borderColor: value === color ? color : undefined
                        }}
                        onClick={() => onChange(color)}
                    >
                        <div
                            className='size-full rounded-sm'
                            style={{
                                backgroundColor: color
                            }}
                        />
                    </div>
                )
            })}
            <div className='relative col-span-3 col-start-3 overflow-hidden rounded border border-separator p-px'>
                <div
                    className='size-full rounded-sm'
                    style={{
                        background:
                            'linear-gradient(to right,#ff0000,#ff8000,#ffff00, #00ff00,#0000ff, #8b00ff)'
                    }}
                />
                <input
                    className='absolute left-0 top-0 size-full opacity-0'
                    type='color'
                    onChange={(e) => requestAnimationFrame(() => onChange(e.target.value))}
                />
            </div>
        </>
    )
}

// From: https://tailwindcss.com/docs/customizing-colors -600
const COLORS = [
    '#dc2626',
    '#ea580c',
    '#d97706',
    '#ca8a04',
    '#65a30d',
    '#16a34a',
    '#059669',
    '#0d9488',
    '#0891b2',
    '#0284c7',
    '#2563eb',
    '#4f46e5',
    '#7c3aed',
    '#9333ea',
    '#c026d3',
    '#db2777',
    '#e11d48'
]

export const randomColor = () => {
    const i = Math.floor(Math.random() * COLORS.length)
    return COLORS[i]
}
