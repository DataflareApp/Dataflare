import { invoke } from '@tauri-apps/api/core'

export interface UrlOption {
    scheme: string
    host: string | null
    username: string
    password: string | null
    port: number | null
    path: string
    query: {
        [key: string]: string | undefined
    }
}

export function decodeURL(url: string): Promise<UrlOption> {
    return invoke('decode_url', { url })
}

export function encodeURL(option: UrlOption): Promise<string> {
    return invoke('encode_url', { option })
}
