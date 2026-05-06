import { memo, useRef, useState } from 'react'
import { useEffectEvent } from '../../../hooks/use-effect-event'
import { useTranslation } from '../../../i18n'
import { Sql, SqlConnection } from '../../../tauri'
import { showMessageBox, Direction, Pin, SplitView, Persistent, Loading } from '../../../ui'
import { useLanguageHighLight } from '../hooks/use-db'
import { useEditorFontOptions } from '../hooks/use-sql-editor-options'
import { useConnection } from '../hooks/use-store'
import { useRefreshTables } from '../hooks/use-tables'
import { SQLEditor, EditorUtils, GetSqlType } from '../sql-editor'
import { FormatActions } from './format'
import { QueryHistory } from './history'
import {
    useEditorCompletions,
    useQueryTasks,
    useQueryContent,
    useStatementsPosition,
    getTaskStatements
} from './hooks'
import { Result } from './result'
import { RunActions } from './run'

interface Props {
    hidden: boolean
    queryId: string
}

export const TableQuery = memo(({ queryId, hidden }: Props) => {
    const { t } = useTranslation()
    const fontOptions = useEditorFontOptions()
    const refreshTables = useRefreshTables()
    const { queryContent, updateQueryContent } = useQueryContent(queryId)
    const language = useLanguageHighLight()
    const connection = useConnection() as SqlConnection
    const editor = useRef<EditorUtils | null>(null)
    const [completions, refreshCompletions] = useEditorCompletions()
    const statementsPosition = useStatementsPosition(queryContent)
    const [tasksID, setTasksID] = useState(0)
    const { isRunning, tasks, runTasks, stopTasks, resetTasks } = useQueryTasks(connection.cid, queryId)
    const [selectedCode, setSelectedCode] = useState(false)

    const onFormatSql = useEffectEvent(() => {
        queryContent !== undefined && editor.current?.formatSQL()
    })
    const onMinifySql = useEffectEvent(() => {
        queryContent !== undefined && editor.current?.minifySQL()
    })

    const onRunSql = useEffectEvent(async (type: GetSqlType) => {
        try {
            const sqls = await getTaskStatements(editor, connection.config.type, type)
            if (sqls.length === 0) {
                return
            }
            setTasksID(tasksID + 1)
            const completedSqls = await runTasks(sqls)
            if (completedSqls.length > 0) {
                const type = await Sql.ddlType(connection.config.type, completedSqls)
                type.table && refreshTables()
                type.suggest && refreshCompletions()
            }
        } catch (err: any) {
            showMessageBox('Error', err, 'error')
        }
    })

    if (hidden) {
        if (selectedCode) {
            setSelectedCode(false)
        }
        return null
    }

    return (
        <>
            <div className='flex h-11 min-w-max shrink-0 items-center justify-end gap-2 border-b border-separator px-4'>
                <QueryHistory queryId={queryId} />
                <FormatActions onFormat={onFormatSql} onMinify={onMinifySql} />
                <RunActions
                    isRunning={isRunning}
                    selectedCode={selectedCode}
                    onRun={onRunSql}
                    onStop={stopTasks}
                />
            </div>

            <SplitView
                direction={Direction.Vertical}
                pin={Pin.Last}
                defaultPinSize={220}
                minPinSize={160}
                className='min-h-0 flex-1'
                id={queryId}
                persistent={Persistent.Temporary}
            >
                {queryContent === undefined ? (
                    <Loading />
                ) : (
                    <div className='flex h-full flex-col'>
                        <SQLEditor
                            editorID={queryId}
                            fontOptions={fontOptions}
                            language={language}
                            completions={completions}
                            statements={statementsPosition}
                            value={queryContent}
                            onChange={(value) => updateQueryContent(value)}
                            onChangeSelection={setSelectedCode}
                            onInit={(utils) => (editor.current = utils)}
                            onRunSql={onRunSql}
                            onFormatSql={onFormatSql}
                            onMinifySql={onMinifySql}
                        />
                    </div>
                )}

                {tasks !== undefined && (
                    <Result results={tasks} key={tasksID} queryId={queryId} onClose={resetTasks} />
                )}
            </SplitView>
        </>
    )
})
