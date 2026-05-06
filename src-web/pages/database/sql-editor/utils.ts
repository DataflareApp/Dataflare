import type { StatementPosition } from '../../../tauri'
import { monaco } from './index'

export const getValuesInRanges = (value: string, possitions: StatementPosition[]): string[] => {
    const model = monaco.editor.createModel(value)
    model.setEOL(monaco.editor.EndOfLineSequence.LF)
    return possitions.map((p) => {
        const range = new monaco.Range(p.startLine, p.startColumn, p.endLine, p.endColumn)
        return model.getValueInRange(range)
    })
}
