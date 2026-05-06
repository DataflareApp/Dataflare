import { useState } from 'react'
import useSWRMutation from 'swr/mutation'
import { useTranslation } from '../../../i18n'
import { Button, ViewSqlButton, TextInput, showMessageBox, Popover, Popup, popoverSize } from '../../../ui'
import { db } from '../db/db'
import { SqlPreview } from '../sql-preview'

interface Props {
    title: string
    getSQL: (name: string) => string
    onClose: (name?: string) => void
}

export default function NewPopup({ onClose, title, getSQL }: Props) {
    const { t } = useTranslation()
    const [name, setName] = useState('')
    const sql = getSQL(name)
    const { isMutating, trigger } = useSWRMutation(title, () => {
        return db.execute(sql)
    })

    const onSubmit = async () => {
        try {
            await trigger()
            onClose(name)
        } catch (err: any) {
            showMessageBox(t('error'), err, 'error')
        }
    }

    return (
        <Popup title={title} className='w-80 p-4' onClose={onClose} disableClose={isMutating}>
            <div className='grid grid-cols-[auto_1fr] gap-3'>
                <span className='text-xs leading-7 text-tertiary'>{t('name')}</span>
                <TextInput className='w-full' value={name} onChange={setName} />
            </div>

            <div className='mt-4 flex justify-between'>
                <Popover side='top' trigger={<ViewSqlButton />}>
                    <SqlPreview className='px-4 py-2' value={sql} style={popoverSize} />
                </Popover>
                <Button primary loading={isMutating} onClick={onSubmit}>
                    {t('create')}
                </Button>
            </div>
        </Popup>
    )
}
