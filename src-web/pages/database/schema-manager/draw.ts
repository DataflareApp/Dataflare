import { Edge, getSmoothStepPath, Position, Node } from '@xyflow/react'
import { t } from '../../../i18n'
import { showMessageBox } from '../../../ui'
import { writeFileToSelectPath } from '../../../utils/fs'
import { WEBSITE_URL } from '../../../utils/opener'
import { SchemaForeignKey, TableType } from '../db/db-types'
import { NODE_COLUMN_HEIGHT, NODE_HEADER_HEIGHT, NODE_WIDTH } from './hooks'
import { TableNodeProps } from './table'

interface DrawTable {
    x: number
    y: number
    name: string
    type: TableType
    columns: {
        name: string
        primaryKey: boolean
        datatype: string
        notNull: boolean
        defaultValue: boolean
        index: boolean
    }[]
}

interface DrawConfig {
    scale: number
    tableWidth: number
    tableHeaderHeight: number
    columnHeight: number
    theme: ColorTheme
}

interface ColorTheme {
    background: string
    border: string
    dot: string
    edge: string
    tableName: string
    columnName: string
    datatype: string
}

export const enum Color {
    Light,
    Dark
}

const DOT_GAP = 20
const PADDING = 32

export const calcImageSize = (scale: number, nodes: Node[]) => {
    const tables = nodes.map((item) => {
        const data = item.data as any as TableNodeProps['data']
        return {
            x: item.position.x,
            y: item.position.y,
            columns: data.columns.length
        }
    })
    const widths = tables.map((t) => t.x + NODE_WIDTH)
    const x1 = Math.min(...widths)
    const x2 = Math.max(...widths) + NODE_WIDTH
    const y1 = Math.min(...tables.map((t) => t.y))
    const y2 = Math.max(...tables.map((t) => t.y + (NODE_HEADER_HEIGHT + t.columns * NODE_COLUMN_HEIGHT)))
    return {
        width: Math.floor((x2 - x1 + PADDING * 2) * scale),
        height: Math.floor((y2 - y1 + PADDING * 2) * scale)
    }
}

