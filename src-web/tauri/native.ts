import { invoke } from '@tauri-apps/api/core'

export type Theme = 'auto' | 'light' | 'dark'

export function getTheme(): Promise<Theme> {
    return invoke<Theme>('get_theme')
}

export function setTheme(theme: Theme): Promise<void> {
    return invoke('set_theme', {
        theme
    })
}

export function getMacOsTitlebarHeight(): Promise<number> {
    return invoke<number>('get_macos_titlebar_height')
}
