import { Root, List, Trigger, Content } from '@radix-ui/react-tabs'
import { ReactNode } from 'react'
import { useTranslation } from '../../i18n'

export interface Props {
    general: ReactNode
    security?: ReactNode
    proxy?: ReactNode
    initialSQL?: ReactNode
    alert?: AlertType
}

enum TabValue {
    General = 'General',
    Security = 'Security',
    Proxy = 'Proxy',
    InitialSQL = 'initialSQL'
}

export const ConnectionTab = ({ general, security, proxy, initialSQL, alert }: Props) => {
    const { t } = useTranslation()
    const items = [
        [TabValue.General, t('general'), general] as const,
        [TabValue.Security, t('security'), security] as const,
        [TabValue.Proxy, t('proxy'), proxy] as const,
        [TabValue.InitialSQL, t('initialSQL'), initialSQL] as const
    ].filter(([_value, _name, node]) => {
        return node !== undefined
    })

    return (
        <Root className='flex flex-1 flex-col gap-4' defaultValue={TabValue.General}>
            <List className='flex w-fit rounded-md bg-zinc-100 p-0.5 dark:bg-neutral-800'>
                {items.map(([value, name]) => {
                    return (
                        <Trigger
                            key={value}
                            value={value}
                            className='relative h-6 whitespace-nowrap rounded-md px-5 text-sm text-tertiary !outline-none data-[state=active]:bg-main data-[state=active]:text-primary data-[state=active]:shadow-sm'
                        >
                            {name}
                        </Trigger>
                    )
                })}
            </List>

            {alert !== undefined && <Alert type={alert} />}

            {items.map(([value, _, node]) => {
                return (
                    <Content key={value} value={value} className='grow outline-none'>
                        {node}
                    </Content>
                )
            })}
        </Root>
    )
}

export type AlertType = 'beta' | 'dev'

const Alert = ({ type }: { type: AlertType }) => {
    const { t } = useTranslation()
    switch (type) {
        case 'beta': {
            return (
                <div className='rounded-md border border-yellow-500 bg-yellow-50 px-3 py-2 text-xs text-yellow-800 dark:border-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-200'>
                    ⚠️ {t('betaMessage')}
                </div>
            )
        }
        case 'dev': {
            return (
                <div className='rounded-md border border-red-500 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-600 dark:bg-red-900/20 dark:text-red-200'>
                    🚨 {t('devMessage')}
                </div>
            )
        }
    }
}
