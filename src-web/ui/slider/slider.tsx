import { Root, Track, Range, Thumb } from '@radix-ui/react-slider'
import clsx from 'clsx'
import type { SliderProps } from './index'

export default function Slider({ value, min, max, onChange, step, className, onRenderValue }: SliderProps) {
    return (
        <Root
            className={clsx('relative flex h-7', className)}
            value={[value]}
            min={min}
            max={max}
            step={step}
            onValueChange={([n]) => onChange(n)}
        >
            <Track className='relative h-7 grow rounded border border-separator'>
                <Range className='absolute flex h-full items-center rounded bg-zinc-100 indent-2 text-secondary dark:bg-zinc-900'>
                    <span className='text-sm'>{onRenderValue ? onRenderValue(value) : value}</span>
                </Range>
            </Track>
            <Thumb className='mt-1 block h-5 w-1 rounded-sm bg-tertiary' aria-label='Size' />
        </Root>
    )
}
