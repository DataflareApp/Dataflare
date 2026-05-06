export const parseIntNumber = (
    val: string | null,
    maxValue: number,
    minValue: number,
    defaultValue: number
): number => {
    if (val === null) {
        return defaultValue
    }
    let n = parseInt(val)
    if (Number.isNaN(n)) {
        n = defaultValue
    }
    return Math.max(minValue, Math.min(maxValue, n))
}
