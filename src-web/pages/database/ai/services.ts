import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import {
    ChatAddToolApproveResponseFunction,
    ChatRequestOptions,
    ChatTransport,
    InferAgentUIMessage,
    InferUITools,
    LanguageModel,
    ToolLoopAgent,
    ToolUIPart,
    UIMessageChunk,
    convertToModelMessages,
    isToolUIPart,
    stepCountIs,
    tool
} from 'ai'
import { MutableRefObject } from 'react'
import { z } from 'zod'
import { t } from '../../../i18n'
import {
    ProviderConfig,
    ProviderType,
    QueryData,
    SafeJsonValue,
    ClientData,
    Sql,
    SqlDatabaseType,
    toSafeJsonValue
} from '../../../tauri'
import { defaultBaseURL, normalizeBaseURL } from '../../settings/provider/api'
import { db } from '../db/db'
import { useDbStore } from '../hooks/use-store'
import { useProviderModel } from './hooks'

export const enum ToolName {
    listDatabaseSchemas = 'listDatabaseSchemas',
    getDatabaseSchema = 'getDatabaseSchema',
    getTableSchema = 'getTableSchema',
    getColumnSampleValues = 'getColumnSampleValues',
    runSQLQuery = 'runSQLQuery',
    generateChart = 'generateChart'
}

export const availableTools = () => {
    let tools = [
        { name: ToolName.listDatabaseSchemas, allowAutoapproval: true },
        { name: ToolName.getDatabaseSchema, allowAutoapproval: true },
        { name: ToolName.getTableSchema, allowAutoapproval: true },
        { name: ToolName.getColumnSampleValues, allowAutoapproval: true },
        { name: ToolName.runSQLQuery, allowAutoapproval: false },
        { name: ToolName.generateChart, allowAutoapproval: false }
    ]
    if (!db.supportsMultipleSchemas()) {
        tools.shift()
    }
    return tools
}

const AutoApprove = z.record(z.string(), z.boolean())
type AutoApprove = z.infer<typeof AutoApprove>

export const Storage = {
    key: 'toolAutoApprove',
    cache: null as AutoApprove | null,
    getApproval: async (): Promise<AutoApprove> => {
        if (Storage.cache !== null) {
            return Storage.cache
        }
        const cid = useDbStore.getState().connection.cid
        const stored = await ClientData.getStorage(cid, Storage.key, AutoApprove)
        Storage.cache = stored
        return stored ?? {}
    },
    setApproval: async (record: AutoApprove): Promise<void> => {
        Storage.cache = record
        const cid = useDbStore.getState().connection.cid
        await ClientData.setStorage(cid, Storage.key, record)
    },
    needsApproval: async (toolId: ToolName): Promise<boolean> => {
        const approvals = await Storage.getApproval()
        return !(approvals[toolId] ?? false)
    }
}

const createLanguageModel = (config: ProviderConfig, modelID: string): LanguageModel => {
    let baseURL = normalizeBaseURL(config.baseURL, undefined)
    switch (config.type) {
        case ProviderType.Anthropic: {
            const anthropic = createAnthropic({
                apiKey: config.apiKey,
                baseURL,
                headers: {
                    'anthropic-dangerous-direct-browser-access': 'true',
                    'dangerouslyAllowBrowser': 'true'
                }
            })
            return anthropic(modelID)
        }
        case ProviderType.GoogleGemini: {
            const googleGemini = createGoogleGenerativeAI({ apiKey: config.apiKey, baseURL })
            return googleGemini(modelID)
        }
        case ProviderType.DeepSeek:
        case ProviderType.GitHubModels:
        case ProviderType.Groq:
        case ProviderType.Mistral:
        case ProviderType.Ollama:
        case ProviderType.OpenAI:
        case ProviderType.OpenRouter:
        case ProviderType.VercelAIGateway:
        case ProviderType.xAI:
        case ProviderType.OpenAICompatible: {
            const openai = createOpenAICompatible({
                name: 'openai-compatible',
                apiKey: config.apiKey,
                baseURL: baseURL ?? defaultBaseURL(config.type)
            })
            return openai(modelID)
        }
    }
}

