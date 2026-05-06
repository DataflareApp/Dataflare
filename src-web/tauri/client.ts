import { invoke } from '@tauri-apps/api/core'
import { z } from 'zod'
import { DatabaseConfig, KvDatabaseConfig, SqlDatabaseConfig } from './database'

export { z } from 'zod'

export interface Connection<T extends DatabaseConfig = DatabaseConfig> {
    cid: string
    name: string
    config: T
}

export type SqlConnection = Connection<SqlDatabaseConfig>
export type KvConnection = Connection<KvDatabaseConfig>

export interface QueryItem {
    qid: string
    name: string
}

export interface HistoryQueryItem {
    hid: string
    content: string
    error: string | null
    createdAt: number
}

export interface Widget {
    wid: string
    width: number
    height: number
    x: number
    y: number
    config: WidgetConfig
}

export interface WidgetBaseConfig {
    name: string
    source: string
    interval: number
}

export const enum WidgetType {
    Table = 'table',
    ComposedChart = 'composed',
    PieChart = 'pie'
}

export type WidgetConfig = WidgetTableConfig | WidgetComposedChartConfig | WidgetPieChartConfig

export interface WidgetTableConfig extends WidgetBaseConfig {
    options: {
        type: WidgetType.Table
        config: {}
    }
}

export interface WidgetComposedChartConfig extends WidgetBaseConfig {
    options: {
        type: WidgetType.ComposedChart
        config: ComposedChartConfig
    }
}

export interface WidgetPieChartConfig extends WidgetBaseConfig {
    options: {
        type: WidgetType.PieChart
        config: PieChartConfig
    }
}

export interface ComposedChartConfig {
    axis: Axis
    layout: Layout
    categoryDataKey: string
    bars: BarItem[]
    lines: LineItem[]
    areas: AreaItem[]
}

export interface Axis {
    x: AxisOptions
    y: AxisOptions
}

export interface AxisOptions {
    hidden: boolean
}

export const enum Layout {
    Horizontal = 'horizontal',
    Vertical = 'vertical'
}

export interface BarItem {
    dataKey: string
    barSize: number
    fill: string
}

export interface LineItem {
    dataKey: string
    stroke: string
    type: LineType
}

export interface AreaItem {
    dataKey: string
    fill: string
    type: LineType
}

export const enum LineType {
    bump = 'bump',
    linear = 'linear',
    monotone = 'monotone',
    step = 'step',
    stepBefore = 'stepBefore',
    stepAfter = 'stepAfter'
}

export const ALL_LINE_TYPE_OPTIONS = [
    LineType.bump,
    LineType.linear,
    LineType.monotone,
    LineType.step,
    LineType.stepBefore,
    LineType.stepAfter
].map((v) => {
    return {
        name: v,
        value: v
    } as const
})

export interface PieChartConfig {
    nameKey: string
    dataKey: string
    startColorIndex: number
}

export type Provider = {
    id: number
    name: string
    config: ProviderConfig
    models: ProviderModelConfig[]
}

export interface ProviderModelConfig {
    name: string
    id: string
}

export interface ProviderModel {
    provider: number
    model: string
}

export const enum ProviderType {
    Anthropic = 'Anthropic',
    DeepSeek = 'DeepSeek',
    GitHubModels = 'GitHub Models',
    GoogleGemini = 'Google Gemini',
    Groq = 'Groq',
    Mistral = 'Mistral',
    Ollama = 'Ollama',
    OpenAI = 'OpenAI',
    OpenRouter = 'OpenRouter',
    VercelAIGateway = 'Vercel AI Gateway',
    xAI = 'xAI',
    OpenAICompatible = 'OpenAI Compatible'
}

export const ALL_PROVIDER_TYPES = [
    ProviderType.Anthropic,
    ProviderType.DeepSeek,
    ProviderType.GitHubModels,
    ProviderType.GoogleGemini,
    ProviderType.Groq,
    ProviderType.Mistral,
    ProviderType.Ollama,
    ProviderType.OpenAI,
    ProviderType.OpenRouter,
    ProviderType.VercelAIGateway,
    ProviderType.xAI,
    ProviderType.OpenAICompatible
]

