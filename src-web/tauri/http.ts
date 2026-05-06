import { invoke } from '@tauri-apps/api/core'

interface FetchData {
    status: number
    body: string
}

class FetchResponse {
    private readonly data: FetchData

    constructor(data: FetchData) {
        this.data = data
    }

    get status(): number {
        return this.data.status
    }

    public text(): string {
        return this.data.body
    }

    public json<T>(): T {
        return JSON.parse(this.data.body) as T
    }
}

export class Http {
    public static fetch(
        url: string,
        {
            method,
            headers,
            body
        }: {
            method: 'GET' | 'POST'
            headers?: Record<string, string>
            body?: string
        }
    ) {
        return invoke<FetchData>('fetch', {
            method,
            url,
            headers: headers ?? {},
            body: body ?? null
        }).then((data) => new FetchResponse(data))
    }
}
