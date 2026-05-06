import { IconSunHigh, IconDeviceDesktop, IconMoonStars } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { getTheme, Theme, setTheme } from '../../../tauri'
import { SelectButton } from '../../../ui'

const options: { value: Theme; icon: JSX.Element }[] = [
    { value: 'auto', icon: <IconDeviceDesktop size={16} stroke={1.6} /> },
    { value: 'light', icon: <IconSunHigh size={16} stroke={1.7} /> },
    { value: 'dark', icon: <IconMoonStars size={16} stroke={1.6} /> }
]

export const AppearanceSetting = () => {
    const [currentTheme, setCurrentTheme] = useState<Theme | null>(null)

    useEffect(() => {
        getTheme().then(setCurrentTheme)
    }, [])

    const update = (theme: Theme) => {
        setTheme(theme)
        setCurrentTheme(theme)
    }

    return (
        <div className='grid w-48 grid-cols-3 gap-2 text-tertiary'>
            {options.map((item) => {
                return (
                    <SelectButton
                        key={item.value}
                        selected={currentTheme === item.value}
                        onClick={() => update(item.value)}
                    >
                        {item.icon}
                    </SelectButton>
                )
            })}
        </div>
    )
}
