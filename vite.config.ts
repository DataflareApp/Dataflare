import { readdirSync } from 'fs'
import { resolve, basename } from 'path'
import react from '@vitejs/plugin-react'
import autoprefixer from 'autoprefixer'
import tailwindcss from 'tailwindcss'
import { UserConfig } from 'vite'

// import { visualizer } from "rollup-plugin-visualizer";

export default (): UserConfig => {
    const input: Record<string, string> = {}
    const dir = resolve(__dirname, './src-web')
    const files = readdirSync(dir)
    for (const file of files) {
        if (file.endsWith('.html')) {
            const path = resolve(dir, file)
            const name = basename(file, '.html')
            input[name] = path
        }
    }
    console.table(input)

    const date = new Date()
    const y = date.getFullYear()
    const m = (date.getMonth() + 1).toString().padStart(2, '0')
    const d = date.getDate().toString().padStart(2, '0')
    const __BUILD_DATE__ = `"${y}-${m}-${d}"`

    return {
        server: {
            host: false,
            port: 5173
        },
        base: './',
        root: './src-web/',
        build: {
            outDir: '../dist/',
            assetsInlineLimit: 0,
            emptyOutDir: true,
            target: 'esnext',
            cssTarget: 'safari14',
            rolldownOptions: { input }
        },
        css: {
            postcss: {
                plugins: [tailwindcss(), autoprefixer()]
            }
        },
        plugins: [react()],
        define: {
            __BUILD_DATE__
        }
    }
}
