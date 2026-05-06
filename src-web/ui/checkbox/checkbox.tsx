import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox'
import { IconCheck } from '@tabler/icons-react'
import clsx from 'clsx'
import { CheckboxProps } from './index'

const Checkbox = ({ checked, onChange, className, disabled }: CheckboxProps) => {
    return (
        <BaseCheckbox.Root
            className={clsx(
                'flex size-5 items-center justify-center rounded border border-separator transition data-[checked]:border-theme',
                className
            )}
            checked={checked}
            onCheckedChange={onChange}
            disabled={disabled}
        >
            <BaseCheckbox.Indicator>
                {checked && <IconCheck size={12} className='text-theme' />}
            </BaseCheckbox.Indicator>
        </BaseCheckbox.Root>
    )
}

export default Checkbox
