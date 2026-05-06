import { lazy, useState, Suspense } from 'react'
import { useTranslation } from '../../../i18n'
import {
    DropdownMenuItem,
    DropdownMenuSeparator,
    MessageAction,
    showMessageBox,
    showRenameDialog,
    SelectProps
} from '../../../ui'
import { db } from '../db/db'
import { useReadonly } from '../hooks/use-db'
import { TabType, useTabsStore } from '../hooks/use-store'
import { useRefreshTables, useTables } from '../hooks/use-tables'
import { ListMenu } from '../layout/menu'

const NewPopup = lazy(() => import('../layout/new-popup'))

// TODO: After schema update, need to:
// 1. Update opened tabs
// 2. Update auto-completion in Query

interface Props {
    schema: string
    setSchema: (schema: string) => void
    options: SelectProps['options']
}

export const SchemaMenu = ({ schema, setSchema, options }: Props) => {
    const { t } = useTranslation()
    const { data: tables, isValidating } = useTables()
    const refreshTable = useRefreshTables()
    const [showNewSchema, setShowNewSchema] = useState(false)

    return (
        <>
            <ListMenu
                name={schema}
                count={((tables ?? {})[schema] ?? []).length}
                selectOptions={options}
                selectValue={schema}
                onChange={setSchema}
                refreshing={isValidating}
                onRefresh={refreshTable}
            >
                <MenuItems schema={schema} setSchema={setSchema} onNewSchema={() => setShowNewSchema(true)} />
            </ListMenu>
            {showNewSchema && (
                <Suspense>
                    <NewPopup
                        title={t('newSchema')}
                        getSQL={(name) => db.createSchemaSql(name)}
                        onClose={(schema) => {
                            setShowNewSchema(false)
                            if (schema !== undefined) {
                                refreshTable().then(() => {
                                    setSchema(schema)
                                })
                            }
                        }}
                    />
                </Suspense>
            )}
        </>
    )
}

const MenuItems = ({
    schema,
    setSchema,
    onNewSchema
}: {
    schema: string
    setSchema: (schema: string) => void
    onNewSchema: () => void
}) => {
    const { t, tf } = useTranslation()
    const readonly = useReadonly()
    const refreshTable = useRefreshTables()
    const switchTabTo = useTabsStore((state) => state.switchTabTo)

    const onDropSchema = () => {
        const run = async (cascade: boolean) => {
            try {
                await db.dropSchema(schema, cascade)
                refreshTable()
            } catch (err: any) {
                showMessageBox(t('error'), err, 'error')
            }
        }
        const actions: MessageAction[] = [
            {
                label: 'Drop',
                primary: true,
                onClick: () => run(false)
            }
        ]
        if (db.allowCascadeDropSchema()) {
            actions.unshift({
                label: 'Drop (Cascade)',
                onClick: () => run(true)
            })
        }
        showMessageBox(t('dropSchema'), tf('dropSchemaMessage', schema), 'delete', actions)
    }

    const onRenameSchema = () => {
        showRenameDialog({
            from: schema,
            onHandler: (to) => {
                return db.renameSchema(schema, to)
            },
            onSuccess: (newName) => {
                refreshTable().then(() => {
                    setSchema(newName)
                })
            }
        })
    }

    return (
        <>
            <DropdownMenuItem
                onClick={() =>
                    switchTabTo({
                        type: TabType.Create,
                        defaultSchema: schema
                    })
                }
            >
                {t('newTable')}
            </DropdownMenuItem>
            {db.allowCreateSchema() && (
                <>
                    <DropdownMenuItem disabled={readonly} onClick={onNewSchema}>
                        {t('newSchema')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {db.allowRenameSchema() && (
                        <DropdownMenuItem disabled={readonly} onClick={onRenameSchema}>
                            {t('renameSchema')}
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem disabled={readonly} onClick={onDropSchema}>
                        {t('dropSchema')}
                    </DropdownMenuItem>
                </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
                onClick={() =>
                    switchTabTo({
                        type: TabType.Dashboard
                    })
                }
            >
                {t('dashboard')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
                onClick={() =>
                    switchTabTo({
                        type: TabType.SchemaManager,
                        defaultSchema: schema
                    })
                }
            >
                {t('schemaManager')}
            </DropdownMenuItem>
            {db.supportFunctions() && (
                <DropdownMenuItem
                    onClick={() =>
                        switchTabTo({
                            type: TabType.FunctionManager
                        })
                    }
                >
                    {t('functionManager')}
                </DropdownMenuItem>
            )}
            {db.supportTriggers() && (
                <DropdownMenuItem
                    onClick={() =>
                        switchTabTo({
                            type: TabType.TriggerManager
                        })
                    }
                >
                    {t('triggerManager')}
                </DropdownMenuItem>
            )}
            {db.supportExtensions() && (
                <DropdownMenuItem
                    onClick={() =>
                        switchTabTo({
                            type: TabType.ExtensionManager
                        })
                    }
                >
                    {t('extensionManager')}
                </DropdownMenuItem>
            )}
        </>
    )
}
