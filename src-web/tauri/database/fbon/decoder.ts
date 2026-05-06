export type Value =
    | null
    | boolean
    | number
    | bigint
    | string
    | Uint8Array
    | Value[]
    | { [key: string]: Value }

export class Decoder {
    bytes: ArrayBuffer
    offset = 0

    constructor(bytes: ArrayBuffer) {
        this.bytes = bytes
    }

    private readBuffer(len: number): ArrayBuffer {
        const rst = this.bytes.slice(this.offset, this.offset + len)
        this.offset += len
        return rst
    }

    private readInt(size: 1 | 2 | 4, unsigned: boolean): number
    private readInt(size: 8, unsigned: boolean): bigint
    private readInt(size: 1 | 2 | 4 | 8, unsigned: boolean): number | bigint {
        const buff = this.readBuffer(size)
        const view = new DataView(buff)
        switch (size) {
            case 1: {
                return unsigned ? view.getUint8(0) : view.getInt8(0)
            }
            case 2: {
                return unsigned ? view.getUint16(0, true) : view.getInt16(0, true)
            }
            case 4: {
                return unsigned ? view.getUint32(0, true) : view.getInt32(0, true)
            }
            case 8: {
                return unsigned ? view.getBigUint64(0, true) : view.getBigInt64(0, true)
            }
        }
    }

    private readFloat(size: 4 | 8): number {
        const buff = this.readBuffer(size)
        const view = new DataView(buff)
        switch (size) {
            case 4: {
                return view.getFloat32(0, true)
            }
            case 8: {
                return view.getFloat64(0, true)
            }
        }
    }

    private readString(lengthSize: 1 | 2 | 4): string {
        const length = this.readInt(lengthSize, true)
        const buff = this.readBuffer(length)
        return new TextDecoder().decode(buff)
    }

    private readBytes(lengthSize: 1 | 2 | 4): ArrayBuffer {
        const length = this.readInt(lengthSize, true)
        return this.readBuffer(length)
    }

    private readArray(lengthSize: 1 | 2 | 4): Value[] {
        const length = this.readInt(lengthSize, true)
        const array: Value[] = []
        for (let i = 0; i < length; i++) {
            const val = this.readValue()
            array.push(val)
        }
        return array
    }

    private readMap(lengthSize: 1 | 2 | 4): {
        [key: string]: Value
    } {
        const length = this.readInt(lengthSize, true)
        const map: {
            [key: string]: Value
        } = {}
        for (let i = 0; i < length; i++) {
            const key = this.readValue() as string
            const val = this.readValue()
            map[key] = val
        }
        return map
    }

    readValue(): Value {
        const type = this.readInt(1, true)
        switch (type) {
            // Null
            case 0: {
                return null
            }
            // True
            case 1: {
                return true
            }
            // False
            case 2: {
                return false
            }
            // I8
            case 3: {
                return this.readInt(1, false)
            }
            // U8
            case 4: {
                return this.readInt(1, true)
            }
            // I16
            case 5: {
                return this.readInt(2, false)
            }
            // U16
            case 6: {
                return this.readInt(2, true)
            }
            // I32
            case 7: {
                return this.readInt(4, false)
            }
            // U32
            case 8: {
                return this.readInt(4, true)
            }
            // F32
            case 9: {
                return this.readFloat(4)
            }
            // I64
            case 10: {
                return this.readInt(8, false)
            }
            // U64
            case 11: {
                return this.readInt(8, true)
            }
            // F64
            case 12: {
                return this.readFloat(8)
            }
            // String_1
            case 13: {
                return this.readString(1)
            }
            // String_2
            case 14: {
                return this.readString(2)
            }
            // String_4
            case 15: {
                return this.readString(4)
            }
            // Bytes_1
            case 16: {
                return new Uint8Array(this.readBytes(1))
            }
            // Bytes_2
            case 17: {
                return new Uint8Array(this.readBytes(2))
            }
            // Bytes_4
            case 18: {
                return new Uint8Array(this.readBytes(4))
            }
            // Array_1
            case 19: {
                return this.readArray(1)
            }
            // Array_2
            case 20: {
                return this.readArray(2)
            }
            // Array_4
            case 21: {
                return this.readArray(4)
            }
            // Map_1
            case 22: {
                return this.readMap(1)
            }
            // Map_2
            case 23: {
                return this.readMap(2)
            }
            // Map_4
            case 24: {
                return this.readMap(4)
            }
            default: {
                throw `invalid type '${type}'`
            }
        }
    }
}
