import { useTranslation } from '../i18n'

export const formatBytesSize = (length: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let l = 0
    while (length >= 1000 && ++l) {
        length = length / 1000
    }
    return length.toFixed(length < 10 && l > 0 ? 1 : 0) + ' ' + units[l]
}

export const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    const milliseconds = date.getMilliseconds()
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`
}

export const formatDuration = (ms: number, tf: ReturnType<typeof useTranslation.getState>['tf']) => {
    if (ms < 1000) {
        return tf('ms', ms.toString())
    }
    return tf('sec', (ms / 1000).toString())
}

export const formatTimeAgo = (
    ms: number,
    t: ReturnType<typeof useTranslation.getState>['t'],
    relativeTimeUtil: Intl.RelativeTimeFormat
) => {
    const s = Math.floor((Date.now() - ms) / 1000)
    if (s < 3) {
        return t('now')
    }
    if (s < 60) {
        return relativeTimeUtil.format(-s, 'second')
    }
    const m = Math.floor(s / 60)
    if (m < 60) {
        return relativeTimeUtil.format(-m, 'minute')
    }
    const h = Math.floor(m / 60)
    if (h < 24) {
        return relativeTimeUtil.format(-h, 'hour')
    }
    const d = Math.floor(h / 24)
    return relativeTimeUtil.format(-d, 'day')
}

export const formatTTL = (ms: number, relativeTimeUtil: Intl.RelativeTimeFormat) => {
    const s = Math.floor((ms - Date.now()) / 1000)
    if (s < 60) {
        return relativeTimeUtil.format(s, 'second')
    }
    if (s < 3600) {
        return relativeTimeUtil.format(Math.floor(s / 60), 'minute')
    }
    if (s < 86400) {
        return relativeTimeUtil.format(Math.floor(s / 3600), 'hour')
    }
    return relativeTimeUtil.format(Math.floor(s / 86400), 'day')
}
