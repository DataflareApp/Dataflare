import * as RadixDropdownMenu from '@radix-ui/react-dropdown-menu'
// import { IconChevronRight } from '@tabler/icons-react'
import clsx from 'clsx'
import React, { ReactNode, cloneElement, forwardRef } from 'react'

// import { ScrollView } from './scrollview'

export const dropdownMenuSize: React.CSSProperties = {
    maxHeight: 'calc(var(--radix-dropdown-menu-content-available-height) - 32px)'
}

export const DropdownMenuSeparator = () => {
    return <RadixDropdownMenu.Separator className='mx-2 my-1 border-b border-separator' />
}

export const DropdownMenuLabel = ({ label }: { label: string }) => {
    return (
        <RadixDropdownMenu.Label className='h-6 px-4 text-xs leading-6 text-quarternary'>
            {label}
        </RadixDropdownMenu.Label>
    )
}

// export const DropdownMenuSub = ({ trigger, children }: { trigger: ReactNode; children: ReactNode }) => {
//     return (
//         <RadixDropdownMenu.Sub>
//             <RadixDropdownMenu.SubTrigger className='flex h-7 items-center gap-2 rounded-sm px-4 text-[13px] text-secondary outline-none data-[highlighted]:bg-neutral-200 data-[state=open]:bg-neutral-200 dark:data-[highlighted]:bg-zinc-800/80 dark:data-[state=open]:bg-zinc-800/80'>
//                 {trigger}
//                 <IconChevronRight size={16} className='ml-auto' />
//             </RadixDropdownMenu.SubTrigger>
//             <RadixDropdownMenu.Portal>
//                 <RadixDropdownMenu.SubContent
//                     className='z-20 rounded border border-separator bg-main/80 shadow-lg backdrop-blur'
//                     sideOffset={2}
//                     alignOffset={-5}
//                     collisionPadding={16}
//                 >
//                     <ScrollView axis='y' viewportClassName='max-h-[50vh] p-1'>
//                         {children}
//                     </ScrollView>
//                 </RadixDropdownMenu.SubContent>
//             </RadixDropdownMenu.Portal>
//         </RadixDropdownMenu.Sub>
//     )
// }

export const DropdownMenuItem = ({
    children,
    onClick,
    className,
    disabled = false
}: {
    children: ReactNode
    className?: string
    disabled?: boolean
    onClick: () => void
}) => {
    return (
        <RadixDropdownMenu.Item
            className={clsx(
                'flex h-7 items-center rounded-sm px-4 text-[13px] text-secondary outline-none data-[highlighted]:bg-neutral-200 data-[disabled]:text-quarternary dark:data-[highlighted]:bg-zinc-800/80',
                className
            )}
            onSelect={onClick}
            disabled={disabled}
        >
            {children}
        </RadixDropdownMenu.Item>
    )
}

export const DropdownMenu = forwardRef(
    (
        {
            className,
            trigger,
            children,
            style,
            sideOffset = 2,
            open,
            onOpenChange
        }: {
            className?: string
            trigger: JSX.Element
            children: ReactNode
            style?: React.CSSProperties
            sideOffset?: RadixDropdownMenu.DropdownMenuContentProps['sideOffset']
            open?: boolean
            onOpenChange?: (open: boolean) => void
        },
        ref
    ) => {
        const refTrigger = cloneElement(trigger, { ref })
        return (
            <RadixDropdownMenu.Root open={open} onOpenChange={onOpenChange}>
                <RadixDropdownMenu.Trigger asChild>{refTrigger}</RadixDropdownMenu.Trigger>
                <RadixDropdownMenu.Portal>
                    <RadixDropdownMenu.Content
                        className={clsx(
                            'z-10 rounded border border-separator bg-main/80 p-1 shadow-lg backdrop-blur data-[state=open]:animate-dropdownIn',
                            className
                        )}
                        style={style}
                        sideOffset={sideOffset}
                        align='start'
                        collisionPadding={16}
                    >
                        {children}
                    </RadixDropdownMenu.Content>
                </RadixDropdownMenu.Portal>
            </RadixDropdownMenu.Root>
        )
    }
)
