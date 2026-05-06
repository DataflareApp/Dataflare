import { invoke } from '@tauri-apps/api/core'

export const setPassword = (user: string, password: string) => {
    return invoke<void>('set_password', {
        user,
        password
    })
}

export const getPassword = (user: string) => {
    return invoke<string>('get_password', {
        user
    })
}

export const deletePassword = (user: string) => {
    return invoke<void>('delete_password', {
        user
    })
}
