import { useEffect, useState } from 'react'
import { t } from '../../i18n'
import { Connection, readClipboardText } from '../../tauri'
import { showMessageBox, Textarea, Popup, Button } from '../../ui'

export default function ImportFromUrl({
    onClose,
    onCreate
}: {
    onClose: () => void
    onCreate: (config: Connection) => void
}) {
    const [value, setValue] = useState('')

    useEffect(() => {
        readClipboardText().then((text) => {
            if (text !== null && text.length <= 1024 * 2 && /^\s*[a-zA-Z0-9-]+:/.test(text)) {
                setValue(text)
            }
        })
    }, [])

    const onSubmit = () => {
        import('./utils')
            .then((module) => module.parseConnectionURL(value))
            .then(onCreate)
            .catch((err: any) => {
                showMessageBox(t('error'), err, 'error')
            })
    }

    return (
        <Popup title={t('importFromURL')} onClose={onClose} className='w-96 p-4'>
            <Textarea
                className='h-20 w-full resize-none py-1'
                placeholder='postgresql://user@localhost:5432/db'
                value={value}
                onChange={(e) => setValue(e.target.value)}
            />
            <Button disabled={value === ''} primary className='mt-4 w-full' onClick={onSubmit}>
                {t('import')}
            </Button>
        </Popup>
    )
}
