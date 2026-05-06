import { IconDots } from '@tabler/icons-react'
import { t } from '../../i18n'
import { ClientData, Connection, showSettingsWindow } from '../../tauri'
import {
    IconButton,
    showMessageBox,
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from '../../ui'
import { readSelectedFile, writeFileToSelectPath } from '../../utils/fs'
import { useCheckCreateConnection, useConnections } from './hooks'

export const ConnectionMenuActions = () => {
    const checker = useCheckCreateConnection()
    const { data, mutate } = useConnections()
    const connections = data ?? []

    return (
        <DropdownMenu
            trigger={
                <IconButton className='h-7'>
                    <IconDots size={16} strokeWidth={1.5} className='fill-current' />
                </IconButton>
            }
            className='min-w-24'
        >
            <DropdownMenuItem onClick={() => showSettingsWindow()}>{t('settings')}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel label={t('connection')} />
            <DropdownMenuItem
                onClick={() => {
                    importConnections(checker).finally(() => mutate())
                }}
            >
                {t('import')}
            </DropdownMenuItem>
            <DropdownMenuItem
                disabled={connections.length === 0}
                onClick={() => exportConnections(connections)}
            >
                {t('export')}
            </DropdownMenuItem>
        </DropdownMenu>
    )
}

interface ExportedFileFormat {
    version: number
    connections: Pick<Connection, 'name' | 'config'>[]
}

const filters = [{ name: 'JSON', extensions: ['json'] }]
const version = 1

type Checker = ReturnType<typeof useCheckCreateConnection>

const importConnections = async (checker: Checker) => {
    let content = await readSelectedFile('text', { filters })
    if (content === null) {
        return
    }
    try {
        let json: ExportedFileFormat = JSON.parse(content)
        if (json.version !== version) {
            throw `Unsupported file format version`
        }
        if (checker(json.connections.length)) {
            for (let item of json.connections) {
                await ClientData.createConnection(item.name, item.config)
            }
        }
    } catch (err: any) {
        showMessageBox(t('error'), err.toString(), 'error')
    }
}

const exportConnections = async (connections: Connection[]) => {
    const onClick = () => {
        const options = {
            defaultPath: `Dataflare-connections-${Date.now()}`,
            filters
        }
        const fileContent = () => {
            let json: ExportedFileFormat = {
                version,
                connections: connections.map(({ name, config }) => {
                    return { name, config }
                })
            }
            return JSON.stringify(json, null, 2)
        }
        writeFileToSelectPath(options, fileContent)
    }
    showMessageBox(t('export'), t('exportConnectionDesc'), 'warning', {
        label: t('export'),
        primary: true,
        onClick
    })
}
