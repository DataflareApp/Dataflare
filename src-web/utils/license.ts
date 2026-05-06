import { getPassword, setPassword, deletePassword, Http } from '../tauri'

export interface License {
    key: string
    token: string
}

export const LicenseStorage = {
    save({ key, token }: License): Promise<void> {
        return setPassword('license', `${key}:${token}`)
    },

    remove(): Promise<void> {
        return deletePassword('license')
    },

    async get(): Promise<License | null> {
        try {
            const rst = await getPassword('license')
            const items = rst.split(':')
            if (items.length !== 2) {
                return null
            }
            return { key: items[0], token: items[1] }
        } catch (_) {}

        // If retrieval from keychain fails, try getting from local storage for backward compatibility
        // Previous versions stored key and token in localStorage
        const key = localStorage.getItem('licenseKey')
        const token = localStorage.getItem('licenseToken')
        if (key === null || token === null) {
            return null
        }

        // Write it back to the keychain
        try {
            await LicenseStorage.save({ key, token })
            localStorage.removeItem('licenseKey')
            localStorage.removeItem('licenseToken')
        } catch (_) {}

        return { key, token }
    }
}

export class LicenseApi {
    private static baseURL = 'https://api.dataflare.app'

    private static send<T>(data: {
        method: 'GET' | 'POST'
        path: string
        query?: {
            [key: string]: string
        }
        body?: any
    }): Promise<T> {
        const url = new URL(data.path, this.baseURL)
        if (data.query !== undefined) {
            for (let key in data.query) {
                url.searchParams.set(key, data.query[key])
            }
        }
        let body: undefined | string = undefined
        if (data.body !== undefined) {
            body = JSON.stringify(data.body)
        }
        return new Promise(async (success, error) => {
            try {
                let res = await Http.fetch(url.toString(), {
                    method: data.method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body
                })
                if (res.status !== 200) {
                    const rst: { message: string } = res.json()
                    return error(rst.message)
                }
                success(res.json())
            } catch (err: any) {
                error(err.toString())
            }
        })
    }

    public static activate(license: string, hostname: string): Promise<{ token: string }> {
        return this.send({
            method: 'POST',
            path: '/license/activate',
            body: {
                license,
                hostname
            }
        })
    }

    public static verify(license: string, token: string): Promise<{ status: boolean }> {
        return this.send({
            method: 'GET',
            path: 'license/verify',
            query: {
                license,
                token
            }
        })
    }
}
