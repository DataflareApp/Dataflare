import { Switch as BSwitch } from '@base-ui/react/switch'

interface SwitchProps {
    checked: boolean
    onChange?: (enabled: boolean) => void
}

export function Switch({ checked, onChange }: SwitchProps) {
    return (
        <BSwitch.Root
            checked={checked}
            onCheckedChange={onChange}
            className='relative flex h-6 w-10 rounded-full bg-neutral-200 p-0.5 transition active:bg-neutral-300 data-[checked]:bg-theme data-[checked]:active:bg-theme/70 dark:bg-neutral-700 dark:active:bg-neutral-600'
        >
            <BSwitch.Thumb className='aspect-square h-full rounded-full bg-white transition-transform data-[checked]:translate-x-4' />
        </BSwitch.Root>
    )
}
