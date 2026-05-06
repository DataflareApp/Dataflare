import * as Tabs from '@radix-ui/react-tabs'
import {
    IconAdjustments,
    IconCode,
    IconKeyboard,
    IconRobot,
    IconServer,
    IconTable
} from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../i18n'
import { SettingsTab, SWITCH_SETTINGS_TAB, TauriGlobalEvent } from '../../tauri'
import { Titlebar } from '../../ui'
import { AgentSettings } from './agent'
import { EditorSettings } from './editor'
import { GeneralSettings } from './general'
import { KeyboardShortcutsSettings } from './keyboard-shortcuts'
import { ProviderSettings } from './provider'
import { TableSettings } from './table'

const defaultTab = ((window as any)['__DEFAULT_TAB'] as SettingsTab | undefined) ?? SettingsTab.General

export const Settings = () => {
    const { t, language } = useTranslation()
    const [selectedTab, setSelectedTab] = useState(defaultTab)

    useEffect(() => {
        const listen = TauriGlobalEvent.listen<SettingsTab>(SWITCH_SETTINGS_TAB, (event) => {
            setSelectedTab(event.payload)
        })
        return () => {
            listen.then((unlisten) => unlisten())
        }
    }, [])

    const tabsConfig = useMemo(() => {
        return [
            {
                value: SettingsTab.General,
                icon: IconAdjustments,
                label: t('general'),
                content: <GeneralSettings />
            },
            { value: SettingsTab.Editor, icon: IconCode, label: t('sqlEditor'), content: <EditorSettings /> },
            { value: SettingsTab.Table, icon: IconTable, label: t('table'), content: <TableSettings /> },
            {
                value: SettingsTab.Providers,
                icon: IconServer,
                label: 'AI Provider',
                content: <ProviderSettings />
            },
            { value: SettingsTab.Agents, icon: IconRobot, label: 'AI Agent', content: <AgentSettings /> },
            {
                value: SettingsTab.KeyboardShortcuts,
                icon: IconKeyboard,
                label: t('keyboardShortcuts'),
                content: <KeyboardShortcutsSettings />
            }
        ]
    }, [language])

    return (
        <div className='flex h-full flex-col'>
            <Titlebar title={t('settings')} minimizable={false} maximizable={false} />
            <Tabs.Root
                value={selectedTab}
                onValueChange={(tab) => setSelectedTab(tab as SettingsTab)}
                orientation='vertical'
                className='flex flex-1 overflow-hidden'
            >
                <Tabs.List className='flex w-44 flex-col gap-1 border-r border-separator bg-zinc-100 p-2 dark:bg-zinc-900'>
                    {tabsConfig.map((tab) => {
                        const Icon = tab.icon
                        return (
                            <Tabs.Trigger
                                key={tab.value}
                                value={tab.value}
                                className='flex h-9 items-center gap-2 rounded pl-3 text-xs text-secondary data-[state=active]:bg-theme data-[state=active]:text-white'
                            >
                                <Icon size={16} strokeWidth={1.5} />
                                {tab.label}
                            </Tabs.Trigger>
                        )
                    })}
                </Tabs.List>

                {tabsConfig.map((tab) => {
                    return (
                        <Tabs.Content
                            key={tab.value}
                            value={tab.value}
                            className='flex-1 overflow-hidden outline-none'
                        >
                            {tab.content}
                        </Tabs.Content>
                    )
                })}
            </Tabs.Root>
        </div>
    )
}
