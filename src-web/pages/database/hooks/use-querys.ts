import useSWRImmutable from 'swr/immutable'
import { useTranslation } from '../../../i18n'
import { ClientData, QueryItem } from '../../../tauri'
import { showMessageBox } from '../../../ui'
import { TabType, useConnection, useTabsStore } from './use-store'

export const useQuerys = () => {
    const cid = useConnection().cid
    return useSWRImmutable('querys', () => {
        return ClientData.queryList(cid)
    })
}

export const useCreateQuery = () => {
    const { data, mutate } = useQuerys()
    const cid = useConnection().cid
    const querys = data || []
    const switchTabTo = useTabsStore((state) => state.switchTabTo)

    // Create a new Query
    return async (name: string, content = '', openTab = true) => {
        let qid = await ClientData.createQuery(cid, name, content)
        mutate([{ qid, name }, ...querys], { revalidate: false })
        if (openTab) {
            switchTabTo({
                type: TabType.Query,
                query: {
                    qid,
                    name
                }
            })
        }
    }
}

export const useDeleteQuery = () => {
    const { t, tf } = useTranslation()
    const { data, mutate } = useQuerys()
    const querys = data || []
    const closeTab = useTabsStore((state) => state.closeTab)

    // Delete a Query
    return (i: number) => {
        showMessageBox(t('deleteQuery'), tf('deleteMessage', querys[i].name), 'delete', {
            label: t('delete'),
            primary: true,
            onClick: async () => {
                try {
                    await ClientData.deleteQuery(querys[i].qid)
                    let newQuerys = [...querys]
                    newQuerys.splice(i, 1)
                    closeTab({ type: TabType.Query, query: querys[i] })
                    mutate(newQuerys, { revalidate: false })
                } catch (err: any) {
                    showMessageBox(t('error'), err, 'error')
                }
            }
        })
    }
}

// Rename Query
export const useRenameQuery = () => {
    const { mutate } = useQuerys()
    const replaceTab = useTabsStore((state) => state.replaceTab)

    return (query: QueryItem, newName: string) => {
        mutate()
        replaceTab({
            from: {
                type: TabType.Query,
                query
            },
            to: {
                type: TabType.Query,
                query: {
                    qid: query.qid,
                    name: newName
                }
            }
        })
    }
}