const drawSchemaImage = (
    { scale, tableHeaderHeight, columnHeight, tableWidth, theme }: DrawConfig,
    tables: DrawTable[],
    foreignKeys: SchemaForeignKey[]
) => {
    const FONT_FAMILY = getComputedStyle(document.body).fontFamily

    // Adjust table offset so the leftmost/topmost table has $padding pixels from the canvas edge
    const offsetX = PADDING - Math.min(...tables.map((t) => t.x))
    const offsetY = PADDING - Math.min(...tables.map((t) => t.y))
    for (let i = 0; i < tables.length; i++) {
        tables[i].x += offsetX
        tables[i].y += offsetY
    }

    const width = PADDING + Math.max(...tables.map((t) => t.x + tableWidth))
    const height =
        PADDING + Math.max(...tables.map((t) => t.y + (tableHeaderHeight + t.columns.length * columnHeight)))

    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(width * scale)
    canvas.height = Math.floor(height * scale)
    const ctx = canvas.getContext('2d')!
    ctx.scale(scale, scale)

    ctx.fillStyle = theme.background
    ctx.fillRect(0, 0, width, height)
    for (let x = DOT_GAP / 2; x < width; x += DOT_GAP) {
        for (let y = DOT_GAP / 2; y < height; y += DOT_GAP) {
            ctx.beginPath()
            ctx.fillStyle = theme.dot
            ctx.arc(x, y, 0.5, 0, Math.PI * 2, true)
            ctx.fill()
        }
    }

    if (typeof ctx.roundRect !== 'function') {
        ctx.roundRect = (x: number, y: number, w: number, h: number, r: number) => {
            ctx.beginPath()
            ctx.moveTo(x + r, y)
            ctx.arcTo(x + w, y, x + w, y + h, r)
            ctx.arcTo(x + w, y + h, x, y + h, r)
            ctx.arcTo(x, y + h, x, y, r)
            ctx.arcTo(x, y, x + w, y, r)
            ctx.closePath()
        }
    }

    const drawTableIcon = (x: number, y: number, size: number) => {
        ctx.beginPath()
        ctx.strokeStyle = '#1D84EC'
        ctx.lineWidth = 1.5
        ctx.roundRect(x, y, size, size, 2)
        ctx.moveTo(x, y + size * 0.4)
        ctx.lineTo(x + size, y + size * 0.4)
        ctx.moveTo(x + size * 0.4, y)
        ctx.lineTo(x + size * 0.4, y + size)
        ctx.stroke()
        ctx.lineWidth = 1
    }

    const drawViewIcon = (x: number, y: number, size: number) => {
        ctx.save()
        ctx.strokeStyle = '#1D84EC'
        ctx.lineWidth = 1.8
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        const scale = size / 24
        ctx.translate(x, y)
        ctx.scale(scale, scale)
        ctx.beginPath()
        ctx.moveTo(1, 12)
        ctx.bezierCurveTo(3.933, 7.333, 7.6, 5, 12, 5)
        ctx.bezierCurveTo(16.4, 5, 20.067, 7.333, 23, 12)
        ctx.bezierCurveTo(20.067, 16.667, 16.4, 19, 12, 19)
        ctx.bezierCurveTo(7.6, 19, 3.933, 16.667, 1, 12)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(12, 12, 3, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
    }

    const keyMainPath = new Path2D(
        'M16.555 3.843l3.602 3.602a2.877 2.877 0 0 1 0 4.069l-2.643 2.643a2.877 2.877 0 0 1 -4.069 0l-.301 -.301l-6.558 6.558a2 2 0 0 1 -1.239 .578l-.175 .008h-1.172a1 1 0 0 1 -.993 -.883l-.007 -.117v-1.172a2 2 0 0 1 .467 -1.284l.119 -.13l.414 -.414h2v-2h2v-2l2.144 -2.144l-.301 -.301a2.877 2.877 0 0 1 0 -4.069l2.643 -2.643a2.877 2.877 0 0 1 4.069 0z'
    )
    const keyDotPath = new Path2D('M15 9h.01')
    const drawPrimaryKeyIcon = (x: number, y: number, size: number) => {
        ctx.save()
        ctx.strokeStyle = '#CA8A06'
        ctx.lineWidth = 1.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        const scale = size / 24
        ctx.translate(x, y)
        ctx.scale(scale, scale)
        ctx.stroke(keyMainPath)
        ctx.stroke(keyDotPath)
        ctx.restore()
    }

    const drawLetterIcon = (x: number, y: number, size: number, letter: string) => {
        ctx.beginPath()
        ctx.strokeStyle = theme.datatype
        ctx.lineWidth = 1
        ctx.roundRect(x, y, size, size, 4)
        ctx.stroke()
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = theme.datatype
        ctx.font = `${8}px ${FONT_FAMILY}`
        ctx.fillText(letter, x + size / 2, y + size / 2)
    }

    const drawText = (
        x: number,
        y: number,
        size: number,
        color: string,
        textAlign: 'left' | 'right',
        maxWidth: number,
        text: string
    ) => {
        ctx.textAlign = textAlign
        ctx.textBaseline = 'middle'
        ctx.font = `${size}px ${FONT_FAMILY}`
        ctx.fillStyle = color
        let textWidth = ctx.measureText(text).width
        if (textWidth <= maxWidth) {
            ctx.fillText(text, x, y)
        } else {
            while (textWidth > maxWidth - ctx.measureText('...').width) {
                text = text.slice(0, -1)
                textWidth = ctx.measureText(text).width
            }
            ctx.fillText(text + '...', x, y)
        }
    }

    const foreginKeyPosition = (tableName: string, columnName: string, position: Position) => {
        for (let t = 0; t < tables.length; t++) {
            if (tables[t].name === tableName) {
                for (let c = 0; c < tables[t].columns.length; c++) {
                    if (tables[t].columns[c].name === columnName) {
                        const x = position === Position.Left ? tables[t].x : tables[t].x + tableWidth
                        const y = tables[t].y + tableHeaderHeight + c * columnHeight + columnHeight / 2
                        return { x, y }
                    }
                }
                break
            }
        }
        return null
    }
    const drawForeginKey = (foreginKey: SchemaForeignKey) => {
        const from = foreginKeyPosition(foreginKey.fromTable, foreginKey.fromColumn, Position.Right)
        const to = foreginKeyPosition(foreginKey.toTable, foreginKey.toColumn, Position.Left)
        if (from !== null && to !== null) {
            const { x: x1, y: y1 } = from
            const { x: x2, y: y2 } = to
            ctx.beginPath()
            ctx.strokeStyle = theme.edge
            ctx.setLineDash([6, 6])
            let path = getSmoothStepPath({
                sourceX: x1,
                sourceY: y1,
                sourcePosition: Position.Right,
                targetX: x2,
                targetY: y2,
                targetPosition: Position.Left,
                borderRadius: 6,
                offset: 20
            })[0]
            ctx.stroke(new Path2D(path))
            ctx.setLineDash([])
        }
    }
    for (let fk of foreignKeys) {
        drawForeginKey(fk)
    }

    const drawTable = (option: DrawTable) => {
        const padding = 16
        const iconSize = 16
        const gap = 8
        // Table container
        ctx.beginPath()
        ctx.strokeStyle = theme.border
        ctx.roundRect(
            option.x,
            option.y,
            tableWidth,
            tableHeaderHeight + option.columns.length * columnHeight,
            4
        )
        ctx.shadowColor = 'rgba(0,0,0,0.3)'
        ctx.shadowBlur = 40
        ctx.shadowOffsetY = 20
        ctx.stroke()
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetY = 0
        ctx.fillStyle = theme.background
        ctx.fill()
        // Table header border
        ctx.moveTo(option.x, option.y + tableHeaderHeight)
        ctx.lineTo(option.x + tableWidth, option.y + tableHeaderHeight)
        ctx.stroke()
        // Table header icon
        if (option.type === TableType.Table) {
            drawTableIcon(option.x + padding, option.y + (tableHeaderHeight - iconSize) / 2, iconSize)
        } else {
            drawViewIcon(option.x + padding, option.y + (tableHeaderHeight - iconSize) / 2, iconSize)
        }
        // Table name in header
        drawText(
            option.x + padding + iconSize + gap,
            option.y + tableHeaderHeight / 2,
            14,
            theme.tableName,
            'left',
            tableWidth - padding * 2 - iconSize - gap,
            option.name
        )
        // Columns
        for (let i = 0; i < option.columns.length; i++) {
            const colY = option.y + tableHeaderHeight + i * columnHeight
            const rightIcons = [
                [option.columns[i].index, 'I'] as const,
                [option.columns[i].defaultValue, 'D'] as const,
                [option.columns[i].notNull, 'N'] as const
            ]
                .filter((item) => item[0])
                .map((item) => item[1]) as string[]
            // Primary key
            if (option.columns[i].primaryKey) {
                drawPrimaryKeyIcon(option.x + padding, colY + (columnHeight - iconSize) / 2, iconSize)
            }
            const contentWidth = tableWidth - padding * 2 - iconSize - gap
            // Column name
            drawText(
                option.x + padding + iconSize + gap,
                colY + columnHeight / 2,
                14,
                theme.columnName,
                'left',
                contentWidth / 2,
                option.columns[i].name
            )
            let rightStart = option.x + tableWidth - padding
            for (let letter of rightIcons) {
                drawLetterIcon(rightStart - 12, colY + (columnHeight - 12) / 2, 12, letter as any)
                rightStart -= 12 + gap
            }
            // Data type
            let iconsWidth = rightIcons.length * (12 + gap)
            drawText(
                rightStart,
                colY + columnHeight / 2,
                14,
                theme.datatype,
                'right',
                contentWidth / 2 - iconsWidth,
                option.columns[i].datatype
            )
        }
    }
    for (let table of tables) {
        drawTable(table)
    }

    const watermarkSize = 14
    drawText(
        width - watermarkSize / 2,
        height - watermarkSize,
        watermarkSize,
        '#1D84EC',
        'right',
        Infinity,
        WEBSITE_URL
    )

    return canvas
}

const schemaImageBlob = (nodes: Node[], edges: Edge[], color: Color, scale: number): Promise<Blob> => {
    const theme: ColorTheme =
        color === Color.Light
            ? {
                  background: '#fff',
                  border: '#E4E4E7',
                  dot: '#b9b9b9',
                  edge: '#B1B1B7',
                  tableName: '#0A0A0A',
                  columnName: '#3D3D3D',
                  datatype: '#909194'
              }
            : {
                  background: '#111',
                  border: '#262626',
                  dot: '#4c4c4c',
                  edge: '#B1B1B7',
                  tableName: '#FFF',
                  columnName: '#DCDCDC',
                  datatype: '#9B9BA1'
              }
    const config = {
        scale,
        tableWidth: NODE_WIDTH,
        tableHeaderHeight: NODE_HEADER_HEIGHT,
        columnHeight: NODE_COLUMN_HEIGHT,
        theme
    }
    const tables = nodes.map((item): DrawTable => {
        const data = item.data as any as TableNodeProps['data']
        const columns = data.columns.map((col) => {
            const indexs = Object.values(data.indexs)
                .map((item) => item.columns)
                .flat()
            const set = new Set(indexs)
            return {
                name: col.name,
                primaryKey: col.primaryKey,
                datatype: col.datatype,
                notNull: col.notNull,
                defaultValue: col.defaultValue !== null,
                index: set.has(col.name)
            }
        })
        return {
            name: data.tableName,
            type: data.tableType,
            x: item.position.x,
            y: item.position.y,
            columns
        }
    })

    const foreignKeys = edges.map((item): SchemaForeignKey => {
        return {
            fromTable: item.source,
            fromColumn: item.sourceHandle ?? '',
            toTable: item.target,
            toColumn: item.targetHandle ?? ''
        }
    })

    const canvas = drawSchemaImage(config, tables, foreignKeys)

    return new Promise((ok, err) => {
        canvas.toBlob(async (blob) => {
            if (blob === null) {
                const msg = 'Failed to create blob from canvas, this might be because the image is too large.'
                return err(msg)
            }
            ok(blob)
        }, 'image/png')
    })
}

export const downloadSchemaImage = async (
    nodes: Node[],
    edges: Edge[],
    color: Color,
    scale: number,
    filename: string
): Promise<boolean> => {
    try {
        const status = await writeFileToSelectPath(
            {
                defaultPath: filename,
                filters: [{ name: 'PNG', extensions: ['png'] }]
            },
            async () => {
                const blob = await schemaImageBlob(nodes, edges, color, scale)
                const bytes = await blob.arrayBuffer()
                return new Uint8Array(bytes)
            }
        )
        return status
    } catch (err: any) {
        showMessageBox(t('error'), err.toString(), 'error')
        return false
    }
}

export const copySchemaImage = async (nodes: Node[], edges: Edge[], color: Color, scale: number) => {
    try {
        const blob = await schemaImageBlob(nodes, edges, color, scale)
        const item = new ClipboardItem({ 'image/png': blob })
        await navigator.clipboard.write([item])
        return true
    } catch (err: any) {
        showMessageBox(t('error'), err.toString(), 'error')
        return false
    }
}
