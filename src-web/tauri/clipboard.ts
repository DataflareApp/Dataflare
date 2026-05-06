import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager'

export { readText as readClipboardText }

export const writeClipboardText = async (text: string): Promise<void> => {
    try {
        await navigator.clipboard.writeText(text)
    } catch (_) {
        await writeText(text)
    }
}
