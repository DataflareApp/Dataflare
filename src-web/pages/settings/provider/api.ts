import z, { ZodType } from 'zod'
import { Http, ProviderConfig, ProviderModelConfig, ProviderType } from '../../../tauri'

export const defaultBaseURL = (type: ProviderType): string => {
    return {
        [ProviderType.Anthropic]: 'https://api.anthropic.com/v1',
        [ProviderType.DeepSeek]: 'https://api.deepseek.com/v1',
        [ProviderType.GitHubModels]: 'https://models.github.ai/inference',
        [ProviderType.GoogleGemini]: 'https://generativelanguage.googleapis.com/v1beta',
        [ProviderType.Groq]: 'https://api.groq.com/openai/v1',
        [ProviderType.Mistral]: 'https://api.mistral.ai/v1',
        [ProviderType.Ollama]: 'http://localhost:11434/v1',
        [ProviderType.OpenAI]: 'https://api.openai.com/v1',
        [ProviderType.OpenRouter]: 'https://openrouter.ai/api/v1',
        [ProviderType.VercelAIGateway]: 'https://ai-gateway.vercel.sh/v1',
        [ProviderType.xAI]: 'https://api.x.ai/v1',
        [ProviderType.OpenAICompatible]: ''
    }[type]
}

export const normalizeBaseURL = <T>(url: string, emptyFallback: T): string | T => {
    const trimmed = url.trim()
    if (trimmed === '') {
        return emptyFallback
    }
    return trimmed.replace(/\/+$/, '')
}

export const fetchModels = async (config: ProviderConfig): Promise<ProviderModelConfig[]> => {
    const fetchJSON = async <T extends ZodType>(url: string, schema: T, headers?: Record<string, string>) => {
        const res = await Http.fetch(url, { method: 'GET', headers })
        if (res.status !== 200) {
            throw `StatusCode: ${res.status}\nFrom: ${url}`
        }
        const parsed = schema.safeParse(res.json())
        if (!parsed.success) {
            const issue = parsed.error.issues[0]
            const path = issue.path.length > 0 ? ` at '${issue.path.join('.')}'` : ''
            throw `From: ${url}\nFailed to parse JSON${path}, ${issue.message}`
        }
        return parsed.data
    }

    let baseURL = normalizeBaseURL(config.baseURL, defaultBaseURL(config.type))
    switch (config.type) {
        case ProviderType.DeepSeek:
        case ProviderType.Groq:
        case ProviderType.xAI:
        case ProviderType.OpenAI:
        case ProviderType.VercelAIGateway:
        case ProviderType.Ollama:
        case ProviderType.OpenAICompatible: {
            const schema = z.object({
                data: z.array(
                    z
                        .object({
                            id: z.string()
                        })
                        .transform((val) => {
                            return { id: val.id, name: val.id }
                        })
                )
            })
            const headers = { Authorization: `Bearer ${config.apiKey}` }
            return fetchJSON(`${baseURL}/models`, schema, headers).then((json) => json.data)
        }
        case ProviderType.Mistral:
        case ProviderType.OpenRouter: {
            const schema = z.object({
                data: z.array(
                    z.object({
                        id: z.string(),
                        name: z.string()
                    })
                )
            })
            const headers = { Authorization: `Bearer ${config.apiKey}` }
            return fetchJSON(`${baseURL}/models`, schema, headers).then((json) => json.data)
        }
        case ProviderType.GitHubModels: {
            const schema = z.array(
                z.object({
                    id: z.string(),
                    name: z.string()
                })
            )
            const headers = { Authorization: `Bearer ${config.apiKey}` }
            return fetchJSON(`https://models.github.ai/catalog/models`, schema, headers)
        }

        case ProviderType.Anthropic: {
            const schema = z.object({
                data: z.array(
                    z
                        .object({
                            id: z.string(),
                            display_name: z.string()
                        })
                        .transform((val) => {
                            return { id: val.id, name: val.display_name }
                        })
                )
            })
            const headers = { 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01' }
            return fetchJSON(`${baseURL}/models`, schema, headers).then((json) => json.data)
        }
        case ProviderType.GoogleGemini: {
            const schema = z.object({
                models: z.array(
                    z
                        // TODO: The documentation mentions a baseModelId field, but it doesn't actually exist
                        // https://ai.google.dev/api/models?hl=zh-cn#Model
                        .object({
                            name: z.string(),
                            displayName: z.string()
                        })
                        .transform((val) => {
                            return { id: val.name, name: val.displayName }
                        })
                )
            })
            const headers = { 'x-goog-api-key': config.apiKey }
            return fetchJSON(`${baseURL}/models?pageSize=1000`, schema, headers).then((json) => json.models)
        }
    }
}
