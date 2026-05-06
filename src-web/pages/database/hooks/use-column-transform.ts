import { z } from 'zod'
import { create } from 'zustand'
import { REFRESH_TRANSFORM_RULES, TauriGlobalEvent, ClientData, emit } from '../../../tauri'

export const TransformRule = z.enum(['MS_TO_UTC', 'MS_TO_LOCAL', 'S_TO_UTC', 'S_TO_LOCAL'])

export interface ColumnTransformRule {
    table: RegExp | null
    column: RegExp
    type: z.infer<typeof TransformRule>
}

const ColumnTransformRuleEdit = z.object({
    table: z.string(),
    column: z.string(),
    type: TransformRule
})

export type ColumnTransformRuleEdit = z.infer<typeof ColumnTransformRuleEdit>

export const loadRules = async () => {
    const data = await ClientData.getStorage('', 'column-transform', z.array(ColumnTransformRuleEdit))
    return data ?? []
}

const loadCompiledRules = async () => {
    const items = await loadRules()
    const rules: ColumnTransformRule[] = []
    for (const item of items) {
        let table = null as RegExp | null
        if (item.table !== '') {
            try {
                table = new RegExp(item.table)
            } catch (_) {
                continue
            }
        }
        if (item.column === '') {
            continue
        }
        let column: RegExp
        try {
            column = new RegExp(item.column)
        } catch (_) {
            continue
        }
        rules.push({
            table,
            column,
            type: item.type
        })
    }
    return rules
}

let saveTimer = null as number | null
export const saveRules = (rules: ColumnTransformRuleEdit[]) => {
    if (saveTimer !== null) {
        clearTimeout(saveTimer)
    }
    saveTimer = setTimeout(async () => {
        saveTimer = null
        await ClientData.setStorage('', 'column-transform', rules)
        emit(REFRESH_TRANSFORM_RULES)
    }, 1000)
}

export const checkRulesError = (rules: ColumnTransformRuleEdit[]): string | null => {
    for (let y = 0; y < rules.length; y++) {
        const regs = [rules[y].table, rules[y].column]
        for (let x = 0; x < regs.length; x++) {
            try {
                new RegExp(regs[x])
            } catch (err: any) {
                const regType = x === 0 ? 'table' : 'column'
                return `#${y + 1} [${regType}]: ${err.message}`
            }
        }
    }
    return null
}

// TODO: Only load when needed, e.g. Redis / S3 don't need this at all
export const useColumnTransformStore = create<{
    rules: ColumnTransformRule[]
    reload: () => void
}>((set) => {
    const reload = () => {
        loadCompiledRules().then((rules) => set({ rules }))
    }
    reload()
    TauriGlobalEvent.listen(REFRESH_TRANSFORM_RULES, reload)
    return {
        rules: [],
        reload
    }
})
