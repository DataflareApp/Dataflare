import { getCurrentWindow } from '@tauri-apps/api/window'
import React, { ReactNode, useEffect, useRef, useState } from 'react'
import icon from '../../icons/128x128.png'
import { getMacOsTitlebarHeight } from '../tauri'
import { parseIntNumber } from '../utils/number'
import { isLinux, isMacOS } from '../utils/os'

const useIsMaximized = () => {
    const [maximized, setMaximized] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        getCurrentWindow().isMaximized().then(setMaximized)
        const fn = () => {
            if (timer.current) {
                clearTimeout(timer.current)
            }
            timer.current = setTimeout(() => {
                timer.current = null
                getCurrentWindow().isMaximized().then(setMaximized)
            }, 100)
        }
        const un = getCurrentWindow().onResized(fn)
        return () => {
            un.then((un) => un())
        }
    }, [])

    return maximized
}

const Layout = (props: {
    height: number
    logo?: ReactNode
    title: string
    titleSemibold?: boolean
    actions?: ReactNode
    actionsStyle?: React.CSSProperties
}) => {
    useEffect(() => {
        getCurrentWindow().setTitle(props.title)
    }, [props.title])

    return (
        <div
            data-tauri-drag-region
            className='flex shrink-0 items-center justify-between gap-3 border-b border-separator'
            style={{ height: props.height }}
        >
            <div data-tauri-drag-region className='flex w-1/5 min-w-min grow items-center'>
                {props.logo}
            </div>
            <p
                data-tauri-drag-region
                data-semibold={props.titleSemibold || undefined}
                className='w-3/5 min-w-0 max-w-fit truncate text-[13px] text-secondary data-[semibold]:font-semibold'
            >
                {props.title}
            </p>
            <div
                data-tauri-drag-region
                className='flex w-1/5 min-w-min grow items-center justify-end'
                style={props.actionsStyle}
            >
                {props.actions}
            </div>
        </div>
    )
}

interface TitlebarProps {
    title: string
    titleSemibold?: boolean
    minimizable?: boolean
    maximizable?: boolean
    children?: ReactNode
}

const MacOsTitlebar = ({ title, titleSemibold, children }: TitlebarProps) => {
    // macOS 26 titlebar height
    const defaultHeight = 32
    const key = 'macos-titlebar-height'

    const [height, setHeight] = useState(() => {
        const v = localStorage.getItem(key)
        return parseIntNumber(v, defaultHeight * 2, defaultHeight / 2, defaultHeight)
    })

    useEffect(() => {
        getMacOsTitlebarHeight().then((n) => {
            if (height !== n) {
                setHeight(n)
                localStorage.setItem(key, n.toString())
            }
        })
    }, [])

    return (
        <Layout
            height={height}
            title={title}
            titleSemibold={titleSemibold ?? true}
            actions={children}
            actionsStyle={{ paddingRight: '16px' }}
        />
    )
}

const WindowsTitleBar = ({ title, minimizable, maximizable, children }: TitlebarProps) => {
    const maximized = useIsMaximized()

    const logo = <img data-tauri-drag-region src={icon} className='pointer-events-none ml-2 size-4' />

    const actions = (
        <>
            {children && <div className='mr-2 flex items-center'>{children}</div>}
            {minimizable !== false && (
                <button
                    className='h-full !outline-none transition hover:bg-black/10 dark:hover:bg-white/10'
                    style={{ width: '46px' }}
                    onClick={() => getCurrentWindow().minimize()}
                >
                    {'\uE921'}
                </button>
            )}
            {maximizable !== false && (
                <button
                    className='h-full w-[46px] !outline-none transition hover:bg-black/10 dark:hover:bg-white/10'
                    style={{ width: '46px' }}
                    onClick={() => getCurrentWindow().toggleMaximize()}
                >
                    {maximized ? '\uE923' : '\uE922'}
                </button>
            )}
            <button
                className='h-full !outline-none transition hover:bg-[#c42b1c] hover:text-white'
                style={{ width: '46px' }}
                onClick={() => getCurrentWindow().close()}
            >
                {'\uE8BB'}
            </button>
        </>
    )

    return (
        <Layout
            height={29}
            logo={logo}
            title={title}
            actions={actions}
            actionsStyle={{
                height: '100%',
                fontFamily: "'Segoe Fluent Icons', 'Segoe MDL2 Assets'",
                fontSize: '10px',
                fontWeight: 300
            }}
        />
    )
}

