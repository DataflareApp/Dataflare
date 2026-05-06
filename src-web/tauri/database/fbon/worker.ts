import { Decoder } from './decoder'

onmessage = (e: MessageEvent<{ id: number; data: ArrayBuffer }>) => {
    const { id, data } = e.data
    postMessage({
        id,
        data: new Decoder(data).readValue()
    })
}
