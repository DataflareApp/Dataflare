import { invoke } from '@tauri-apps/api/core'

export const setWaitAppRestart = () => {
    return invoke('set_wait_app_restart')
}

export const getWaitAppRestart = async () => {
    return invoke<boolean>('get_wait_app_restart')
}

export const setAppUpdateAvailable = (available: boolean) => {
    return invoke('set_app_update_available', { available })
}

export const getAppUpdateAvailable = () => {
    return invoke<boolean | null>('get_app_update_available')
}

export const setLicenseActivated = () => {
    return invoke('set_license_activated')
}

export const getLicenseActivated = () => {
    return invoke<boolean | null>('get_license_activated')
}

export const setConnectionsSearch = (value: string) => {
    return invoke('set_connections_search', { value })
}

export const getConnectionsSearch = () => {
    return invoke<string>('get_connections_search')
}