export type ProviderConfig =
    | AnthropicConfig
    | DeepSeekConfig
    | GitHubModelsConfig
    | GoogleGeminiConfig
    | GroqConfig
    | MistralConfig
    | OllamaConfig
    | OpenAIConfig
    | OpenRouterConfig
    | VercelAIGatewayConfig
    | xAIConfig
    | OpenAICompatibleConfig

interface BaseProviderConfig {
    apiKey: string
    baseURL: string
}

export type AnthropicConfig = BaseProviderConfig & { type: ProviderType.Anthropic }
export type DeepSeekConfig = BaseProviderConfig & { type: ProviderType.DeepSeek }
export type GitHubModelsConfig = BaseProviderConfig & { type: ProviderType.GitHubModels }
export type GoogleGeminiConfig = BaseProviderConfig & { type: ProviderType.GoogleGemini }
export type GroqConfig = BaseProviderConfig & { type: ProviderType.Groq }
export type MistralConfig = BaseProviderConfig & { type: ProviderType.Mistral }
export type OllamaConfig = BaseProviderConfig & { type: ProviderType.Ollama }
export type OpenAIConfig = BaseProviderConfig & { type: ProviderType.OpenAI }
export type OpenRouterConfig = BaseProviderConfig & { type: ProviderType.OpenRouter }
export type VercelAIGatewayConfig = BaseProviderConfig & { type: ProviderType.VercelAIGateway }
export type xAIConfig = BaseProviderConfig & { type: ProviderType.xAI }
export type OpenAICompatibleConfig = BaseProviderConfig & { type: ProviderType.OpenAICompatible }

export interface Chat {
    id: number
    name: string
    lastMessageAt: number
    lastAccessedAt: number
}

export interface Agent {
    id: number
    name: string
    instructions: string
}

export interface ChatConfig {
    agent?: number
    provider?: number
    model?: string
}

export class ClientData {
    public static createConnection(name: string, config: DatabaseConfig): Promise<string> {
        return invoke<string>('create_connection', {
            name,
            config
        })
    }

    public static updateConnection(cid: string, name: string, config: DatabaseConfig): Promise<void> {
        return invoke<void>('update_connection', {
            cid,
            name,
            config
        })
    }

    public static deleteConnection(cid: string) {
        return invoke<void>('delete_connection', {
            cid
        })
    }

    public static connectionList(): Promise<Connection[]> {
        return invoke('connection_list', {})
    }

    public static connectionSort(cids: string[]): Promise<void> {
        return invoke<void>('connection_sort', {
            cids
        })
    }

    public static createQuery(cid: string, name: string, content: string = ''): Promise<string> {
        return invoke<string>('create_query', {
            cid,
            name,
            content
        })
    }

    public static importQuery(cid: string, path: string): Promise<void> {
        return invoke<void>('import_query', {
            cid,
            path
        })
    }

    public static queryContent(qid: string): Promise<string> {
        return invoke<string>('query_content', {
            qid
        })
    }

    public static updateQuery(qid: string, content: string): Promise<void> {
        return invoke<void>('update_query', {
            qid,
            content
        })
    }

    public static duplicateQuery(qid: string): Promise<void> {
        return invoke<void>('duplicate_query', {
            qid
        })
    }

    public static renameQuery(qid: string, newQueryName: string) {
        return invoke<void>('rename_query', {
            qid,
            name: newQueryName
        })
    }

    public static exportQuery(qid: string, path: string) {
        return invoke<void>('export_query', {
            qid,
            path
        })
    }

    public static deleteQuery(qid: string) {
        return invoke<void>('delete_query', {
            qid
        })
    }

    public static queryList(cid: string): Promise<QueryItem[]> {
        return invoke<QueryItem[]>('query_list', {
            cid
        })
    }

    public static createQueryHistory(
        cid: string,
        qid: string,
        content: string,
        error: string | null
    ): Promise<void> {
        return invoke<void>('create_query_history', {
            cid,
            qid,
            content: content,
            // Tips: Tauri not allow `error` key
            errorContent: error
        })
    }

