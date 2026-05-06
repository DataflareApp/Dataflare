import { IconCornerDownRight, IconFileArrowRight, IconFolder, IconLoader2 } from '@tabler/icons-react'
import { open } from '@tauri-apps/plugin-dialog'
import { useEffect, useState } from 'react'
import { t } from '../../i18n'
import {
    BackupConfig,
    BackupMessageType,
    ClientData,
    Connection,
    DatabaseBackup,
    UnlistenFn,
    z
} from '../../tauri'
import { ScrollView, Button, Textarea, IconButton } from '../../ui'
import { formatBytesSize } from '../../utils/format'
import { Log, Logs, useLogs } from './logs'
import { Options } from './options'
import { useCommandPreview, out } from './utils'

interface Props {
    conn: Connection
    initConfig: BackupConfig
}

// TODO: Cancel the task when the window is closed

export const Backup = ({ conn, initConfig }: Props) => {
    const [config, setConfig] = useState<BackupConfig>(initConfig)
    const [output, setOutput] = useState<string>('')
    const commandString = useCommandPreview(config)
    const { logs, pushLog } = useLogs()

    useEffect(() => {
        out.suffix = config.type
        ClientData.getStorage(conn.cid, 'backup-path', z.string()).then((path) => {
            setOutput(path ?? '')
        })
    }, [])

    const onChangeOutput = (path: string) => {
        setOutput(path)
        ClientData.setStorage(conn.cid, 'backup-path', path, '')
    }

    return (
        <>
            <ScrollView className='min-h-0 flex-1' viewportClassName='p-4' axis='y'>
                <Options conn={conn} data={config} onChange={setConfig} />
            </ScrollView>

            <OutputPath value={output} onChange={onChangeOutput} />
            <CommandPreview command={commandString} />
            <Logs logs={logs} />

            <Footer
                conn={conn}
                config={config}
                commandString={commandString}
                output={output}
                pushLog={pushLog}
            />
        </>
    )
}

const Footer = ({
    conn,
    config,
    commandString,
    output,
    pushLog
}: {
    conn: Connection
    config: BackupConfig
    commandString: string
    output: string
    pushLog: ReturnType<typeof useLogs>['pushLog']
}) => {
    const [taskID, setTaskID] = useState<number | null>(null)
    const [unEventListen, setUnEventListen] = useState<UnlistenFn | null>(null)
    const [disabled, setDisabled] = useState<boolean>(false)
    const [stdoutSize, setStdoutSize] = useState<string>('')

    const onSubmit = async () => {
        setDisabled(true)
        setStdoutSize('')
        unEventListen?.()
        pushLog(Log.Info, `Running: ${commandString}`, true)
        try {
            let path = out.replaceVars(conn, output).trim()
            let { taskID, unlisten } = await DatabaseBackup.startBackup(config, path, (message) => {
                switch (message.type) {
                    case BackupMessageType.Stdout: {
                        setStdoutSize(formatBytesSize(message.value))
                        break
                    }
                    case BackupMessageType.StdoutCompleted: {
                        pushLog(Log.Success, `Backup completed: ${path}`)
                        setTaskID(null)
                        break
                    }
                    case BackupMessageType.Stderr: {
                        pushLog(Log.Error, 'Stderr: ' + message.value)
                        break
                    }
                    case BackupMessageType.Exit: {
                        pushLog(message.value === 0 ? Log.Success : Log.Error, `Exit code: ${message.value}`)
                        setTaskID(null)
                        break
                    }
                    case BackupMessageType.ExitWithKill: {
                        pushLog(Log.Error, 'Exit with kill')
                        setTaskID(null)
                        break
                    }
                    case BackupMessageType.IoError: {
                        pushLog(Log.Error, 'IO Error: ' + message.value)
                        setTaskID(null)
                        break
                    }
                }
            })
            setTaskID(taskID)
            setUnEventListen(() => unlisten)
        } catch (err: any) {
            pushLog(Log.Error, err)
        } finally {
            setDisabled(false)
        }
    }

    return (
        <footer className='flex items-center justify-end gap-3 border-t border-separator px-4 py-2'>
            {taskID !== null && (
                <>
                    <span className='text-xs tabular-nums text-tertiary'>{stdoutSize}</span>
                    <IconLoader2 className='animate-spin text-secondary' size={16} strokeWidth={1.6} />
                    <Button
                        className='min-w-24'
                        onClick={async () => {
                            await DatabaseBackup.cancelBackup(taskID)
                        }}
                    >
                        {t('cancel')}
                    </Button>
                </>
            )}

            {taskID === null && (
                <>
                    {disabled && (
                        <IconLoader2 className='animate-spin text-secondary' size={16} strokeWidth={1.6} />
                    )}
                    <Button disabled={disabled} primary className='min-w-24' onClick={onSubmit}>
                        {t('backup')}
                    </Button>
                </>
            )}
        </footer>
    )
}

const CommandPreview = ({ command }: { command: string | undefined }) => {
    return (
        <div className='flex items-center gap-2 px-4 pb-2 text-tertiary'>
            <IconCornerDownRight size={16} strokeWidth={1.6} className='shrink-0' />
            <ScrollView
                axis='y'
                className='min-w-0 flex-1 select-text break-words rounded border border-separator px-2 py-2 font-jb text-xs leading-4'
                viewportClassName='max-h-16'
                onContextMenu={(e) => e.stopPropagation()}
            >
                {command ?? t('loading')}
            </ScrollView>
        </div>
    )
}

const OutputPath = ({ value, onChange }: { value: string; onChange: (path: string) => void }) => {
    const onSelect = async () => {
        let path = await open({ directory: true })
        if (path !== null) {
            onChange(out.addFileName(path))
        }
    }

    return (
        <div className='relative flex items-center border-t border-separator px-4 py-2'>
            <IconFileArrowRight size={16} strokeWidth={1.4} className='mr-2 text-tertiary' />
            <Textarea
                placeholder={out.default}
                className='h-12 flex-1 resize-none break-words py-1'
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            <IconButton className='absolute right-4 top-2 h-7' title={t('select')} onClick={onSelect}>
                <IconFolder size={16} strokeWidth={1.6} />
            </IconButton>
        </div>
    )
}
