import { monaco } from '../index'
import { light, dark } from './color'
import './theme.css'

const enum Theme {
    Light = '0',
    Dark = '1'
}

monaco.editor.defineTheme(Theme.Dark, dark)
monaco.editor.defineTheme(Theme.Light, light)

export const medie = window.matchMedia('(prefers-color-scheme: dark)')

export const currentTheme = () => {
    return medie.matches ? Theme.Dark : Theme.Light
}

monaco.editor.setTheme(currentTheme())

medie.addEventListener('change', () => {
    monaco.editor.setTheme(currentTheme())
})
