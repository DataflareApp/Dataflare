import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { useTranslation } from '../../../i18n'
import { showMessageBox } from '../../../ui'
import { SetupExtension, db } from '../db/db'
import { useConnectID } from '../hooks/use-store'

export const useExtensions = () => {
    const connectID = useConnectID()
    const key = connectID !== null ? ([connectID, 'extensions'] as const) : null
    return useSWR(key, () => {
        return db.extensions()
    })
}

export const useSetupExtension = () => {
    const { t } = useTranslation()
    const { mutate, data: extensions } = useExtensions()
    const connectID = useConnectID()
    const key = [connectID, 'setup-extension'] as const
    return useSWRMutation(key, async (_, { arg }: { arg: SetupExtension }) => {
        try {
            await db.setupExtension(arg)
            const newExtensions = (extensions ?? []).map((item) => {
                if (item.name === arg.name) {
                    if (arg.schema === undefined) {
                        item.installedVersion = null
                        item.schema = null
                    } else {
                        item.installedVersion = item.defaultVersion
                        item.schema = arg.schema
                    }
                }
                return { ...item }
            })
            mutate(newExtensions)
        } catch (err: any) {
            mutate()
            showMessageBox(t('error'), err, 'error')
        }
    })
}
