import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'

const worker = new editorWorker()

// @ts-ignore
self.MonacoEnvironment = {
    getWorker(_: string, label: string) {
        return worker
    }
}
