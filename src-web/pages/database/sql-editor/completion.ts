import { monaco } from './index'
import { LANGUAGE_ID } from './language'

export const enum CompletionKind {
    Struct = monaco.languages.CompletionItemKind.Struct,
    Field = monaco.languages.CompletionItemKind.Field,
    Keyword = monaco.languages.CompletionItemKind.Keyword,
    Function = monaco.languages.CompletionItemKind.Function,
    Value = monaco.languages.CompletionItemKind.Value,
    Index = monaco.languages.CompletionItemKind.Event
}

export interface Completion {
    label: string
    detail: string
    kind: CompletionKind
}

export const registerCompletionItemProvider = (completions: Completion[]) => {
    return monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, {
        provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position)
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn
            }
            return {
                suggestions: completions.map((item): monaco.languages.CompletionItem => {
                    return {
                        ...(item as any),
                        insertText: item.label,
                        range
                    }
                })
            }
        }
    })
}
