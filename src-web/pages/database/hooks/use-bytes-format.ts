import { create } from 'zustand'
import { REFRESH_BYTES_FORMAT, TauriGlobalEvent, emit } from '../../../tauri'

export const enum BytesFormat {
    BytesSize = 'Bytes size',
    Hex = 'Hex',
    Binary = 'Binary'
}

const Storage = {
    set bytesFormat(format: BytesFormat) {
        localStorage.setItem('BytesFormat', format)
    },
    get bytesFormat() {
        const format = localStorage.getItem('BytesFormat')
        switch (format) {
            case BytesFormat.BytesSize:
            case BytesFormat.Hex:
            case BytesFormat.Binary:
                return format as BytesFormat
            default:
                return BytesFormat.BytesSize
        }
    }
}

export interface BytesFormatOptions {
    bytesFormat: BytesFormat
}

const buildState = (): BytesFormatOptions => {
    return {
        bytesFormat: Storage.bytesFormat
    }
}

export const useBytesFormat = create<BytesFormatOptions>(() => {
    return buildState()
})

export const setBytesFormat = (bytesFormat: BytesFormat) => {
    Storage.bytesFormat = bytesFormat
    emit(REFRESH_BYTES_FORMAT)
}

TauriGlobalEvent.listen(REFRESH_BYTES_FORMAT, () => {
    useBytesFormat.setState(buildState())
})
