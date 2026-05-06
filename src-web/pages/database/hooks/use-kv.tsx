import { save } from '@tauri-apps/plugin-dialog'
import { revealItemInDir } from '@tauri-apps/plugin-opener'
import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import useSWRImmutable from 'swr/immutable'
import useSWRInfinite from 'swr/infinite'
import useSWRMutation from 'swr/mutation'
import { useTranslation } from '../../../i18n'
import { Database, GenericValue, Key, Keys, KvDatabaseType, NameSpace } from '../../../tauri'
import { showMessageBox } from '../../../ui'
import { formatTTL } from '../../../utils/format'
import { writeFileToSelectPath } from '../../../utils/fs'
import { valueToFileContent } from '../utils/kv'
import { KeyEntry, TabType, useConnectedID, useConnectID, useConnection, useTabsStore } from './use-store'

export const useNamespaces = () => {
    const connectedID = useConnectedID()
    const key = connectedID === null ? null : (['namespaces', connectedID] as const)
    return useSWRImmutable(key, () => {
        return Database.kv.namespaces()
    })
}

export const useNamespaceOptions = () => {
    const { data } = useNamespaces()
    return useMemo(() => {
        return (data ?? []).map((item) => {
            return {
                name: item.title ?? item.id,
                value: item.id
            }
        })
    }, [data])
}

export const useKeys = (namespace: string | null, search: string) => {
    return useSWRInfinite(
        (_pageIndex, previousPageData: Keys | undefined) => {
            if (namespace === null) {
                return null
            }
            if (previousPageData && previousPageData.cursor === null) {
                return null
            }
            const cursor = previousPageData?.cursor ?? null
            return [namespace, cursor, search] as const
        },
        ([namespace, cursor, search]) => {
            return Database.kv.keys(namespace, cursor, search === '' ? null : search)
        },
        { revalidateFirstPage: false }
    )
}

export const useGet = (namespace: NameSpace, key: Key) => {
    const connectID = useConnectID()
    return useSWR(['get', connectID, namespace.id, key] as const, async ([_, _id, namespace, key]) => {
        const start = Date.now()
        try {
            const data = await Database.kv.get(namespace, key)
            const now = Date.now()
            return {
                data: data,
                duration: now - start,
                start
            }
        } catch (error) {
            const now = Date.now()
            throw {
                error: error,
                duration: now - start,
                start
            }
        }
    })
}

export const useDelete = () => {
    const { t, tf } = useTranslation()
    const closeTab = useTabsStore((s) => s.closeTab)
    const { trigger } = useSWRMutation('delete', async (_, { arg }: { arg: KeyEntry }) => {
        return Database.kv.delete(arg.namespace.id, arg.key)
    })
    return (namespace: NameSpace, key: Key, successCallback: () => void) => {
        const action = {
            label: t('delete'),
            primary: true,
            onClick: async () => {
                try {
                    await trigger({ namespace, key })
                    successCallback()
                    closeTab({
                        type: TabType.KeyDetail,
                        entry: {
                            namespace,
                            key
                        }
                    })
                } catch (err: any) {
                    showMessageBox(t('deleteFailed'), err, 'error')
                }
            }
        }
        showMessageBox(t('delete'), tf('deleteMessage', key.value), 'delete', action)
    }
}

export const useDownload = () => {
    const { t } = useTranslation()

    type Arg = KeyEntry & {
        value: GenericValue | null
    }

    return useSWRMutation('download', async (_, { arg }: { arg: Arg }) => {
        const options = {
            defaultPath: arg.key.value
        }
        if (arg.value !== null) {
            let v = arg.value
            await writeFileToSelectPath(options, () => valueToFileContent(v))
            return
        }
        try {
            const path = await save(options)
            if (path === null) return
            await Database.kv.downloadContent(arg.namespace.id, arg.key, path)
            revealItemInDir(path)
        } catch (err: any) {
            showMessageBox(t('exportFailed'), err, 'error')
        }
    })
}

export const useExpiration = (ms: number) => {
    const { relativeTimeUtil } = useTranslation()
    const [ago, setAgo] = useState(() => formatTTL(ms, relativeTimeUtil))

    useEffect(() => {
        setAgo(formatTTL(ms, relativeTimeUtil))
        const timer = setInterval(() => {
            setAgo(formatTTL(ms, relativeTimeUtil))
        }, 1000)
        return () => {
            clearInterval(timer)
        }
    }, [relativeTimeUtil, ms])

    return ago
}

export const useNameSpaceTitle = () => {
    const { t } = useTranslation()
    const type = useConnection().config.type

    switch (type) {
        case KvDatabaseType.CloudflareWorkersKv: {
            return t('namespace')
        }
        case KvDatabaseType.S3: {
            return t('bucket')
        }
        case KvDatabaseType.Redis: {
            return t('database')
        }
        default: {
            return ''
        }
    }
}
