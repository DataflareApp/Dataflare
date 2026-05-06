import { useTranslation } from '../../../i18n'
import { Provider, ProviderConfig } from '../../../tauri'
import { PasswordInput, ScrollView, TextInput } from '../../../ui'
import { defaultBaseURL } from './api'
import { ModelSelect } from './model-select'

interface OptionsProps {
    provider: Provider
    onChange: (provider: Provider) => void
}

export const OptionsEditor = ({ provider, onChange }: OptionsProps) => {
    const { t } = useTranslation()
    const { name, config, models } = provider

    return (
        <ScrollView className='size-full' axis='y' viewportClassName='px-4 py-3'>
            <div className='grid grid-cols-[auto_1fr] gap-3'>
                <Label name={t('name')} />
                <TextInput
                    className='min-w-0'
                    value={name}
                    onChange={(name) => onChange({ ...provider, name })}
                />
                <CommonOptionsEditor provider={provider} onChange={onChange} />
            </div>
            <ModelSelect
                config={config}
                models={models}
                onChange={(models) => onChange({ ...provider, models })}
            />
        </ScrollView>
    )
}

const Label = ({ name }: { name: string }) => {
    return (
        <span className='shrink-0 whitespace-nowrap text-right text-xs leading-7 text-tertiary'>{name}</span>
    )
}

const CommonOptionsEditor = ({ provider, onChange }: OptionsProps) => {
    // type FlexibleProviderConfig = ProviderConfig & Partial<{ apiKey: string }>

    const config = provider.config
    const baseURL = defaultBaseURL(provider.config.type)
    const placeholder = baseURL === '' ? 'https://example.com/v1' : baseURL

    const setConfig = <K extends keyof ProviderConfig>(key: K, value: ProviderConfig[K]) => {
        onChange({
            ...provider,
            config: {
                ...provider.config,
                [key]: value
            } as ProviderConfig
        })
    }

    return (
        <>
            {config.apiKey !== undefined && (
                <>
                    <Label name='API Key' />
                    <PasswordInput
                        className='min-w-0'
                        value={config.apiKey}
                        onChange={(v) => setConfig('apiKey', v)}
                    />
                </>
            )}
            <Label name='Base URL' />
            <TextInput
                className='min-w-0'
                placeholder={placeholder}
                value={config.baseURL}
                onChange={(v) => setConfig('baseURL', v)}
            />
        </>
    )
}
