export type Value = string | number | bigint | null | boolean | Uint8Array

export type Rows<T = Value[]> = T[]

export interface Query {
    columns: {
        name: string
        datatype: string
    }[]
    rows: Value[][]
    rows_affected: BigInt | null
    duration: number
}

export type QueryData = Pick<Query, 'columns' | 'rows'>

export type SafeJsonValue = number | string | boolean | null

const MIN_NUMBER = BigInt(Number.MIN_SAFE_INTEGER)
const MAX_NUMBER = BigInt(Number.MAX_SAFE_INTEGER)

// Convert Query Value to a safe value that can be JSON-serialized
export function toSafeJsonValue(value: Value): SafeJsonValue {
    if (typeof value === 'bigint') {
        if (value >= MIN_NUMBER && value <= MAX_NUMBER) {
            return Number(value)
        }
        return value.toString()
    }
    if (value instanceof Uint8Array) {
        return '[' + value.toString() + ']'
    }
    return value
}

export interface BatchInsertOptions {
    entry: string
    columns: InsertColumn[]
    count: number
}

export interface InsertColumn {
    name: string
    values: InsertValue[]
}

export const enum InsertValueType {
    Default = 'Default',
    Null = 'Null',
    Custom = 'Custom',
    RandomInteger = 'RandomInteger',
    RandomFloat = 'RandomFloat',
    RandomText = 'RandomText',
    RandomBoolean = 'RandomBoolean',
    RandomUuid = 'RandomUuid',
    RandomEmail = 'RandomEmail',
    RandomIpAddress = 'RandomIpAddress',
    RandomDate = 'RandomDate',
    RandomTime = 'RandomTime',
    RandomDatetime = 'RandomDatetime',
    RandomUnixTimestamp = 'RandomUnixTimestamp'
}

export type Default = {
    type: InsertValueType.Default
}
export type Null = {
    type: InsertValueType.Null
}
export type Custom = {
    type: InsertValueType.Custom
    options: {
        value: string
        raw: boolean
    }
}
export type RandomInteger = {
    type: InsertValueType.RandomInteger
    options: {
        min: number
        max: number
    }
}
export type RandomFloat = {
    type: InsertValueType.RandomFloat
    options: {
        min: number
        max: number
    }
}
export type RandomText = {
    type: InsertValueType.RandomText
    options: {
        min: number
        max: number
    }
}
export type RandomBoolean = {
    type: InsertValueType.RandomBoolean
}
export type RandomUuid = {
    type: InsertValueType.RandomUuid
}
export type RandomEmail = {
    type: InsertValueType.RandomEmail
}
export type RandomIpAddress = {
    type: InsertValueType.RandomIpAddress
    options: {
        contain: IpType
    }
}
export type RandomDate = {
    type: InsertValueType.RandomDate
}
export type RandomTime = {
    type: InsertValueType.RandomTime
}
export type RandomDatetime = {
    type: InsertValueType.RandomDatetime
}
export type RandomUnixTimestamp = {
    type: InsertValueType.RandomUnixTimestamp
    options: {
        ms: boolean
    }
}

export const enum IpType {
    IPv4OrIPv6 = 'IPv4/IPv6',
    IPv4 = 'IPv4',
    IPv6 = 'IPv6'
}

export type InsertValue =
    | Default
    | Null
    | Custom
    | RandomInteger
    | RandomFloat
    | RandomText
    | RandomBoolean
    | RandomUuid
    | RandomEmail
    | RandomIpAddress
    | RandomDate
    | RandomTime
    | RandomDatetime
    | RandomUnixTimestamp
