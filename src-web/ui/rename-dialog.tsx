import { useState } from 'react'
import { t } from '../i18n'
import { Button } from './button'
import { TextInput } from './input'
import { showMessageBox } from './message-box'
import { Popup } from './popup'

export interface RenameDialogProps {
    from: string
    onHandler: (to: string) => Promise<any>
    onSuccess: (newName: string) => void
}

type Callback = (option: RenameDialogProps) => void

let recver: null | Callback = null

export const showRenameDialog = (option: RenameDialogProps) => {
    if (recver === null) {
        console.error('RenameDialog is not init!')
        return
    }
    recver(option)
}

export const RenameDialog = () => {
    const [option, setOption] = useState<RenameDialogProps | null>(null)
    const [newValue, setNewValue] = useState('')
    const [loading, setLoading] = useState(false)

    if (recver === null) {
        recver = (option) => {
            setOption(option)
            setNewValue(option.from)
        }
    }

    if (option === null) {
        return null
    }

    const onSubmit = async () => {
        if (option.from === newValue) {
            return setOption(null)
        }
        setLoading(true)
        try {
            await option.onHandler(newValue)
            setLoading(false)
            setOption(null)
            option.onSuccess(newValue)
        } catch (err: any) {
            setLoading(false)
            showMessageBox(t('error'), err, 'error')
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit()
    }

    return (
        <Popup title={t('rename')} disableClose={loading} onClose={() => setOption(null)}>
            <form onSubmit={handleSubmit} className='flex w-72 flex-col gap-4 p-4'>
                <TextInput placeholder={option.from} value={newValue} onChange={setNewValue} />
                <Button primary loading={loading} type='submit'>
                    {t('ok')}
                </Button>
            </form>
        </Popup>
    )
}
