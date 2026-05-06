import { IconSelector } from '@tabler/icons-react'
import { clsx } from 'clsx'
import { SelectProps } from './index'

const Select = ({ className, options, value, onChange }: SelectProps) => {
    return (
        <div className={clsx(className, 'relative flex h-7 items-center text-secondary')}>
            <IconSelector size={16} strokeWidth={1.6} className='absolute right-2' />
            <select
                className='absolute inset-0 appearance-none truncate rounded border border-separator bg-transparent pr-6 indent-2 text-sm'
                onChange={(e) => onChange(e.target.value)}
                value={value}
            >
                {options.map((item) => {
                    return (
                        <option key={item.value} value={item.value} className='bg-main text-secondary'>
                            {item.name}
                        </option>
                    )
                })}
            </select>
        </div>
    )
}

export default Select
