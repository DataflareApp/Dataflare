import { save, open, OpenDialogOptions, SaveDialogOptions } from '@tauri-apps/plugin-dialog'
import {
    writeTextFile,
    writeFile as writeBinaryFile,
    readFile as readBinaryFile,
    readTextFile
} from '@tauri-apps/plugin-fs'
import { revealItemInDir } from '@tauri-apps/plugin-opener'
import { t } from '../i18n'
import { showMessageBox } from '../ui'

export const readFileContent = async (file: File): Promise<string | null> => {
    return new Promise((success: (value: string | null) => void) => {
        const reader = new FileReader()
        reader.addEventListener('load', () => {
            success(reader.result as string)
        })
        reader.addEventListener('error', () => {
            showMessageBox(t('raedFileFailed'), file.name, 'error')
            success(null)
        })
        reader.readAsText(file)
    })
}

type FileContent = string | Uint8Array
export const writeFile = async (path: string, content: FileContent): Promise<boolean> => {
    try {
        if (typeof content === 'string') {
            await writeTextFile(path, content)
        } else {
            await writeBinaryFile(path, content)
        }
        revealItemInDir(path)
        return true
    } catch (err: any) {
        showMessageBox(t('writeFileFailed'), err, 'error')
        return false
    }
}

async function readFile(path: string, type: 'text'): Promise<string | null>
async function readFile(path: string, type: 'binary'): Promise<Uint8Array | null>
async function readFile(path: string, type: 'text' | 'binary'): Promise<string | Uint8Array | null> {
    try {
        if (type === 'text') {
            return await readTextFile(path)
        } else {
            return await readBinaryFile(path)
        }
    } catch (err: any) {
        showMessageBox(t('raedFileFailed'), err, 'error')
    }
    return null
}

export async function writeFileToSelectPath(
    options: SaveDialogOptions,
    content: FileContent | (() => FileContent) | (() => Promise<FileContent>) | FileContent
): Promise<boolean> {
    const path = await save(options)
    if (path === null) {
        return false
    }
    let fileContent: FileContent
    if (typeof content === 'string' || content instanceof Uint8Array) {
        fileContent = content
    } else {
        fileContent = await Promise.resolve(content())
    }
    return await writeFile(path, fileContent)
}

export async function readSelectedFile(
    type: 'binary',
    options?: OpenDialogOptions
): Promise<Uint8Array | null>
export async function readSelectedFile(type: 'text', options?: OpenDialogOptions): Promise<string | null>
export async function readSelectedFile(
    type: 'binary' | 'text',
    options?: OpenDialogOptions
): Promise<Uint8Array | string | null> {
    const path = await open(options)
    if (path === null) {
        return null
    }
    if (type === 'binary') {
        return await readFile(path as string, type)
    } else {
        return await readFile(path as string, type)
    }
}
