import { EventCallback, listen, emit } from '@tauri-apps/api/event'

export { emit }

// Tauri does not clean up listeners that will never receive messages when closing a window
// GlobalEventImpl is a simple wrapper around listen
// Mainly to allow cleaning up all remaining listeners via onCloseRequested when the window closes

// Tauri's UnlistenFn definition is incorrect, UnlistenFn is actually an Async Function
export type UnlistenFn = () => Promise<void>

class GlobalEventImpl {
    count = 0
    listeners = new Map<number, UnlistenFn>()

    constructor() {}

    nextID() {
        this.count += 1
        return this.count
    }

    public async listen<T>(name: string, handler: EventCallback<T>): Promise<UnlistenFn> {
        const unlisten = await listen(name, handler)
        const id = this.nextID()
        this.listeners.set(id, unlisten as UnlistenFn)

        return async () => {
            this.listeners.delete(id)
            await unlisten()
        }
    }

    public async unlistenAll() {
        const items = Array.from(this.listeners.values()).map((un) => un())
        await Promise.all(items)
        this.listeners.clear()
    }
}

export const TauriGlobalEvent = new GlobalEventImpl()

export const REFRESH_CONNECTIONS = 'refresh-connections'
export const REFRESH_EDITOR_FONT_OPTIONS = 'refresh-editor-font-options'
export const REFRESH_BYTES_FORMAT = 'refresh-bytes-format'
export const LICENSE_ACTIVATE_SUCCESS = 'license-activate-success'
export const REFRESH_TRANSLATION = 'refresh-translation'
export const REFRESH_TRANSFORM_RULES = 'refresh-transform-rules'
export const REFRESH_AI_MODELS = 'refresh-ai-models'
export const REFRESH_AGENTS = 'refresh-agents'
export const SWITCH_SETTINGS_TAB = 'switch-settings-tab'
