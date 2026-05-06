import { useTranslation } from '../../../i18n'
import { ScrollView } from '../../../ui'
import { KeyModifier, keyborardKey } from '../../../utils/keyboard-char'
import { SettingsGroup, SettingsItem } from '../item'

export const KeyboardShortcutsSettings = () => {
    const { t } = useTranslation()
    const groups = [
        {
            name: t('general'),
            shortcuts: [
                {
                    name: t('quickSearch'),
                    keys: [KeyModifier.Meta, 'P']
                },
                {
                    name: t('manageConnection'),
                    keys: [KeyModifier.Meta, 'N']
                },
                {
                    name: t('filter'),
                    keys: [KeyModifier.Shift, KeyModifier.Meta, 'F']
                },
                {
                    name: t('refresh'),
                    keys: [KeyModifier.Shift, KeyModifier.Meta, 'R']
                }
            ]
        },
        {
            name: t('tab'),
            shortcuts: [
                {
                    name: t('prevTab'),
                    keys: [KeyModifier.Meta, '[']
                },
                {
                    name: t('nextTab'),
                    keys: [KeyModifier.Meta, ']']
                },
                {
                    name: t('switchTab'),
                    keys: [KeyModifier.Meta, '1-9']
                },
                {
                    name: t('closeTab'),
                    keys: [KeyModifier.Meta, 'W']
                },
                {
                    name: t('closeAllTab'),
                    keys: [KeyModifier.Shift, KeyModifier.Meta, 'W']
                }
            ]
        },
        {
            name: t('aiAssistant'),
            shortcuts: [
                {
                    name: t('aiAssistant'),
                    keys: [KeyModifier.Shift, KeyModifier.Meta, 'I']
                },
                {
                    name: t('clearChat'),
                    keys: [KeyModifier.Shift, KeyModifier.Meta, 'K']
                },
                {
                    name: 'Tool - ' + t('allow'),
                    keys: [KeyModifier.Meta, KeyModifier.Enter]
                },
                {
                    name: 'Tool - ' + t('skip'),
                    keys: [KeyModifier.Opt, KeyModifier.Meta, KeyModifier.Enter]
                }
            ]
        },
        {
            name: t('table'),
            shortcuts: [
                {
                    name: t('refresh'),
                    keys: [KeyModifier.Meta, 'R']
                },
                {
                    name: t('filter'),
                    keys: [KeyModifier.Meta, 'F']
                },
                {
                    name: t('previousPage'),
                    keys: [KeyModifier.Meta, '←']
                },
                {
                    name: t('nextPage'),
                    keys: [KeyModifier.Meta, '→']
                },
                {
                    name: t('firstPage'),
                    keys: [KeyModifier.Shift, KeyModifier.Meta, '←']
                },
                {
                    name: t('lastPage'),
                    keys: [KeyModifier.Shift, KeyModifier.Meta, '→']
                },
                {
                    name: t('selectAllRows'),
                    keys: [KeyModifier.Meta, 'A']
                },
                {
                    name: t('unselectAllRows'),
                    keys: ['ESC']
                },
                {
                    name: t('editCell'),
                    keys: [KeyModifier.Enter]
                },
                {
                    name: t('editRow'),
                    keys: [KeyModifier.Shift, KeyModifier.Enter]
                },
                {
                    name: t('insertRow'),
                    keys: [KeyModifier.Meta, 'I']
                },
                {
                    name: t('deleteRows'),
                    keys: ['Backspace']
                },
                {
                    name: t('copyCell'),
                    keys: [KeyModifier.Meta, 'C']
                },
                {
                    name: t('copySelectedRows'),
                    keys: [KeyModifier.Shift, KeyModifier.Meta, 'C']
                },
                {
                    name: t('resizeColumnToFixContent'),
                    keys: [KeyModifier.Meta, 'E']
                },
                {
                    name: t('resizeColumnToMinimum'),
                    keys: [KeyModifier.Shift, KeyModifier.Meta, 'E']
                }
            ]
        },
        {
            name: t('query'),
            shortcuts: [
                {
                    name: t('runCurrentStatement'),
                    keys: [KeyModifier.Meta, KeyModifier.Enter]
                },
                {
                    name: t('runAllStatement'),
                    keys: [KeyModifier.Shift, KeyModifier.Meta, KeyModifier.Enter]
                },
                {
                    name: t('formatSQL'),
                    keys: [KeyModifier.Shift, KeyModifier.Meta, 'L']
                },
                {
                    name: t('minifySQL'),
                    keys: [KeyModifier.Shift, KeyModifier.Meta, 'J']
                },
                {
                    name: t('find'),
                    keys: [KeyModifier.Meta, 'F']
                }
            ]
        },
        {
            name: t('editTable'),
            shortcuts: [
                {
                    name: t('refresh'),
                    keys: [KeyModifier.Meta, 'R']
                }
            ]
        },
        {
            name: `${t('schemaManager')} / ${t('functionManager')} / ${t('triggerManager')} / ${t('extensionManager')}`,
            shortcuts: [
                {
                    name: t('refresh'),
                    keys: [KeyModifier.Meta, 'R']
                },
                {
                    name: t('find'),
                    keys: [KeyModifier.Meta, 'F']
                }
            ]
        },
        {
            name: t('console'),
            shortcuts: [
                {
                    name: t('clearScreen'),
                    keys: [KeyModifier.Meta, 'K']
                }
            ]
        }
    ]
    return (
        <ScrollView axis='y' className='size-full' viewportClassName='pb-4'>
            {groups.map((group) => {
                return (
                    <SettingsGroup key={group.name} name={group.name}>
                        {group.shortcuts.map((shortcut) => {
                            return (
                                <SettingsItem key={shortcut.name} name={shortcut.name}>
                                    <div className='flex items-center gap-1'>
                                        {shortcut.keys.map((k) => {
                                            const key = keyborardKey(k)
                                            return (
                                                <span
                                                    key={key}
                                                    className='rounded border border-separator px-1 py-[2px] font-jb text-xs'
                                                >
                                                    {key}
                                                </span>
                                            )
                                        })}
                                    </div>
                                </SettingsItem>
                            )
                        })}
                    </SettingsGroup>
                )
            })}
        </ScrollView>
    )
}
