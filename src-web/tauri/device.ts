import { invoke } from '@tauri-apps/api/core'

export class Device {
    public static hostname(): Promise<string> {
        return invoke('hostname')
    }
    public static fontFamilies(): Promise<string[]> {
        return invoke('font_families')
    }
}
