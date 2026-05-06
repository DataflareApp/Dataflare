import { Root, Content, Title, Overlay, Description, Portal } from '@radix-ui/react-dialog'
import { IconAlertTriangle, IconCircleCheck, IconExclamationCircle, IconTrash } from '@tabler/icons-react'
import clsx from 'clsx'
import { useState } from 'react'
import { useTranslation } from '../i18n'
import { openURL } from '../utils/opener'
import { Button } from './button'
import { ScrollView } from './scrollview'

export interface MessageAction {
    label: string
    primary?: boolean
    onClick: string | (() => void)
}

export interface MessageBoxOption {
    title: string
    desc: string
    type: 'warning' | 'delete' | 'error' | 'success'
    actions?: MessageAction | MessageAction[]
    onClose?: () => void
}

type Callback = (option: MessageBoxOption) => void

let recver: null | Callback = null

export const showMessageBox = (
    title: string,
    desc: string,
    type: MessageBoxOption['type'],
    actions?: MessageBoxOption['actions'],
    onClose?: () => void
) => {
    if (recver === null) {
        console.error('MessageBox is not init!')
        return
    }
    recver({ title, desc, type, actions, onClose })
}

export const MessageBox = () => {
    const { t } = useTranslation()
    const [state, setState] = useState<MessageBoxOption | null>(null)

    if (recver === null) {
        recver = (option) => setState(option)
    }

    if (state === null) {
        return null
    }

    const actions = Array.isArray(state.actions)
        ? [...state.actions]
        : state.actions === undefined
          ? []
          : [state.actions]
    if (state.actions !== undefined) {
        actions.unshift({
            label: t('cancel'),
            onClick() {}
        })
    } else {
        actions.push({
            label: t('ok'),
            primary: true,
            onClick() {}
        })
    }

    return (
        <Root
            open
            onOpenChange={() => {
                state.onClose?.()
                setState(null)
            }}
        >
            <Portal>
                <Overlay className='fixed inset-0 z-10' data-tauri-drag-region />
                <Content
                    className='fixed left-1/2 top-1/2 z-10 w-72 rounded-md border border-separator bg-main/80 py-4 shadow-dialog backdrop-blur focus:outline-none data-[state=open]:animate-alertIn'
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onInteractOutside={(e) => e.preventDefault()}
                    // When the dialog appears, block other keyboard shortcuts
                    onKeyDown={(e) => {
                        if (e.key !== 'Escape') {
                            e.stopPropagation()
                        }
                    }}
                >
                    <Title className='flex flex-col items-center gap-1'>
                        <Icon type={state.type} />
                        <span className='block max-w-full truncate px-4 text-sm font-semibold text-primary'>
                            {state.title}
                        </span>
                    </Title>
                    <Description asChild>
                        <ScrollView
                            axis='y'
                            viewportClassName='mt-2 max-h-72 select-text whitespace-pre-wrap break-words px-6 text-center text-xs leading-4 text-tertiary'
                            onContextMenu={(e) => e.stopPropagation()}
                        >
                            {state.desc}
                        </ScrollView>
                    </Description>
                    <div
                        className={clsx('mt-4 flex gap-3 px-4', {
                            'flex-col': actions.length > 2
                        })}
                    >
                        {actions.map((item) => {
                            return (
                                <Button
                                    className={actions.length <= 2 ? 'flex-1' : undefined}
                                    primary={item.primary}
                                    autoFocus={item.primary}
                                    key={item.label}
                                    onClick={() => {
                                        if (typeof item.onClick === 'string') {
                                            openURL(item.onClick, true)
                                        } else {
                                            state.onClose?.()
                                            setState(null)
                                            item.onClick()
                                        }
                                    }}
                                >
                                    {item.label}
                                </Button>
                            )
                        })}
                    </div>
                </Content>
            </Portal>
        </Root>
    )
}

const Icon = ({ type }: { type: MessageBoxOption['type'] }): JSX.Element => {
    switch (type) {
        case 'warning':
            return <IconAlertTriangle size={32} stroke={1.5} />
        case 'delete':
            return <IconTrash size={32} stroke={1.5} />
        case 'error':
            return <IconExclamationCircle size={32} stroke={1.5} className='text-red-500' />
        case 'success':
            return <IconCircleCheck size={32} stroke={1.5} className='text-green-500' />
    }
}
