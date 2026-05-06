import { isMacOS } from '../utils/os'

export enum KeyModifier {
    Meta,
    Opt,
    Shift,
    Enter
}

export const keyborardKey = (key: KeyModifier | string) => {
    switch (key) {
        case KeyModifier.Meta:
            return isMacOS ? '⌘' : 'Ctrl'
        case KeyModifier.Opt:
            return isMacOS ? '⌥' : 'Alt'
        case KeyModifier.Shift:
            return isMacOS ? '⇧' : 'Shift'
        case KeyModifier.Enter:
            return 'Enter'
        default: {
            return key
        }
    }
}

export const keyboardTitleChars = (title: string, keys: (KeyModifier | string)[]) => {
    const chars = keys.map(keyborardKey).join(isMacOS ? '' : '+')
    return `${title} (${chars})`
}