const databaseName = (type: SqlDatabaseType): string => {
    switch (type) {
        case SqlDatabaseType.Sqlite:
        case SqlDatabaseType.EchoLite: {
            return 'SQLite'
        }
        case SqlDatabaseType.SqlCipher: {
            return 'SQLCipher(SQLite compatible)'
        }
        case SqlDatabaseType.Rqlite: {
            return 'rqlite(SQLite compatible)'
        }
        case SqlDatabaseType.CloudflareD1: {
            return 'Cloudflare D1(SQLite compatible)'
        }
        case SqlDatabaseType.Turso: {
            return 'Turso/libSQL(SQLite compatible)'
        }
        case SqlDatabaseType.MsSql: {
            return 'Microsoft SQL Server(MSSQL)'
        }
        case SqlDatabaseType.WorkersAnalyticsEngine: {
            return 'Cloudflare Workers Analytics Engine'
        }
        case SqlDatabaseType.Presto: {
            return 'PrestoDB'
        }
        case SqlDatabaseType.Postgres:
        case SqlDatabaseType.CockroachDB:
        case SqlDatabaseType.QuestDB:
        case SqlDatabaseType.MySql:
        case SqlDatabaseType.MariaDB:
        case SqlDatabaseType.ManticoreSearch:
        case SqlDatabaseType.ClickHouse:
        case SqlDatabaseType.Databend:
        case SqlDatabaseType.Databricks:
        case SqlDatabaseType.BigQuery:
        case SqlDatabaseType.Trino:
        case SqlDatabaseType.DuckDB:
        case SqlDatabaseType.R2Sql: {
            return type
        }
    }
}

