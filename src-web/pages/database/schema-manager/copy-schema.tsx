import { IconDots } from '@tabler/icons-react'
import { Node } from '@xyflow/react'
import { useTranslation } from '../../../i18n'
import { DatabaseType, writeClipboardText } from '../../../tauri'
import { DropdownMenu, DropdownMenuItem, Button } from '../../../ui'
import { db } from '../db/db'
import { TableColumn, TableIndex, TableType } from '../db/db-types'
import { useConnection } from '../hooks/use-store'
import { TableNodeProps } from './table'

type Schema = TableNodeProps['data']

interface Props {
    disabled: boolean
    nodes: Node[] | undefined
}

export const CopySchema = (props: Props) => {
    const { t } = useTranslation()
    const type = useConnection().config.type
    return (
        <DropdownMenu
            trigger={
                <Button title={t('option')} disabled={props.disabled}>
                    <IconDots size={16} strokeWidth={1.5} className='nodrag fill-current' />
                </Button>
            }
            className='min-w-48'
        >
            <DropdownMenuItem onClick={() => copySqlTableSchema(props.nodes ?? [], type)}>
                Copy Table Schema
            </DropdownMenuItem>
        </DropdownMenu>
    )
}

// TODO: Get real DDL from database, views, foreign keys
const copySqlTableSchema = (nodes: Node[], databaseType: DatabaseType) => {
    let items = nodes
        .filter((item) => {
            let def = item.data as any as Schema
            return def.tableType === TableType.Table
        })
        .map((item) => {
            let def = item.data as any as Schema
            let entry = {
                schema: def.schema,
                table: def.tableName
            }
            let columns: TableColumn[] = def.columns.map((col) => {
                return {
                    name: col.name,
                    datatype: col.datatype,
                    defaultValue: col.defaultValue,
                    primaryKey: col.primaryKey,
                    notNull: col.notNull,
                    unique: false,
                    foreignKeys: []
                }
            })
            let indexs: TableIndex[] = Object.entries(def.indexs).map(([name, options]) => {
                return {
                    name,
                    option: {
                        unique: options.unique,
                        condition: null
                    },
                    columns: options.columns.map((col) => {
                        return {
                            name: col
                        }
                    })
                }
            })
            return db.createTableSql(entry, {
                columns,
                indexs,
                checks: []
            })
        })
        .flat()
        .join('\n\n')
    const sql = `-- Database: ${databaseType}

${items}
`
    return writeClipboardText(sql)
}
