import { IconHelp, IconMinus } from '@tabler/icons-react'
import { Fragment } from 'react'
import { setFormatTableNumber, useTranslation } from '../../../i18n'
import { Button, HoverCardTooltip, IconButton, ScrollView, Select, SelectProps, TextInput } from '../../../ui'
import { BytesFormat, setBytesFormat, useBytesFormat } from '../../database/hooks/use-bytes-format'
import { TransformRule } from '../../database/hooks/use-column-transform'
import { SettingsGroup, SettingsItem } from '../item'
import { useRules } from './hooks'

const transformOptions: SelectProps['options'] = [
    {
        value: TransformRule.enum.MS_TO_UTC,
        name: 'Timestamp(ms) -> DateTime(UTC)'
    },
    {
        value: TransformRule.enum.MS_TO_LOCAL,
        name: 'Timestamp(ms) -> DateTime(Local)'
    },
    {
        value: TransformRule.enum.S_TO_UTC,
        name: 'Timestamp(s) -> DateTime(UTC)'
    },
    {
        value: TransformRule.enum.S_TO_LOCAL,
        name: 'Timestamp(s) -> DateTime(Local)'
    }
]

export const TableSettings = () => {
    const { t, formatTableNumber } = useTranslation()
    const { bytesFormat } = useBytesFormat()
    const { rules, addRule, removeRule, updateRule, isLoading, error } = useRules()

    return (
        <ScrollView className='size-full' viewportClassName='pb-4' axis='y'>
            <SettingsGroup name={t('table')}>
                <SettingsItem name={t('formatNumber')}>
                    <Select
                        className='w-48'
                        value={formatTableNumber ? 'on' : 'off'}
                        options={[
                            { value: 'on', name: t('on') },
                            { value: 'off', name: t('off') }
                        ]}
                        onChange={(val) => setFormatTableNumber(val === 'on')}
                    />
                </SettingsItem>
                <SettingsItem name={t('displayBytesAs')}>
                    <Select
                        className='w-48'
                        value={bytesFormat}
                        options={[
                            { value: BytesFormat.BytesSize, name: BytesFormat.BytesSize },
                            { value: BytesFormat.Hex, name: BytesFormat.Hex },
                            { value: BytesFormat.Binary, name: BytesFormat.Binary }
                        ]}
                        onChange={(val) => setBytesFormat(val as BytesFormat)}
                    />
                </SettingsItem>
            </SettingsGroup>
            <SettingsGroup name={t('columnTransform')} desc={t('columnTransformMsg')}>
                <div className='flex flex-col gap-3 pb-3 pt-2'>
                    {isLoading ? null : rules.length === 0 ? (
                        <div className='flex flex-col items-center gap-3 py-4'>
                            <Button className='w-36' onClick={addRule}>
                                {t('add')}
                            </Button>
                        </div>
                    ) : (
                        <div className='flex flex-col gap-3'>
                            <div
                                className='grid gap-2'
                                style={{
                                    gridTemplateColumns: 'auto 1fr 1fr 270px 32px'
                                }}
                            >
                                <div className='min-w-3' />
                                <Column label={t('table')} help={t('transformTableHelp')} />
                                <Column label={t('column')} help={t('transformColumnHelp')} />
                                <Column label='Transform' />
                                <div></div>

                                {rules.map((rule, i) => {
                                    return (
                                        <Fragment key={i}>
                                            <span className='text-right text-xs leading-7 text-tertiary'>
                                                {i + 1}.
                                            </span>
                                            <TextInput
                                                value={rule.table}
                                                className='min-w-0'
                                                onChange={(v) => updateRule(i, 'table', v)}
                                            />
                                            <TextInput
                                                value={rule.column}
                                                className='min-w-0'
                                                onChange={(v) => updateRule(i, 'column', v)}
                                            />
                                            <Select
                                                options={transformOptions}
                                                value={rule.type}
                                                onChange={(value) => updateRule(i, 'type', value as any)}
                                            />
                                            <IconButton title={t('delete')} onClick={() => removeRule(i)}>
                                                <IconMinus
                                                    size={16}
                                                    stroke={1.8}
                                                    className='text-tertiary hover:text-primary'
                                                />
                                            </IconButton>
                                        </Fragment>
                                    )
                                })}

                                <Button className='col-start-2' onClick={addRule}>
                                    {t('add')}
                                </Button>
                            </div>

                            {error && (
                                <div className='rounded border border-red-500 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-600 dark:bg-red-900/20 dark:text-red-200'>
                                    {error}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </SettingsGroup>
        </ScrollView>
    )
}

const Column = ({ label, help }: { label: string; help?: string }) => {
    return (
        <div className='flex items-center gap-2 text-xs font-medium leading-7 text-secondary'>
            {label}
            {help && (
                <HoverCardTooltip
                    trigger={<IconHelp size={16} stroke={1.5} className='text-tertiary hover:text-primary' />}
                    text={help}
                    style={{
                        whiteSpace: 'break-spaces'
                    }}
                />
            )}
        </div>
    )
}
