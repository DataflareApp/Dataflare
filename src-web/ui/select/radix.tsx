import {
    Root,
    Trigger,
    Value,
    Portal,
    Content,
    ScrollDownButton,
    ScrollUpButton,
    Viewport,
    Item,
    ItemText,
    ItemIndicator
} from '@radix-ui/react-select'
import { IconCheck, IconChevronDown, IconChevronUp, IconSelector } from '@tabler/icons-react'
import { clsx } from 'clsx'
import { SelectProps } from './index'

// NOTE: Radix's SelectItem component value cannot be an "empty string", using a placeholder instead
const EMPTY_VALUE = '__EMPTY_TEXT_PLACEHOLDER'

const Select = ({ className, options, value, onChange }: SelectProps) => {
    return (
        <Root value={value === '' ? EMPTY_VALUE : value} onValueChange={onChange}>
            <Trigger
                className={clsx(
                    className,
                    'relative flex h-7 items-center rounded border border-separator px-2 text-sm text-secondary'
                )}
            >
                <div className='flex-1 truncate text-left'>
                    <Value />
                </div>
                <IconSelector size={16} strokeWidth={1.6} />
            </Trigger>
            <Portal>
                <Content className='z-10 rounded border border-separator bg-main/80 shadow-lg backdrop-blur data-[state=open]:animate-overlayIn'>
                    <ScrollUpButton className='flex h-6 items-center justify-center'>
                        <IconChevronUp size={16} />
                    </ScrollUpButton>
                    <Viewport className='p-1'>
                        {options.map((item) => {
                            return (
                                <Item
                                    key={item.value}
                                    value={item.value === '' ? EMPTY_VALUE : item.value}
                                    className='relative flex h-7 items-center rounded-sm pl-8 pr-4 text-sm text-secondary outline-none data-[highlighted]:bg-neutral-200 dark:data-[highlighted]:bg-zinc-800/80'
                                >
                                    <ItemText>{item.name}</ItemText>
                                    <ItemIndicator className='absolute left-2'>
                                        <IconCheck size={16} />
                                    </ItemIndicator>
                                </Item>
                            )
                        })}
                    </Viewport>
                    <ScrollDownButton className='flex h-6 items-center justify-center'>
                        <IconChevronDown size={16} />
                    </ScrollDownButton>
                </Content>
            </Portal>
        </Root>
    )
}

export default Select
