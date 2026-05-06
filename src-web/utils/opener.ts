import { openUrl } from '@tauri-apps/plugin-opener'
import { showMessageBox } from '../ui'

export const RELEASE_URL = 'https://github.com/DataflareApp/dataflare/blob/main/CHANGELOG.md'
export const BUG_FEEDBACK_URL = 'https://github.com/DataflareApp/dataflare/issues'
export const GITHUB_REPOSITORY_URL = 'https://github.com/DataflareApp/dataflare'
export const LICENSE_MANAGER_URL = 'https://dataflare.app/license-manager'
export const FOLLOW_URL = 'https://x.com/DataflareApp'
export const PRIVACY_POLICY_URL = 'https://dataflare.app/privacy'
export const PRICING_URL = 'https://dataflare.app/#pricing'
export const WEBSITE_URL = 'https://dataflare.app'
export const ECHOLITE_URL = 'https://github.com/DataflareApp/echolite'

export const openURL = (url: string, ignoreError: boolean = false) => {
    openUrl(url).catch(() => {
        if (!ignoreError) {
            showMessageBox(`Open URL failed`, url, 'error')
        }
    })
}
