import { useCallback } from 'react'
import useSWRImmutable from 'swr/immutable'
import { create } from 'zustand'
import { ClientData, Connection, DatabaseConfig, showActivateWindow } from '../../tauri'
import {
    getLicenseActivated,
    LICENSE_ACTIVATE_SUCCESS,
    setLicenseActivated,
    TauriGlobalEvent
} from '../../tauri'
import { LicenseApi, LicenseStorage } from '../../utils/license'

export const useConnections = () => {
    return useSWRImmutable('connections', () => {
        return ClientData.connectionList()
    })
}

export const useOptions = <T extends DatabaseConfig>(
    data: Connection<T>,
    onChange: React.Dispatch<React.SetStateAction<Connection<T>>>
) => {
    const setName = (newName: string) => {
        onChange((data) => {
            return {
                ...data,
                name: newName
            }
        })
    }

    const setOpt = <K extends keyof T['options']>(key: K, value: T['options'][K]) => {
        onChange((data) => {
            return {
                ...data,
                config: {
                    ...data.config,
                    options: {
                        ...data.config.options,
                        [key]: value
                    }
                }
            }
        })
    }

    return {
        name: data.name,
        options: data.config.options as T['options'],
        setName,
        setOpt
    }
}

export const useActivateStore = create<{
    activated: boolean
}>(() => {
    // By default, consider it verified to prevent issues when offline
    return {
        activated: true
    }
})

getLicenseActivated()
    .then(async (activated) => {
        // Confirm activation was successful
        if (activated) {
            useActivateStore.setState({ activated: true })
            return
        }

        // Received activation success event
        const unlisten = TauriGlobalEvent.listen(LICENSE_ACTIVATE_SUCCESS, () => {
            useActivateStore.setState({ activated: true })
            unlisten.then((un) => un())
        })

        const license = await LicenseStorage.get()

        // No activation info stored locally
        if (license === null) {
            useActivateStore.setState({ activated: false })
            return
        }

        // Verify activation status
        const rst = await LicenseApi.verify(license.key, license.token)
        useActivateStore.setState({ activated: rst.status })

        if (rst.status) {
            setLicenseActivated()
            unlisten.then((un) => un())
        } else {
            LicenseStorage.remove()
        }
    })
    .catch((err) => {
        console.error(`Failed to get license activation status: ${err}`)
    })

export const useCheckCreateConnection = () => {
    const { activated } = useActivateStore()
    const { data: connections } = useConnections()
    return useCallback(
        (count: number) => {
            if (activated) {
                return true
            }
            if (connections === undefined) {
                return true
            }
            const FREE_CONNECTIONS_COUNT = 2
            if (connections.length + count > FREE_CONNECTIONS_COUNT) {
                showActivateWindow()
                return false
            }
            return true
        },
        [activated, connections]
    )
}