const createAgentTools = (type: SqlDatabaseType, readonly: boolean) => {
    const multipleSchemas = db.supportsMultipleSchemas()

    const [minSample, defaultSample, maxSample] = [1, 5, 20]
    const sampleDescribe = `The maximum number of sample values to retrieve (${minSample}-${maxSample}), default: ${defaultSample}`

    return {
        [ToolName.listDatabaseSchemas]: tool({
            description: 'Get all available schemas/databases in the current database connection.',
            strict: true,
            inputSchema: z.object({}),
            needsApproval: () => {
                return Storage.needsApproval(ToolName.listDatabaseSchemas)
            },
            execute: async () => {
                const { currentSchema, schemas } = await db.schemas()
                return {
                    currentSchema,
                    schemas
                }
            }
        }),
        [ToolName.getDatabaseSchema]: tool({
            description:
                'Get the database schema information including tables and their columns, foreign keys.',
            strict: false,
            inputSchema: (multipleSchemas
                ? z.object({ schemaName: z.string() })
                : z.object({})) as z.ZodType<{ schemaName?: string }>,
            needsApproval: () => {
                return Storage.needsApproval(ToolName.getDatabaseSchema)
            },
            execute: async ({ schemaName }) => {
                const [schemaTables, schemaForeignKeys] = await Promise.all([
                    db.schemaTables(schemaName ?? ''),
                    db.schemaForeignKeys(schemaName ?? '')
                ])
                return {
                    tables: schemaTables,
                    foreignKeys: schemaForeignKeys.map((fk) => {
                        return {
                            table: fk.fromTable,
                            column: fk.fromColumn,
                            referencedTable: fk.toTable,
                            referencedColumn: fk.toColumn
                        }
                    })
                    // NOTE: Previously returned 'indexs' here, removed since it was not very useful
                }
            }
        }),
        [ToolName.getTableSchema]: tool({
            description: 'Get the table schema information including columns, foreign keys, and indexes.',
            strict: true,
            inputSchema: (multipleSchemas
                ? z.object({
                      schemaName: z.string(),
                      tableName: z.string()
                  })
                : z.object({
                      tableName: z.string()
                  })) as z.ZodType<{ schemaName?: string; tableName: string }>,
            needsApproval: async () => {
                return Storage.needsApproval(ToolName.getTableSchema)
            },
            execute: async ({ schemaName, tableName }) => {
                const [columns, foreignKeys, indexs] = await Promise.all([
                    db.tableColumnsInfo(schemaName ?? '', tableName),
                    db.foreignKeys({ schema: schemaName ?? '', table: tableName }),
                    db.tableIndexs({ schema: schemaName ?? '', table: tableName })
                ])
                return {
                    columns: columns.map((col) => {
                        const fks = foreignKeys[col.name] ?? []
                        return {
                            ...col,
                            foreignKeys: fks.map((fk) => {
                                return {
                                    referencedSchema: fk.toTable.schema,
                                    referencedTable: fk.toTable.table,
                                    referencedColumn: fk.toColumn
                                }
                            })
                        }
                    }),
                    indexs: indexs.map((idx) => {
                        return {
                            indexName: idx.name,
                            unique: idx.option.unique,
                            columns: idx.columns.map((col) => col.name)
                        }
                    })
                }
            }
        }),
        [ToolName.getColumnSampleValues]: tool({
            description:
                'Get distinct sample values from columns to understand their value distribution and value format.',
            strict: true,
            inputSchema: (multipleSchemas
                ? z.object({
                      schemaName: z.string(),
                      tableName: z.string(),
                      columns: z.array(z.string()),
                      limit: z.number().describe(sampleDescribe)
                  })
                : z.object({
                      tableName: z.string(),
                      columns: z.array(z.string()),
                      limit: z.number().describe(sampleDescribe)
                  })) as z.ZodType<{
                schemaName?: string
                tableName: string
                columns: string[]
                limit: number
            }>,
            needsApproval: async () => {
                return Storage.needsApproval(ToolName.getColumnSampleValues)
            },
            execute: async ({ schemaName, tableName, columns, limit }) => {
                const samples = await db.columnSamples(
                    { schema: schemaName ?? '', table: tableName },
                    columns,
                    Math.max(minSample, Math.min(maxSample, limit))
                )
                const results: Record<string, SafeJsonValue[]> = {}
                const MAX_CHARS = 64
                for (let i = 0; i < columns.length; i++) {
                    const name = columns[i]
                    const values = samples[i].map((v) => {
                        const value = toSafeJsonValue(v)
                        switch (typeof value) {
                            case 'string': {
                                if (value.length > MAX_CHARS) {
                                    return value.slice(0, MAX_CHARS)
                                }
                            }
                            default: {
                                return value
                            }
                        }
                    })
                    results[name] = values
                }
                return results
            }
        }),
        [ToolName.runSQLQuery]: tool({
            description: 'Run an SQL query and display the result.',
            strict: true,
            inputSchema: z.object({ sql: z.string() }),
            needsApproval: true,
            execute: async (options) => {
                if (readonly) {
                    const readonlyStmt = await Sql.statementReadonly(type, options.sql)
                    if (!readonlyStmt) {
                        throw t('connectionReadonlyError')
                    }
                }
                const query = await db.query(options.sql)
                return {
                    columns: query.columns,
                    rows: query.rows.map((row) => row.map(toSafeJsonValue)),
                    rows_affected: query.rows_affected === null ? null : Number(query.rows_affected),
                    duration: query.duration
                }
            }
        }),
        [ToolName.generateChart]: tool({
            description:
                'Run an SQL query on the database and retrieve the query result to generate a chart.',
            strict: true,
            inputSchema: z.object({
                sql: z.string(),
                chartTitle: z.string(),
                chartType: z.enum(['bar', 'line', 'area', 'pie']),
                dimension: z.string(),
                series: z.array(z.string())
            }),
            needsApproval: true,
            execute: async (input) => {
                const readonlyStmt = await Sql.statementReadonly(type, input.sql)
                if (!readonlyStmt) {
                    throw 'The SQL statement must be read-only'
                }
                const query = await db.query(input.sql)
                const queryResult: QueryData = {
                    columns: query.columns,
                    rows: query.rows.map((row) => row.map(toSafeJsonValue))
                }
                const safeNumber = (n: number): number | 'N/A' => {
                    return isNaN(n) || !isFinite(n) ? 'N/A' : Math.round(n * 100) / 100
                }
                type Serie = {
                    colorIndex: number
                    min: ReturnType<typeof safeNumber>
                    max: ReturnType<typeof safeNumber>
                    avg: ReturnType<typeof safeNumber>
                    sum: ReturnType<typeof safeNumber>
                }
                const series: Serie[] = []
                const empty = query.rows.length === 0
                for (const name of input.series) {
                    const i = query.columns.findIndex((col) => col.name === name)
                    if (i < 0) {
                        throw `Series column "${name}" not found in query result`
                    }
                    const min = empty ? NaN : Math.min(...query.rows.map((row) => Number(row[i])))
                    const max = empty ? NaN : Math.max(...query.rows.map((row) => Number(row[i])))
                    const avg = empty
                        ? NaN
                        : query.rows.reduce((sum, row) => sum + Number(row[i]), 0) / query.rows.length
                    const sum = empty ? NaN : query.rows.reduce((sum, row) => sum + Number(row[i]), 0)
                    series.push({
                        colorIndex: Math.floor(Math.random() * 100),
                        min: safeNumber(min),
                        max: safeNumber(max),
                        avg: safeNumber(avg),
                        sum: safeNumber(sum)
                    })
                }
                return {
                    queryResult,
                    series
                }
            }
        })
    } as const
}