const LinuxTitlebar = ({ title, minimizable, maximizable, children }: TitlebarProps) => {
    const maximized = useIsMaximized()

    const logo = <img data-tauri-drag-region src={icon} className='pointer-events-none ml-3 size-4' />

    const actions = (
        <>
            {children && <div className='flex items-center'>{children}</div>}
            {minimizable !== false && (
                <button
                    className='flex size-6 items-center justify-center rounded-full bg-black/5 !outline-none transition hover:bg-black/10 active:bg-black/20 dark:bg-white/5 dark:hover:bg-white/10 dark:active:bg-white/20'
                    onClick={() => getCurrentWindow().minimize()}
                >
                    <svg viewBox='0 0 16 16' className='size-4 fill-neutral-700 dark:fill-neutral-300'>
                        <path d='m 4 10.007812 h 8 v 1.988282 h -8 z m 0 0' />
                    </svg>
                </button>
            )}
            {maximizable !== false && (
                <button
                    className='flex size-6 items-center justify-center rounded-full bg-black/5 !outline-none transition hover:bg-black/10 active:bg-black/20 dark:bg-white/5 dark:hover:bg-white/10 dark:active:bg-white/20'
                    onClick={() => getCurrentWindow().toggleMaximize()}
                >
                    <svg viewBox='0 0 16 16' className='size-4 fill-neutral-700 dark:fill-neutral-300'>
                        {maximized ? (
                            <path d='m 4.988281 4.992188 v 6.011718 h 6.011719 v -6.011718 z m 2 2 h 2.011719 v 2.011718 h -2.011719 z m 0 0' />
                        ) : (
                            <path d='m 3.988281 3.992188 v 8.011718 h 8.011719 v -8.011718 z m 2 2 h 4.011719 v 4.011718 h -4.011719 z m 0 0' />
                        )}
                    </svg>
                </button>
            )}
            <button
                className='mr-3 flex size-6 items-center justify-center rounded-full bg-black/5 !outline-none transition hover:bg-black/10 active:bg-black/20 dark:bg-white/5 dark:hover:bg-white/10 dark:active:bg-white/20'
                onClick={() => getCurrentWindow().close()}
            >
                <svg viewBox='0 0 16 16' className='size-4 fill-neutral-700 dark:fill-neutral-300'>
                    <path d='m 4 4 h 1 h 0.03125 c 0.253906 0.011719 0.511719 0.128906 0.6875 0.3125 l 2.28125 2.28125 l 2.3125 -2.28125 c 0.265625 -0.230469 0.445312 -0.304688 0.6875 -0.3125 h 1 v 1 c 0 0.285156 -0.035156 0.550781 -0.25 0.75 l -2.28125 2.28125 l 2.25 2.25 c 0.1875 0.1875 0.28125 0.453125 0.28125 0.71875 v 1 h -1 c -0.265625 0 -0.53125 -0.09375 -0.71875 -0.28125 l -2.28125 -2.28125 l -2.28125 2.28125 c -0.1875 0.1875 -0.453125 0.28125 -0.71875 0.28125 h -1 v -1 c 0 -0.265625 0.09375 -0.53125 0.28125 -0.71875 l 2.28125 -2.25 l -2.28125 -2.28125 c -0.210938 -0.195312 -0.304688 -0.46875 -0.28125 -0.75 z m 0 0' />
                </svg>
            </button>
        </>
    )

    return (
        <Layout
            height={32}
            logo={logo}
            title={title}
            titleSemibold
            actions={actions}
            actionsStyle={{ gap: '12px' }}
        />
    )
}

export const Titlebar = isMacOS ? MacOsTitlebar : isLinux ? LinuxTitlebar : WindowsTitleBar
