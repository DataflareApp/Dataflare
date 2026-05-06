import type { Value } from './decoder'

class DecodeTask {
    private worker: Worker
    private callbacks: Map<number, (value: Value) => void>
    private id: number

    constructor() {
        this.worker = new Worker(new URL('./worker', import.meta.url), {
            type: 'module'
        })
        this.id = Number.MIN_SAFE_INTEGER
        this.callbacks = new Map()
        this.worker.onmessage = (e: MessageEvent<{ id: number; data: Value }>) => {
            const { id, data } = e.data
            const fn = this.callbacks.get(id)
            if (fn !== undefined) {
                this.callbacks.delete(id)
                fn(data)
            }
        }
    }

    public async decode(bytes: ArrayBuffer): Promise<Value> {
        this.id += 1
        const id = this.id
        return new Promise((resolve) => {
            this.callbacks.set(id, resolve)
            this.worker.postMessage(
                {
                    id,
                    data: bytes
                },
                [bytes]
            )
        })
    }
}

export const decodeTask = new DecodeTask()