    public static clearQueryHistory(qid: string) {
        return invoke<void>('clear_query_history', {
            qid
        })
    }

    public static async queryHistoryList(
        qid: string,
        page: number,
        limit: number
    ): Promise<HistoryQueryItem[]> {
        return invoke<HistoryQueryItem[]>('query_history_list', {
            qid,
            page,
            limit
        })
    }

    public static async createWidget(
        cid: string,
        x: number,
        y: number,
        width: number,
        height: number,
        config: WidgetConfig
    ): Promise<string> {
        return invoke('create_widget', {
            cid,
            x,
            y,
            width,
            height,
            config
        })
    }

    public static async deleteWidget(wid: string): Promise<void> {
        return invoke('delete_widget', {
            wid
        })
    }

    public static async widgetList(cid: string): Promise<Widget[]> {
        return invoke('widget_list', {
            cid
        })
    }

    public static async updateWidgetPosition(wid: string, x: number, y: number): Promise<void> {
        return invoke('update_widget_position', {
            wid,
            x,
            y
        })
    }

    public static async updateWidgetSize(wid: string, width: number, height: number): Promise<void> {
        return invoke('update_widget_size', {
            wid,
            width,
            height
        })
    }

    public static async updateWidgetConfig(wid: string, config: WidgetConfig): Promise<void> {
        return invoke('update_widget_config', {
            wid,
            config
        })
    }

    public static async getStorage<T>(cid: string, key: string, schema: z.ZodType<T>): Promise<T | null> {
        try {
            const value = await invoke<string>('get_storage', { cid, key })
            const json = JSON.parse(value)
            return schema.parse(json)
        } catch {
            return null
        }
    }

    public static async setStorage(cid: string, key: string, value: any, ifEqDelete?: any): Promise<void> {
        if (ifEqDelete !== undefined && value === ifEqDelete) {
            return this.deleteStorage(cid, key)
        }
        return invoke('set_storage', {
            cid,
            key,
            value: JSON.stringify(value)
        })
    }

    public static async deleteStorage(cid: string, key: string): Promise<void> {
        return invoke('delete_storage', {
            cid,
            key
        })
    }

    public static providerList(): Promise<Provider[]> {
        return invoke('provider_list', {})
    }

    public static createProvider(params: Omit<Provider, 'id'>): Promise<number> {
        return invoke('create_provider', params)
    }

    public static updateProvider(params: Provider): Promise<void> {
        return invoke('update_provider', params)
    }

    public static deleteProvider(id: number): Promise<void> {
        return invoke('delete_provider', {
            id
        })
    }

    public static chatList(cid: string): Promise<Chat[]> {
        return invoke('chat_list', { cid })
    }

    public static createChat(cid: string): Promise<number> {
        return invoke('create_chat', { cid })
    }

    public static deleteChat(id: number): Promise<void> {
        return invoke('delete_chat', { id })
    }

    public static deleteAllChats(cid: string): Promise<Chat> {
        return invoke('delete_all_chats', { cid })
    }

    public static getChatDetail<T>(id: number): Promise<{ config: ChatConfig; messages: T[] }> {
        return invoke('get_chat_detail', { id })
    }

    public static updateChatName(id: number, name: string): Promise<void> {
        return invoke('update_chat_name', { id, name })
    }

    public static updateChatConfig(id: number, config: ChatConfig): Promise<void> {
        return invoke('update_chat_config', {
            id,
            config
        })
    }

    public static updateChatMessages<T>(id: number, messages: T[]): Promise<void> {
        return invoke('update_chat_messages', { id, messages })
    }

    public static agentList(): Promise<Agent[]> {
        return invoke('agent_list', {})
    }

    public static createAgent(name: string, instructions: string): Promise<number> {
        return invoke('create_agent', { name, instructions })
    }

    public static updateAgent(id: number, name: string, instructions: string): Promise<void> {
        return invoke('update_agent', { id, name, instructions })
    }

    public static deleteAgent(id: number): Promise<void> {
        return invoke('delete_agent', { id })
    }
}
