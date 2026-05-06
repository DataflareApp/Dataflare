import { t } from '../../../../i18n'
import {
    InsertColumn,
    InsertValue,
    InsertValueType,
    IpType,
    RandomText,
    RandomInteger,
    RandomFloat
} from '../../../../tauri'

export type TempInsertColumn = {
    name: string
    values: TempInsertValue[]
}

// Store temporarily input values, convert them to InsertValue on commit
export type TempInsertValue =
    | Exclude<InsertValue, RandomInteger | RandomFloat | RandomText>
    | {
          type: InsertValueType.RandomInteger
          options: InputNumberOptions
      }
    | {
          type: InsertValueType.RandomFloat
          options: InputNumberOptions
      }
    | {
          type: InsertValueType.RandomText
          options: InputNumberOptions
      }

export interface InputNumberOptions {
    min: string
    max: string
}

export const ALL_VALUES: (TempInsertValue | null)[] = [
    {
        type: InsertValueType.Default
    },
    {
        type: InsertValueType.Null
    },
    null,
    {
        type: InsertValueType.Custom,
        options: {
            value: '',
            raw: false
        }
    },
    null,
    {
        type: InsertValueType.RandomInteger,
        options: {
            min: '0',
            max: '100'
        }
    },
    {
        type: InsertValueType.RandomFloat,
        options: {
            min: '0.0',
            max: '100.0'
        }
    },
    null,
    {
        type: InsertValueType.RandomText,
        options: {
            min: '0',
            max: '100'
        }
    },
    {
        type: InsertValueType.RandomBoolean
    },
    {
        type: InsertValueType.RandomUuid
    },
    {
        type: InsertValueType.RandomEmail
    },
    {
        type: InsertValueType.RandomIpAddress,
        options: {
            contain: IpType.IPv4OrIPv6
        }
    },
    null,
    {
        type: InsertValueType.RandomDate
    },
    {
        type: InsertValueType.RandomTime
    },
    {
        type: InsertValueType.RandomDatetime
    },
    {
        type: InsertValueType.RandomUnixTimestamp,
        options: { ms: true }
    }
]

export const UNIX_TIMESTAMP_OPTIONS = [
    {
        name: 'ms',
        value: 'ms'
    },
    {
        name: 's',
        value: 's'
    }
]

export const CONTAIN_IP_OPTIONS = [
    {
        name: IpType.IPv4OrIPv6,
        value: IpType.IPv4OrIPv6
    },
    {
        name: IpType.IPv4,
        value: IpType.IPv4
    },
    {
        name: IpType.IPv6,
        value: IpType.IPv6
    }
]

export const valueName = (value: TempInsertValue): string => {
    switch (value.type) {
        case InsertValueType.Default:
            return 'Default'
        case InsertValueType.Null:
            return 'Null'
        case InsertValueType.Custom:
            return t('customValue')
        case InsertValueType.RandomText:
            return t('randomText')
        case InsertValueType.RandomInteger:
            return t('randomInteger')
        case InsertValueType.RandomFloat:
            return t('randomFloat')
        case InsertValueType.RandomBoolean:
            return t('randomBoolean')
        case InsertValueType.RandomUuid:
            return t('randomUuid')
        case InsertValueType.RandomEmail:
            return t('randomEmail')
        case InsertValueType.RandomIpAddress:
            return t('randomIpAddress')
        case InsertValueType.RandomDate:
            return t('randomDate')
        case InsertValueType.RandomTime:
            return t('randomTime')
        case InsertValueType.RandomDatetime:
            return t('randomDatetime')
        case InsertValueType.RandomUnixTimestamp:
            return t('randomUnixTimestamp')
    }
}

// Convert TempInsertValue in columns to InsertValue; returns null if there are errors
export const converInsertColumns = (temp: TempInsertColumn[]): InsertColumn[] | null => {
    const converInsertValue = (temp: TempInsertValue[]) => {
        const values: InsertValue[] = []
        for (const item of temp) {
            switch (item.type) {
                case InsertValueType.Default:
                case InsertValueType.Null:
                case InsertValueType.Custom:
                case InsertValueType.RandomBoolean:
                case InsertValueType.RandomUuid:
                case InsertValueType.RandomEmail:
                case InsertValueType.RandomDate:
                case InsertValueType.RandomTime:
                case InsertValueType.RandomDatetime:
                case InsertValueType.RandomUnixTimestamp:
                case InsertValueType.RandomIpAddress: {
                    values.push(item)
                    break
                }
                case InsertValueType.RandomText:
                case InsertValueType.RandomInteger:
                case InsertValueType.RandomFloat: {
                    const type = item.type === InsertValueType.RandomFloat ? NumberType.Float : NumberType.Int
                    const checkUint = item.type === InsertValueType.RandomText
                    const options = checkMinMax(item.options, type, checkUint)
                    if (typeof options !== 'string') {
                        values.push({
                            type: item.type,
                            options: {
                                min: Math.min(options.min, options.max),
                                max: Math.max(options.min, options.max)
                            }
                        })
                        break
                    }
                    return null
                }
            }
        }
        return values
    }
    const columns: InsertColumn[] = []
    for (const col of temp) {
        const values = converInsertValue(col.values)
        if (values === null) {
            return null
        }
        columns.push({
            name: col.name,
            values
        })
    }
    return columns
}

export interface ReturnNumberOptons {
    min: number
    max: number
}
export const enum NumberType {
    Float,
    Int
}

export const checkMinMax = (
    { min, max }: InputNumberOptions,
    type: NumberType,
    checkUint: boolean = false
): ReturnNumberOptons | string => {
    const i = type === NumberType.Float ? Number.parseFloat(min) : Number.parseInt(min)
    const a = type === NumberType.Float ? Number.parseFloat(max) : Number.parseInt(max)
    if (Number.isNaN(i) || Number.isNaN(a)) {
        return t('invalidNumber')
    }
    if (checkUint) {
        if (i < 0 || a < 0) {
            return t('invalidNumber')
        }
    }
    return { min: i, max: a }
}

export const checkCountNumber = (val: string): number | null => {
    const n = Number.parseInt(val)
    return Number.isNaN(n) || n < 1 ? null : n
}
