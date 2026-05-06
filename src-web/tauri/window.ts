import { invoke } from '@tauri-apps/api/core'
import type { Connection } from './client'

export const showConnectionsWindow = () => {
    return invoke('show_connections_window')
}

export const enum SettingsTab {
    General = 'general',
    Editor = 'editor',
    Table = 'table',
    Providers = 'providers',
    Agents = 'agents',
    KeyboardShortcuts = 'keyboard-shortcuts'
}

export const showSettingsWindow = (tab?: SettingsTab) => {
    return invoke('show_settings_window', { tab })
}

export const showActivateWindow = () => {
    return invoke('show_activate_window')
}

export const showBackupWindow = (connection: Connection) => {
    return invoke('show_backup_window', {
        connection
    })
}

export const newDatabaseWindow = (
    connection: Connection,
    closeConnectionsWindow: boolean,
    reopenIfExists: boolean
): Promise<void> => {
    return invoke('new_database_window', {
        connection,
        closeConnectionsWindow,
        reopenIfExists
    })
}
