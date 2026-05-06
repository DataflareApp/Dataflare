import { IconHelp, IconMinus } from '@tabler/icons-react'
import { Fragment } from 'react'
import { useTranslation } from '../../../i18n'
import {
    HoverCardTooltip,
    IconButton,
    Loading,
    SelectProps,
    ScrollView,
    Select,
    Titlebar,
    Button,
    TextInput
} from '../../../ui'
import { TransformRule } from '../../database/hooks/use-column-transform'
import { useRules } from './hooks'

const options: SelectProps['options'] = [
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

export const Transform = () => {
    const { t } = useTranslation()
    const { rules, addRule, removeRule, updateRule, isLoading, error } = useRules()

    return (
        <div className='flex h-full flex-col'>
            <Titlebar title={t('columnTransform')} minimizable={false} maximizable={false} />
            {isLoading ? (
                <Loading />
            ) : rules.length === 0 ? (
                <div className='flex grow flex-col items-center justify-center gap-4'>
                    <p className='px-6 text-sm text-tertiary'>{t('columnTransformMsg')}</p>
                    <Button className='w-36' onClick={addRule}>
                        {t('add')}
                    </Button>
                </div>
            ) : (
                <ScrollView className='grow' axis='y' viewportClassName='pr-2 pt-2 pl-4 pb-4'>
                    <div
                        className='grid gap-2'
                        style={{
                            gridTemplateColumns: 'auto 4fr 4fr 270px 32px'
                        }}
                    >
                        <div className='min-w-3' />
                        <Column label={t('table')} help={t('transformTableHelp')} />
                        <Column label={t('column')} help={t('transformColumnHelp')} />
                        <Column label={'Transform'} />
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
                                        options={options}
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
                </ScrollView>
            )}

            {error && (
                <footer className='shrink-0 border-t border-red-500 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-600 dark:bg-red-900/20 dark:text-red-200'>
                    {error}
                </footer>
            )}
        </div>
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
