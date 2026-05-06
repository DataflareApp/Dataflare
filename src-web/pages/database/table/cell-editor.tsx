import { IconFileDownload } from '@tabler/icons-react'
import { ChangeEvent, useState } from 'react'
import { useElementStoreSize } from '../../../hooks/use-size'
import { useTranslation } from '../../../i18n'
import { Value } from '../../../tauri'
import { Button, IconButton, Textarea, IconCopyButton } from '../../../ui'
import { writeFileToSelectPath } from '../../../utils/fs'
import { DEFAULT, EditValue } from '../db/db'
import { CellActionMenu, RawSqlButton, cellDisplayValue, cellPlaceholderValue } from '../preview/cell-input'
import { displayDatabaseValue } from './utils'

interface CellEditorProps {
    readonly: boolean
    savedCellSizeID: string
    datatype: string
    originValue: Value
    editValue: EditValue
    onClose: () => void
    onSubmit: (value: EditValue) => void
    children?: React.ReactNode
}

export const CellEditor = ({
    readonly,
    savedCellSizeID,
    datatype,
    originValue,
    editValue,
    onClose,
    onSubmit,
    children
}: CellEditorProps) => {
    const { t } = useTranslation()
    const [newValue, setNewValue] = useState(editValue)
    const showSave = originValue instanceof Uint8Array
    const showRawSql =
        !readonly && newValue !== null && newValue !== DEFAULT && !(newValue instanceof Uint8Array)

    const { ref, defaultSize } = useElementStoreSize(savedCellSizeID)

    const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        if (newValue !== null && newValue !== DEFAULT && !(newValue instanceof Uint8Array)) {
            setNewValue({
                raw: newValue.raw,
                value: e.target.value
            })
        } else {
            setNewValue({
                raw: false,
                value: e.target.value
            })
        }
    }

    return (
        <div className='flex flex-col gap-3 px-4 pb-4 pt-2.5'>
            <h3 className='-mb-1 flex items-center gap-1'>
                <span className='mr-auto max-w-28 truncate text-xs text-secondary'>{datatype}</span>
                {children}
                <IconCopyButton getCopyText={() => displayDatabaseValue(originValue)} />
                {showSave && (
                    <IconButton
                        title={t('saveAsFile')}
                        onClick={() => writeFileToSelectPath({}, originValue)}
                    >
                        <IconFileDownload size={16} stroke={1.5} />
                    </IconButton>
                )}
                {showRawSql && (
                    <RawSqlButton
                        raw={newValue.raw}
                        onClick={() =>
                            setNewValue({
                                raw: !newValue.raw,
                                value: newValue.value
                            })
                        }
                    />
                )}
                {!readonly && <CellActionMenu onChange={setNewValue} />}
            </h3>

            <Textarea
                ref={ref}
                className='h-12 w-56 resize py-1'
                style={{
                    minHeight: 48,
                    maxHeight: '50vh',
                    minWidth: 224,
                    maxWidth: 'calc(100vw - 64px)',
                    ...defaultSize
                }}
                autoFocus
                readOnly={readonly}
                placeholder={cellPlaceholderValue(newValue)}
                value={cellDisplayValue(newValue)}
                onChange={onChange}
            />

            {!readonly && (
                <Button
                    primary
                    className='-mb-1 w-full'
                    onClick={() => {
                        onSubmit(newValue)
                        onClose()
                    }}
                >
                    {t('ok')}
                </Button>
            )}
        </div>
    )
}
