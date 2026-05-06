import { Key, GenericValue, GenericValueType, KvDatabaseType } from '../../../tauri'
import { formatBytesSize } from '../../../utils/format'
import { useDbStore } from '../hooks/use-store'

function splitChars(): string[] {
    const type = useDbStore.getState().connection.config.type
    switch (type) {
        case KvDatabaseType.S3: {
            return ['/']
        }
        default: {
            return [':', '-', '.', '/', '_']
        }
    }
}

// Split key names by various delimiters to generate all possible prefix combinations
// For each delimiter, if the key contains that delimiter, all prefixes for that delimiter are generated.
// Example:
// - Input: user:profile:name
// - For delimiter ':', generates ['user', 'user:profile']
// - Input: api-v1-users
// - For delimiter '-', generates ['api', 'api-v1']
export function splitPrefix(key: string) {
    const chars = splitChars()
    const results = []

    for (const char of chars) {
        if (!key.includes(char)) {
            continue
        }
        const parts = key.split(char)
        const items = []
        let lastIndex = 0
        for (let i = 1; i <= parts.length - 1; i++) {
            lastIndex = key.indexOf(char, lastIndex)
            if (lastIndex === 0) {
                continue
            }
            items.push(key.substring(0, lastIndex))
            lastIndex++
        }
        results.push(items)
    }

    return results
}

export function keyEq(a: Key, b: Key | null): boolean {
    if (a.type !== b?.type) {
        return false
    }
    return a.value === b.value
}

export function displayKeyValue(value: GenericValue): string {
    switch (value.type) {
        case GenericValueType.String: {
            return value.value
        }
        // TODO
        case GenericValueType.Bytes: {
            return formatBytesSize(value.value.length)
        }
        // TODO
        case GenericValueType.Redis: {
            return JSON.stringify(value.value, null, 2)
        }
    }
}

export function valueToFileContent(value: GenericValue): string | Uint8Array {
    switch (value.type) {
        case GenericValueType.String: {
            return value.value
        }
        // TODO
        case GenericValueType.Bytes: {
            return Uint8Array.from(value.value)
        }
        case GenericValueType.Redis: {
            return JSON.stringify(value.value, null, 2)
        }
    }
}
