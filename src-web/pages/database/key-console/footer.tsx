import { IconLoader2, IconSelector, IconSend } from '@tabler/icons-react'
import { IconFolder } from '@tabler/icons-react'
import { open } from '@tauri-apps/plugin-dialog'
import { FormEvent, useState } from 'react'
import { useShortcutMeta } from '../../../hooks/use-shortcut'
import { useTranslation } from '../../../i18n'
import { Database, NameSpace } from '../../../tauri'
import {
    IconButton,
    ScrollView,
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuLabel,
    dropdownMenuSize
} from '../../../ui'
import { keyboardTitleChars, KeyModifier } from '../../../utils/keyboard-char'
import { useReadonly } from '../hooks/use-db'
import { useNamespaces, useNameSpaceTitle } from '../hooks/use-kv'
import { InputRef } from './console'
import { Guide } from './guide'
import { nextID, useInput, historys, Task, useTasks, CommandStatus } from './utils'

type Props = Pick<ReturnType<typeof useTasks>, 'pushTask' | 'updateTask' | 'resetTasks'> & {
    inputRef: InputRef
}

export const Footer = ({ inputRef, resetTasks, pushTask, updateTask }: Props) => {
    const { t } = useTranslation()
    const readonly = useReadonly()
    const title = useNameSpaceTitle()
    const [namespace, setNamespace] = useState<NameSpace | null>(null)
    const { input, setInput } = useInput()
    const { data: namespaces } = useNamespaces()

    if (namespaces !== undefined && namespaces.length > 0) {
        if (namespace === null) {
            setNamespace(namespaces[0])
        }
    }
    if (namespace !== null) {
        let ns = namespaces?.find((ns) => ns.id === namespace.id)
        if (ns === undefined) {
            setNamespace(null)
        }
    }

    type E = FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>
    const onSubmit = async (e: E) => {
        e.preventDefault()
        inputRef.current?.focus()
        if (namespace === null) {
            return
        }
        const command = input.trim()
        if (command === '') {
            return
        }
        historys.insert(command)
        setInput('')
        if (command === 'clear') {
            resetTasks()
            return
        }
        const id = nextID()
        const newTask: Task = {
            id,
            namespace,
            command: input,
            result: { status: CommandStatus.Running }
        }
        pushTask(newTask)
        try {
            const output = await Database.kv.runCommand(namespace.id, input, readonly)
            updateTask(id, {
                status: CommandStatus.Ok,
                data: output
            })
        } catch (err: any) {
            updateTask(id, {
                status: CommandStatus.Error,
                message: err
            })
        }
    }

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        switch (e.key) {
            case 'ArrowUp': {
                e.preventDefault()
                if (input === '' || historys.inHistory) {
                    let val = historys.up()
                    val !== null && setInput(val)
                }
                break
            }
            case 'ArrowDown': {
                e.preventDefault()
                if (input === '' || historys.inHistory) {
                    setInput(historys.down() ?? '')
                }
                break
            }
        }
    }

    return (
        <div className='shrink-0 px-4'>
            <form onSubmit={onSubmit}>
                <input
                    type='text'
                    placeholder={'Try a command...'}
                    className='h-9 w-full rounded-md border border-separator bg-neutral-200/20 px-2 text-sm text-secondary placeholder-quarternary focus:bg-transparent dark:bg-neutral-800/20'
                    value={input}
                    onKeyDown={onKeyDown}
                    onChange={(e) => {
                        setInput(e.target.value)
                        historys.resetIndex()
                    }}
                    autoFocus
                    spellCheck='false'
                    autoComplete='off'
                    autoCapitalize='none'
                    onContextMenu={(e) => e.stopPropagation()}
                    ref={inputRef}
                />
            </form>
            <div className='flex h-8 items-center'>
                <DropdownMenu
                    trigger={
                        <IconButton title={title} className='mr-auto flex items-center gap-1'>
                            {namespace === null ? (
                                <IconLoader2 className='animate-spin' size={16} strokeWidth={1.5} />
                            ) : (
                                <>
                                    <div className='aspect-square w-2 rounded-full bg-green-500' />
                                    <span className='max-w-48 truncate text-xs'>
                                        {namespace?.title ?? namespace?.id}
                                    </span>
                                    <IconSelector size={16} strokeWidth={1.6} />
                                </>
                            )}
                        </IconButton>
                    }
                    className='!p-0'
                >
                    <NameSpaceContent title={title} namespace={namespace} setNamespace={setNamespace} />
                </DropdownMenu>
                <Guide />
                <InsertPathButton inputRef={inputRef} onChange={setInput} />
                <IconButton onClick={onSubmit} title={t('send')}>
                    <IconSend size={16} strokeWidth={1.6} />
                </IconButton>
            </div>
        </div>
    )
}

const NameSpaceContent = ({
    title,
    namespace,
    setNamespace
}: {
    title: string
    namespace: NameSpace | null
    setNamespace: (ns: NameSpace) => void
}) => {
    const { data: namespaces } = useNamespaces()

    return (
        <>
            <ScrollView axis='y' viewportClassName='p-1' style={dropdownMenuSize}>
                <DropdownMenuLabel label={title} />
                {namespaces?.map((ns) => {
                    const name = ns.title ?? ns.id
                    return (
                        <DropdownMenuItem key={ns.id} className='gap-2' onClick={() => setNamespace(ns)}>
                            <div
                                data-selected={ns.id === namespace?.id || undefined}
                                className='aspect-square w-2 rounded-full data-[selected]:bg-green-500'
                            />
                            <div title={name} className='min-w-11 max-w-48 truncate'>
                                {name}
                            </div>
                        </DropdownMenuItem>
                    )
                })}
            </ScrollView>
        </>
    )
}

const InsertPathButton = ({
    inputRef,
    onChange
}: {
    inputRef: InputRef
    onChange: (value: string) => void
}) => {
    const onInsertFilePath = async () => {
        let path = await open({})
        if (path === null || inputRef.current === null) {
            return
        }
        if (path.includes(' ')) {
            path = `'${path}'`
        }
        const start = inputRef.current.selectionStart ?? 0
        const end = inputRef.current.selectionEnd ?? 0
        const value = inputRef.current.value
        const needSpace = start > 0 && value[start - 1] !== ' '
        const insertText = needSpace ? ' ' + path : path
        const newValue = value.slice(0, start) + insertText + value.slice(end)
        inputRef.current.setSelectionRange(start + insertText.length, start + insertText.length)
        inputRef.current.focus()
        onChange(newValue)
    }

    useShortcutMeta('o', () => onInsertFilePath())

    return (
        <IconButton title={keyboardTitleChars('Insert file path', [KeyModifier.Meta, 'O'])}>
            <IconFolder size={16} strokeWidth={1.5} onClick={onInsertFilePath} />
        </IconButton>
    )
}
