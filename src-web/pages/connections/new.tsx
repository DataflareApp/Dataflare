import { IconLink } from '@tabler/icons-react'
import { lazy, useState, Suspense } from 'react'
import { useTranslation } from '../../i18n'
import { Connection, ALL_DATABASE_TYPE, DatabaseType } from '../../tauri'
import {
    Button,
    ConnectionIcon,
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuSeparator,
    ScrollView
} from '../../ui'
import { useCheckCreateConnection } from './hooks'

const ImportConnection = lazy(() => import('./import'))

export const NewConnectionMenu = ({ onCreate }: { onCreate(config: Connection): void }) => {
    const { t } = useTranslation()
    const checker = useCheckCreateConnection()
    const [showImportUrl, setShowImportUrl] = useState(false)

    const onClickImport = () => {
        if (checker(1)) {
            setShowImportUrl(true)
        }
    }

    const onClickItem = (type: DatabaseType) => {
        if (checker(1)) {
            import('./utils')
                .then((module) => module.createConnectionConfig(type))
                .then((config) => onCreate(config))
        }
    }

    return (
        <>
            <DropdownMenu trigger={<Button className='flex-1'>{t('newConnection')}</Button>} className='!p-0'>
                <ScrollView axis='y' viewportClassName='max-h-[calc(50vh+100px)] p-1'>
                    <DropdownMenuItem className='gap-2' onClick={onClickImport}>
                        <IconLink size={16} strokeWidth={1.5} className='text-primary' />
                        {t('importFromURL')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {ALL_DATABASE_TYPE.map((item) => {
                        return (
                            <DropdownMenuItem key={item} className='gap-2' onClick={() => onClickItem(item)}>
                                <ConnectionIcon type={item} />
                                {item}
                            </DropdownMenuItem>
                        )
                    })}
                </ScrollView>
            </DropdownMenu>

            {showImportUrl && (
                <Suspense>
                    <ImportConnection
                        onClose={() => setShowImportUrl(false)}
                        onCreate={(c) => {
                            setShowImportUrl(false)
                            onCreate(c)
                        }}
                    />
                </Suspense>
            )}
        </>
    )
}
