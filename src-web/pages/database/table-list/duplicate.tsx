import { useState } from 'react'
import useSWRMutation from 'swr/mutation'
import { useTranslation } from '../../../i18n'
import { Button, ViewSqlButton, TextInput, showMessageBox, Popover, Popup, popoverSize } from '../../../ui'
import { BooleanSelect } from '../../connections/from'
import { db } from '../db/db'
import { Entry } from '../hooks/use-store'
import { useRefreshTables } from '../hooks/use-tables'
import { SqlPreview } from '../sql-preview'

// TODO: This component is not translated

interface Props {
    entry: Entry
    onClose: () => void
}

const DuplicateTable = ({ entry, onClose }: Props) => {
    const { t } = useTranslation()
    const [newTableName, setNewTableName] = useState(() => {
        return entry.table + '_copy'
    })
    const [duplicateRows, setDuplicateRows] = useState(true)
    const refreshTables = useRefreshTables()

    const sql = db.duplicateTableSql(entry, newTableName, duplicateRows)

    const { isMutating, trigger } = useSWRMutation('duplicate-table', () => {
        return db.execute(sql)
    })

    const onSubmit = async () => {
        try {
            await trigger()
            refreshTables()
            onClose()
        } catch (err: any) {
            showMessageBox(t('error'), err, 'error')
        }
    }

    return (
        <Popup title={`Duplicate ${entry.table}`} className='w-80 p-4' onClose={onClose}>
            <div className='grid grid-cols-[auto_1fr] gap-3'>
                <span className='text-xs tabular-nums leading-7 text-tertiary'>Name</span>
                <TextInput
                    className='w-full'
                    placeholder={t('tableName')}
                    value={newTableName}
                    onChange={setNewTableName}
                />
                <span className='text-xs tabular-nums leading-7 text-tertiary'>Data</span>
                <BooleanSelect
                    value={duplicateRows}
                    onChange={setDuplicateRows}
                    trueText='Include'
                    falseText='Not included'
                />
            </div>
            <div className='mt-4 flex justify-between'>
                <Popover side='top' trigger={<ViewSqlButton />}>
                    <SqlPreview className='px-4 py-2' value={sql} format style={popoverSize} />
                </Popover>
                <Button primary loading={isMutating} onClick={onSubmit}>
                    Duplicate
                </Button>
            </div>
        </Popup>
    )
}

export default DuplicateTable
