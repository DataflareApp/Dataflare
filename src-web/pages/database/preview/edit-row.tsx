import { IconEdit, IconRowInsertBottom } from '@tabler/icons-react'
import { Ref, forwardRef } from 'react'
import useSWRMutation from 'swr/mutation'
import { useTranslation } from '../../../i18n'
import { Value } from '../../../tauri'
import { Button, ViewSqlButton, showMessageBox, Popover, ScrollView, popoverSize } from '../../../ui'
import { KeyModifier, keyboardTitleChars } from '../../../utils/keyboard-char'
import { EditValue, InsertRowData, Column, db, DEFAULT } from '../db/db'
import { useReadonly } from '../hooks/use-db'
import { Entry } from '../hooks/use-store'
import { SqlPreview } from '../sql-preview'
import { CellInput } from './cell-input'

export const enum EditType {
    Update,
    Insert
}

interface EditRowButtonProps {
    type: EditType
    primary: boolean
    onClick: () => void
}

export const EditRowButton = ({ type, primary, onClick }: EditRowButtonProps) => {
    const { t } = useTranslation()
    const title = type === EditType.Insert ? t('insertRow') : t('updateRow')
    return (
        <Button
            primary={primary}
            title={keyboardTitleChars(title, [KeyModifier.Meta, 'I'])}
            onClick={onClick}
        >
            {type === EditType.Insert ? (
                <IconRowInsertBottom size={16} stroke={1.5} />
            ) : (
                <IconEdit size={16} stroke={1.5} />
            )}
        </Button>
    )
}

export type EditData =
    | {
          type: EditType.Insert
          values: InsertRowData
      }
    | {
          type: EditType.Update
          where: { column: string; value: Value }[]
          oldValue: InsertRowData
          values: InsertRowData
      }

interface Props {
    saveColumnSizeID: string
    entry: Entry
    data: EditData
    onChangeData: (data: EditData) => void
    columns: Column[]
    onEditSuccess: () => void
}

const EditRowComponent = (
    { saveColumnSizeID, entry, data, onChangeData, columns, onEditSuccess }: Props,
    ref: Ref<HTMLDivElement>
) => {
    const { t } = useTranslation()
    const readonly = useReadonly()
    const { trigger: triggerEdit, isMutating: triggerLoading } = useSWRMutation(
        ['edit-row', entry.schema, entry.table, data.type],
        () => {
            return db.execute(toEditDataSql(entry, data))
        }
    )

    const onChange = (name: string, value: EditValue | undefined) => {
        const newValues = { ...data.values }
        if (value === undefined) {
            delete newValues[name]
        } else {
            newValues[name] = value
        }
        onChangeData({
            ...data,
            values: newValues
        })
    }

    const onSubmit = () => {
        if (data.type === EditType.Update && data.where.length === 0) {
            return showMessageBox(t('updateFailed'), t('primaryKeyNotFound'), 'error')
        }
        triggerEdit()
            .then(onEditSuccess)
            .catch((err: any) => {
                showMessageBox(t('error'), err, 'error')
            })
    }

    return (
        <div className='flex h-full animate-overlayIn flex-col'>
            <ScrollView axis='y' className='flex flex-col' viewportClassName='py-2' ref={ref}>
                {columns.map((item, i) => {
                    const changed =
                        data.values[item.name] === undefined
                            ? false
                            : data.type === EditType.Insert
                              ? true
                              : !editValueEq(data.values[item.name], data.oldValue[item.name])
                    return (
                        <CellInput
                            key={item.name}
                            column={item}
                            autoFocus={i === 0}
                            data={data.values[item.name]}
                            changed={changed}
                            onChange={(data) => onChange(item.name, data)}
                            savedSizeID={`RowEditor-${saveColumnSizeID}.${item.name}`}
                        />
                    )
                })}
            </ScrollView>
            <div className='flex justify-between px-4 py-2'>
                <Popover side='left' trigger={<ViewSqlButton />}>
                    <Preview entry={entry} data={data} />
                </Popover>
                {!readonly && (
                    <Button primary className='w-20' loading={triggerLoading} onClick={onSubmit}>
                        {data.type === EditType.Insert ? t('insert') : t('update')}
                    </Button>
                )}
            </div>
        </div>
    )
}

export const EditRow = forwardRef(EditRowComponent)

const Preview = ({ entry, data }: { entry: Entry; data: EditData }) => {
    const sql = toEditDataSql(entry, data)
    return <SqlPreview className='px-4 py-2' format value={sql} style={popoverSize} />
}

const editValueEq = (a: EditValue, b: EditValue): boolean => {
    if (a === DEFAULT || b === DEFAULT) {
        return a === b
    }
    if (a === null || b === null) {
        return a === b
    }
    if (a instanceof Uint8Array || b instanceof Uint8Array) {
        // Since comparing two Uint8Arrays for equality is very slow, only compare references here
        // If re-edited, even if the content is the same, it will be considered unequal
        return a === b
    }
    return a.raw === b.raw && a.value === b.value
}

// TODO: Don't block the main thread
const toEditDataSql = (entry: Entry, data: EditData): string => {
    if (data.type === EditType.Insert) {
        return db.insertRowSql(entry, data.values)
    } else {
        const newValues = { ...data.values }
        Object.entries(data.values).forEach(([column, value]) => {
            if (editValueEq(value, data.oldValue[column])) {
                delete newValues[column]
            }
        })
        return db.updateTableRowSql(entry, newValues, data.where)
    }
}
