import { IconExclamationCircle, IconLoader2, IconPlugConnected, IconSearch } from '@tabler/icons-react'
import { useTranslation } from '../../../i18n'
import { showConnectionsWindow } from '../../../tauri'
import { Button, IconButton, ConnectionIcon, Popover } from '../../../ui'
import { keyboardTitleChars, KeyModifier } from '../../../utils/keyboard-char'
import { useCommandSearch } from '../command-search'
import { useDbStore } from '../hooks/use-store'
import { ManageDatabase } from './database'

export const Header = () => {
    const { t } = useTranslation()
    const { connect, connectError, connection, connectID, connectedID } = useDbStore()
    const showCommandSearch = useCommandSearch((state) => state.showCommandSearch)

    return (
        <>
            <div className='mb-1 flex min-h-11 items-center gap-2 px-4'>
                {connectedID !== null && <ConnectionIcon type={connection.config.type} />}

                {connectID === null && (
                    <IconLoader2
                        size={16}
                        className='aspect-square animate-spin text-primary'
                        strokeWidth={1.6}
                    />
                )}

                {connectID !== null && connectedID === null && (
                    <Popover
                        trigger={
                            <IconButton title={t('error')} className='-mx-2'>
                                <IconExclamationCircle size={16} className='aspect-square w-4 text-red-600' />
                            </IconButton>
                        }
                        className='max-w-xs px-4 py-3'
                    >
                        <p
                            className='select-text break-words text-sm text-primary'
                            onContextMenu={(e) => e.stopPropagation()}
                        >
                            {connectError}
                        </p>
                        <Button className='mx-auto mt-3' onClick={() => connect(connection)}>
                            {t('reconnect')}
                        </Button>
                    </Popover>
                )}

                <h1
                    className='ml-1 w-0 flex-1 truncate text-sm font-medium text-primary'
                    title={connection.name}
                >
                    {connection.name}
                </h1>

                <div className='flex'>
                    <IconButton
                        title={keyboardTitleChars(t('manageConnection'), [KeyModifier.Meta, 'N'])}
                        onClick={showConnectionsWindow}
                    >
                        <IconPlugConnected size={16} strokeWidth={1.5} />
                    </IconButton>
                    <ManageDatabase />
                    <IconButton
                        title={keyboardTitleChars(t('quickSearch'), [KeyModifier.Meta, 'P'])}
                        onClick={showCommandSearch}
                    >
                        <IconSearch size={16} strokeWidth={1.5} />
                    </IconButton>
                </div>
            </div>
        </>
    )
}
