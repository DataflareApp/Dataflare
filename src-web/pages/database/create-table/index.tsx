import { Reorder } from 'framer-motion'
import { useState, memo } from 'react'
import useSWRMutation from 'swr/mutation'
import { useScrollUtils } from '../../../hooks/use-scroll'
import { useTranslation } from '../../../i18n'
import {
    Button,
    ViewSqlButton,
    TextInput,
    showMessageBox,
    Popover,
    ScrollView,
    Select,
    popoverSize
} from '../../../ui'
import { db, NewTableData, TableType } from '../db/db'
import { useReadonly, useSchemaOptions } from '../hooks/use-db'
import { Entry, TabType, useTabsStore } from '../hooks/use-store'
import { useTables } from '../hooks/use-tables'
import { SqlPreview } from '../sql-preview'
import { AddItem } from './buttons'
import { CheckItem, ChecksHeader } from './checks'
import { ColumnHeader, ColumnItem } from './columns'
import { useIndexColumnSuggestions, useNewTableData } from './hooks'
import { IndexHeader, IndexItem } from './indexs'

interface Props {
    hidden: boolean
    defaultSchema?: string
}

export const TableCreate = memo(({ hidden, defaultSchema }: Props) => {
    const { t } = useTranslation()
    const readonly = useReadonly()
    const replaceTab = useTabsStore((state) => state.replaceTab)
    const { data: tables, mutate: refreshTables } = useTables()
    const [schema, setSchema] = useState(defaultSchema ?? '')
    const { schemas, selectOptions } = useSchemaOptions(tables)
    const [tableName, setTableName] = useState('')
    const {
        tableData,
        updateColumn,
        addColumn,
        deleteColumn,
        setColumns,
        updateIndex,
        addIndex,
        deleteIndex,
        updateCheck,
        addCheck,
        deleteCheck
    } = useNewTableData()
    const ref = useScrollUtils()

    const indexColumnSuggestions = useIndexColumnSuggestions(tableData.columns)

    const { isMutating: loading, trigger } = useSWRMutation('new-table', () => {
        const sqls = db.createTableSql({ schema, table: tableName }, tableData)
        if (sqls.length > 1) {
            return db.transaction(sqls)
        } else {
            return db.execute(sqls[0]).then((_) => {})
        }
    })

    if (hidden) {
        return null
    }

    if (schemas.length === 0) {
        // No schemas available
        if (schema !== '') {
            setSchema('')
        }
    } else {
        // Selected schema does not exist
        if (!schemas.includes(schema)) {
            setSchema(schemas[0])
        }
    }

    const onSubmit = async () => {
        try {
            await trigger()
        } catch (err: any) {
            return showMessageBox(t('createFailed'), err, 'error')
        }
        refreshTables()
        replaceTab({
            from: {
                type: TabType.Create
            },
            to: {
                type: TabType.Preview,
                entry: {
                    schema,
                    table: tableName
                },
                tableType: TableType.Table
            }
        })
    }

    return (
        <div className='flex flex-1 flex-col overflow-hidden'>
            <div className='flex h-11 min-w-max items-center gap-2 px-4'>
                <Select className='w-40' value={schema} onChange={setSchema} options={selectOptions} />
                <TextInput
                    placeholder={t('tableName')}
                    className='mr-auto w-32'
                    value={tableName}
                    onChange={(val) => setTableName(val)}
                />
                <Popover trigger={<ViewSqlButton />} side='left'>
                    <SqlContent schema={schema} table={tableName} tableData={tableData} />
                </Popover>
                {!readonly && (
                    <Button primary className='w-24' loading={loading} onClick={onSubmit}>
                        {t('create')}
                    </Button>
                )}
            </div>

            <ScrollView axis='both' border className='flex-1' viewportClassName='pb-4' ref={ref}>
                <Reorder.Group
                    className='flex min-w-min flex-col gap-2'
                    axis='y'
                    values={tableData.columns}
                    onReorder={setColumns}
                >
                    <ColumnHeader />
                    {tableData.columns.map((item, i) => {
                        return (
                            <ColumnItem
                                key={item.id}
                                column={item}
                                onUpdate={(k, v) => updateColumn(i, k, v)}
                                onDelete={() => deleteColumn(i)}
                            />
                        )
                    })}
                    <AddItem name={t('column')} onClick={addColumn} />

                    <IndexHeader />
                    {tableData.indexs.map((item, i) => {
                        return (
                            <IndexItem
                                key={i}
                                index={item}
                                columnSuggestions={indexColumnSuggestions}
                                onUpdate={(k, v) => updateIndex(i, k, v)}
                                onDelete={() => deleteIndex(i)}
                            />
                        )
                    })}
                    <AddItem name={t('index')} onClick={addIndex} />

                    <ChecksHeader />
                    {tableData.checks.map((item, i) => {
                        return (
                            <CheckItem
                                key={i}
                                check={item}
                                onUpdate={(k, v) => updateCheck(i, k, v)}
                                onDelete={() => deleteCheck(i)}
                            />
                        )
                    })}
                    <AddItem name={t('check')} onClick={addCheck} />
                </Reorder.Group>
            </ScrollView>
        </div>
    )
})

const SqlContent = ({ schema, table, tableData }: Entry & { tableData: NewTableData }) => {
    const sqls = db.createTableSql({ schema, table }, tableData)
    return <SqlPreview value={sqls.join('\n')} format className='px-4 py-2' style={popoverSize} />
}
