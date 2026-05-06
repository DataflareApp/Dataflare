import { useEffect, useRef, useState } from 'react'
import useSWRImmutable from 'swr/immutable'
import {
    checkRulesError,
    ColumnTransformRuleEdit,
    loadRules,
    saveRules,
    TransformRule
} from '../../database/hooks/use-column-transform'

export const useRules = () => {
    const { data, isLoading, mutate } = useSWRImmutable('transform-rules', loadRules)
    const timer = useRef<number | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (timer.current !== null) {
            clearTimeout(timer.current)
        }
        if (data === undefined || data.length === 0) {
            setError(null)
            return
        }
        timer.current = setTimeout(() => {
            timer.current = null
            setError(checkRulesError(data ?? []))
        }, 500)
    }, [data])

    const addRule = () => {
        if (data === undefined) return
        const rules = [...data, { table: '', column: '', type: TransformRule.enum.MS_TO_UTC }]
        mutate(rules, false)
        saveRules(rules)
    }

    const removeRule = (index: number) => {
        if (data === undefined) return
        const rules = [...data]
        rules.splice(index, 1)
        mutate(rules, false)
        saveRules(rules)
    }

    const updateRule = <K extends keyof ColumnTransformRuleEdit, V>(index: number, key: K, value: V) => {
        if (data === undefined) return
        const rules = [...data]
        rules[index] = { ...rules[index], [key]: value }
        mutate(rules, false)
        saveRules(rules)
    }

    return {
        rules: data ?? [],
        error,
        isLoading,
        mutate,
        addRule,
        removeRule,
        updateRule
    }
}
