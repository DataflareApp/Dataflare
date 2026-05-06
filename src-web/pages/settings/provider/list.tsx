import { Fragment, useEffect, useState } from 'react'
import { useTranslation } from '../../../i18n'
import { ALL_PROVIDER_TYPES, Provider, ProviderType, showContextMenu } from '../../../tauri'
import {
    Button,
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuSeparator,
    Message,
    ScrollView
} from '../../../ui'
import { ProviderIcon } from './provider-icon'

interface ProviderListProps {
    providers: Provider[]
    selected: number | null
    onCreate: (type: ProviderType) => void
    onSelect: (pid: number) => void
    onDelete: (p: Provider) => void
}

export const ProviderList = ({ providers, selected, onCreate, onSelect, onDelete }: ProviderListProps) => {
    const { t } = useTranslation()
    const [contextMenuSelect, setContextMenuSelect] = useState<number | null>(null)

    const onContextMenu = (p: Provider) => {
        setContextMenuSelect(p.id)
        showContextMenu(
            [
                {
                    label: t('delete'),
                    onClick: () => onDelete(p)
                }
            ],
            () => setContextMenuSelect(null)
        )
    }

    useEffect(() => {
        if (selected === null) {
            return
        }
        document.getElementById(`item-${selected}`)?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
    }, [selected])

    return (
        <div className='flex size-full flex-col'>
            <div className='mb-1 mt-3 px-4'>
                <DropdownMenu trigger={<Button className='w-full'>{t('newProvider')}</Button>}>
                    {ALL_PROVIDER_TYPES.map((type) => {
                        return (
                            <Fragment key={type}>
                                {type === ProviderType.OpenAICompatible && <DropdownMenuSeparator />}
                                <DropdownMenuItem className='gap-2' onClick={() => onCreate(type)}>
                                    <ProviderIcon type={type} />
                                    {type}
                                </DropdownMenuItem>
                            </Fragment>
                        )
                    })}
                </DropdownMenu>
            </div>

            {providers.length === 0 ? (
                <Message text={t('noProvider')} />
            ) : (
                <ScrollView className='flex-1' axis='y' viewportClassName='pb-2 px-4 pt-1'>
                    {providers.map((p) => {
                        return (
                            <div
                                key={p.id}
                                id={`item-${p.id}`}
                                data-selected={selected === p.id || undefined}
                                data-context-menu={contextMenuSelect === p.id || undefined}
                                className='mb-1 flex h-9 items-center gap-2 rounded bg-zinc-100 px-3 text-sm text-secondary outline-1 outline-offset-2 outline-theme data-[selected]:bg-theme data-[selected]:text-white data-[context-menu]:outline dark:bg-neutral-800'
                                onClick={() => onSelect(p.id)}
                                onContextMenu={() => onContextMenu(p)}
                            >
                                <ProviderIcon type={p.config.type} selected={selected === p.id} />
                                <span className='truncate'>{p.name}</span>
                            </div>
                        )
                    })}
                </ScrollView>
            )}
        </div>
    )
}