export const createAgent = (
    pcm: NonNullable<ReturnType<typeof useProviderModel>>,
    type: SqlDatabaseType,
    readonly: boolean,
    instructions: string
) => {
    instructions = instructions.replaceAll('{{database}}', databaseName(type)).trim()

    const agent = new ToolLoopAgent({
        model: createLanguageModel(pcm.config, pcm.model.id),
        // TODO: providerOptions:
        instructions,
        toolChoice: 'auto',
        stopWhen: stepCountIs(20),
        tools: createAgentTools(type, readonly),
        activeTools: availableTools().map((item) => item.name),
        // TODO: prepareStep:
        experimental_telemetry: { isEnabled: false }
    })
    return agent
}

export type AgentService = ReturnType<typeof createAgent>
export type AgentMessage = InferAgentUIMessage<AgentService>
export type AgentPart = AgentMessage['parts'][number]
export type AgentToolPart = ToolUIPart<InferUITools<AgentService['tools']>>

type SendMessageOptions = {
    trigger: 'submit-message' | 'regenerate-message'
    chatId: string
    messageId: string | undefined
    messages: AgentMessage[]
    abortSignal: AbortSignal | undefined
} & ChatRequestOptions

export class AgentTransport implements ChatTransport<AgentMessage> {
    agent: MutableRefObject<AgentService | null>

    constructor(agent: MutableRefObject<AgentService | null>) {
        this.agent = agent
    }

    async sendMessages({
        abortSignal,
        messages
    }: SendMessageOptions): Promise<ReadableStream<UIMessageChunk>> {
        if (this.agent.current === null) {
            throw new Error(t('noModelSelected'))
        }
        const stream = await this.agent.current.stream({
            abortSignal,
            messages: await convertToModelMessages(messages)
        })
        return stream.toUIMessageStream()
    }

    async reconnectToStream(_: any): Promise<ReadableStream<UIMessageChunk> | null> {
        return null
    }
}

// Filter out all messages without output from the message list
export const filterNonOutputMessages = (messages: AgentMessage[]): AgentMessage[] | null => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage !== undefined && lastMessage.role === 'assistant') {
        const filteredParts = lastMessage.parts.filter((part) => {
            return !(
                isToolUIPart(part) &&
                (part.state === 'input-streaming' ||
                    part.state === 'input-available' ||
                    part.state === 'approval-requested' ||
                    part.state === 'approval-responded')
            )
        })
        if (filteredParts.length === 0) {
            return messages.slice(0, -1)
        }
        if (filteredParts.length !== lastMessage.parts.length) {
            const newLastMessage = { ...lastMessage, parts: filteredParts }
            return [...messages.slice(0, -1), newLastMessage]
        }
    }
    return null
}

export const SKIP_TOOL_CALL_REASON =
    'The user chose to skip the tool call, they want to proceed without running it'

export const handlePendingApproval = (
    messages: AgentMessage[],
    addToolApprovalResponse: ChatAddToolApproveResponseFunction,
    state: 'allow' | 'skip'
): boolean => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage !== undefined && lastMessage.role === 'assistant') {
        for (const part of lastMessage.parts) {
            if (isToolUIPart(part) && part.type.startsWith('tool-') && part.state === 'approval-requested') {
                switch (state) {
                    case 'allow': {
                        addToolApprovalResponse({
                            id: part.approval.id,
                            approved: true
                        })
                        break
                    }
                    case 'skip': {
                        addToolApprovalResponse({
                            id: part.approval.id,
                            approved: false,
                            reason: SKIP_TOOL_CALL_REASON
                        })
                        break
                    }
                }
                return true
            }
        }
    }
    return false
}
