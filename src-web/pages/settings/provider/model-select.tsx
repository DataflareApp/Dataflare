import { IconPlus, IconTrash } from '@tabler/icons-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { useFuzzySearch } from '../../../hooks/use-fuzzy-search'
import { useSearch } from '../../../hooks/use-search'
import { useTranslation } from '../../../i18n'
import { ProviderConfig, ProviderModelConfig } from '../../../tauri'
import { IconButton, Popover, ScrollView, SearchInput, TextInput, Switch, IconRefresh } from '../../../ui'
import { fetchModels } from './api'

const useProviderModelsList = (allowLoad: boolean, config: ProviderConfig) => {
    const key = allowLoad ? ['fetchModels', config] : null
    return useSWR(key, async () => {
        const modles = await fetchModels(config)
        modles.sort((a, b) => a.name.localeCompare(b.name))
        return modles
    })
}

export const ModelSelect = ({
    config,
    models,
    onChange
}: {
    config: ProviderConfig
    models: ProviderModelConfig[]
    onChange: (models: ProviderModelConfig[]) => void
}) => {
    const { t } = useTranslation()

    const [popoverShow, setPopoverShow] = useState(false)

    const { data: pms, isValidating, error, mutate } = useProviderModelsList(popoverShow, config)

    const enabledModels = useMemo(() => {
        return new Set(models.map((m) => m.id))
    }, [models])

    const addModel = (model: ProviderModelConfig) => {
        onChange([...models, model])
    }

    const removeModelByIndex = (i: number) => {
        return onChange(models.filter((_, idx) => idx !== i))
    }

    const removeModelByID = (id: string) => {
        return onChange(models.filter((m) => m.id !== id))
    }

    const updateModel = (i: number, field: keyof ProviderModelConfig, value: string) => {
        const updated = [...models]
        updated[i] = { ...updated[i], [field]: value }
        onChange(updated)
    }

    const scrollRef = useRef<HTMLDivElement>(null)
    const { displaySearch, search, setSearch } = useSearch('', 200)

    const filteredModels = useFuzzySearch(pms, search, (m) => m.name)

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0 })
    }, [search])

    return (
        <>
            <div className='mt-4 flex items-center justify-between py-2'>
                <h3 className='text-xs font-medium leading-7 text-secondary'>Models</h3>
                <Popover
                    trigger={
                        <IconButton className='h-7'>
                            <IconPlus size={16} strokeWidth={1.5} />
                        </IconButton>
                    }
                    className='w-80'
                    open={popoverShow}
                    onOpenChange={setPopoverShow}
                >
                    <div className='mt-3 flex gap-1 px-4'>
                        <SearchInput className='flex-1' value={displaySearch} onChange={setSearch} />
                        {(isValidating || error !== undefined) && (
                            <IconButton className='self-stretch' onClick={() => mutate()}>
                                <IconRefresh loading={isValidating} />
                            </IconButton>
                        )}
                    </div>

                    <ScrollView
                        axis='y'
                        className='mt-1'
                        viewportClassName='px-4 p-4 pt-1'
                        style={{
                            maxHeight: 'calc(var(--radix-popover-content-available-height) - 44px)'
                        }}
                        ref={scrollRef}
                    >
                        <div className='flex flex-col gap-1'>
                            {filteredModels.map((model, i) => {
                                return (
                                    <div
                                        key={model.id}
                                        className='flex items-center gap-2 rounded border border-separator px-3 py-2'
                                    >
                                        <div className='min-w-0 flex-1'>
                                            <p className='truncate text-sm text-secondary'>{model.name}</p>
                                            <p className='truncate text-[11px] text-tertiary'>{model.id}</p>
                                        </div>
                                        <Switch
                                            checked={enabledModels.has(model.id)}
                                            onChange={(checked) => {
                                                checked ? addModel(model) : removeModelByID(model.id)
                                            }}
                                        />
                                    </div>
                                )
                            })}
                            {!isValidating && error !== undefined && (
                                <div className='flex whitespace-pre-wrap break-all py-3 text-xs text-red-600'>
                                    {error.toString()}
                                </div>
                            )}
                            <div className='flex items-center gap-2 rounded border border-dashed border-separator px-3 py-2'>
                                <div className='min-w-0 flex-1'>
                                    <p className='truncate text-sm text-secondary'>Custom Model</p>
                                    <p className='truncate text-[11px] text-tertiary'>
                                        Manually enter the name and model ID
                                    </p>
                                </div>
                                <IconButton
                                    className='h-7'
                                    onClick={() => {
                                        addModel({ name: '', id: '' })
                                        setPopoverShow(false)
                                    }}
                                >
                                    <IconPlus size={16} strokeWidth={1.5} />
                                </IconButton>
                            </div>
                            {filteredModels.length === 0 && search !== '' && (
                                <div className='flex items-center justify-center py-10 text-xs text-tertiary'>
                                    {t('noSearchResult')}
                                </div>
                            )}
                        </div>
                    </ScrollView>
                </Popover>
            </div>

            {models.length === 0 && (
                <div className='flex items-center justify-center rounded-md border border-dashed border-separator py-8 text-xs text-tertiary'>
                    No Models
                </div>
            )}

            {models.length > 0 && (
                <div className='flex flex-col gap-2'>
                    <div className='flex gap-2 text-xs text-tertiary'>
                        <h4 className='flex-1'>{t('name')}</h4>
                        <h4 className='flex-1'>Model ID</h4>
                        <div className='w-8' />
                    </div>
                    {models.map((model, i) => (
                        <div key={i} className='flex items-center gap-2'>
                            <TextInput
                                className='min-w-0 flex-1'
                                placeholder='Display Name'
                                value={model.name}
                                onChange={(v) => updateModel(i, 'name', v)}
                            />
                            <TextInput
                                className='min-w-0 flex-1'
                                placeholder='Model ID'
                                value={model.id}
                                onChange={(v) => updateModel(i, 'id', v)}
                            />
                            <IconButton
                                className='h-7 text-tertiary hover:text-red-500'
                                onClick={() => removeModelByIndex(i)}
                            >
                                <IconTrash size={16} strokeWidth={1.5} />
                            </IconButton>
                        </div>
                    ))}
                </div>
            )}
        </>
    )
}
