import { useMemo, useRef, useState } from 'react'
import useSWRImmutable from 'swr/immutable'
import { t } from '../../../i18n'
import { ClientData, Provider, ProviderType, emit, REFRESH_AI_MODELS } from '../../../tauri'
import { Direction, Persistent, Pin, showMessageBox, SplitView, Titlebar } from '../../../ui'
import { Welcome } from '../../database/layout/welcome'
import { ProviderList } from './list'
import { OptionsEditor } from './options'

// Send refresh event to interfaces using AI models
let timer: ReturnType<typeof setTimeout> | null = null
const notifyRefresh = () => {
    if (timer !== null) {
        clearTimeout(timer)
    }
    timer = setTimeout(() => {
        timer = null
        emit(REFRESH_AI_MODELS)
    }, 600)
}

export const ProviderSettings = () => {
    const { data: providers, mutate } = useSWRImmutable('providers', () => ClientData.providerList())
    const [selectedPid, setSelectedPid] = useState<number | null>(null)

    const selected = useMemo(() => {
        return providers?.find((p) => p.id === selectedPid) ?? null
    }, [selectedPid, providers])

    const onCreate = async (type: ProviderType) => {
        if (providers === undefined) return
        try {
            const config = { type, baseURL: '', apiKey: '' }
            const params = { name: type, config, models: [] }
            const id = await ClientData.createProvider(params)
            setSelectedPid(id)
            mutate([...providers, { id, ...params }], { revalidate: false })
            notifyRefresh()
        } catch (err: any) {
            showMessageBox(t('createFailed'), err, 'error')
        }
    }

    const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [waitUpdate, setWaitUpdate] = useState<Provider | null>(null)

    const onUpdate = async (provider: Provider) => {
        if (providers === undefined) return
        try {
            const newProviders = providers.map((p) => {
                return p.id === provider.id ? provider : p
            })
            mutate(newProviders, { revalidate: false })

            notifyRefresh()

            if (waitUpdate !== null && provider.id !== waitUpdate.id) {
                await ClientData.updateProvider(waitUpdate)
            }
            setWaitUpdate(provider)
            if (updateTimer.current !== null) {
                clearTimeout(updateTimer.current)
            }
            updateTimer.current = setTimeout(async () => {
                updateTimer.current = null
                setWaitUpdate(null)
                try {
                    await ClientData.updateProvider(provider)
                } catch (err: any) {
                    showMessageBox(t('saveFailed'), err, 'error')
                }
            }, 600)
        } catch (err: any) {
            showMessageBox(t('saveFailed'), err, 'error')
        }
    }

    const onDelete = async (provider: Provider) => {
        if (providers === undefined) return
        try {
            if (waitUpdate?.id === provider.id) {
                setWaitUpdate(null)
                if (updateTimer.current !== null) {
                    clearTimeout(updateTimer.current)
                    updateTimer.current = null
                }
            }
            await ClientData.deleteProvider(provider.id)
            if (selectedPid === provider.id) {
                setSelectedPid(null)
            }
            const newProviders = providers.filter((p) => p.id !== provider.id)
            mutate(newProviders, { revalidate: false })
            notifyRefresh()
        } catch (err: any) {
            showMessageBox(t('deleteFailed'), err, 'error')
        }
    }

    return (
        <SplitView
            direction={Direction.Horizontal}
            pin={Pin.First}
            defaultPinSize={200}
            minPinSize={180}
            maxPinSize={360}
            className='size-full'
            id='provider'
            persistent={Persistent.Permanent}
        >
            <ProviderList
                providers={providers ?? []}
                selected={selectedPid}
                onCreate={onCreate}
                onSelect={setSelectedPid}
                onDelete={onDelete}
            />
            {selected ? (
                <OptionsEditor key={selected.id} provider={selected} onChange={onUpdate} />
            ) : (
                <Welcome size='small' />
            )}
        </SplitView>
    )
}
