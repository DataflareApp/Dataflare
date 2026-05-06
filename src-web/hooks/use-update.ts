import { check } from '@tauri-apps/plugin-updater'
import useSWRImmutable from 'swr/immutable'
import { getAppUpdateAvailable, setAppUpdateAvailable } from '../tauri'

export const useCheckUpdate = () => {
    const { data: available, error } = useSWRImmutable('check-update-cache', async () => {
        const cache = await getAppUpdateAvailable()
        if (cache !== null) {
            return cache
        }
        const available = (await check()) !== null
        console.log('Check update', available)
        setAppUpdateAvailable(available)
        return available
    })
    if (import.meta.env.DEV && error) {
        console.error('Checking for app updates failed', error)
    }
    return available ?? false
}
