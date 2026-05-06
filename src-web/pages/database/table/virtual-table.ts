import { Value } from '../../../tauri'
import { formatBytesSize } from '../../../utils/format'
import { isMacOS } from '../../../utils/os'
import { EditValue, ForeignKeys } from '../db/db-types'
import { bytesTohexString } from '../db/escape'
import { BytesFormat } from '../hooks/use-bytes-format'
import { SizeMap } from './resize'
import { editValueToRenderedValue } from './utils'

export const DEFAULT_INDEX_WIDTH = 56
export const DEFAULT_COLUMN_WIDTH = 140
export const MIN_COLUMN_WIDTH = 80
export const ROW_HEIGHT = 32

const RESERVE_SIZE_X = 120
const RESERVE_SIZE_Y = 120
const SCROLLBAR_SIZE = 12
const SCROLLBAR_RESERVE = 4
const INDICATOR_SIZE = 7
const INDICATOR_MARGIN = 4
const MIN_INDICATOR_SIZE = 32
const PADDING = 8
const MAX_RENDER_TEXT_LENGTH = 128
const FOREIGN_KEY_WIDTH = 30
const FOREIGN_KEY_HEIGHT = 18
const FOREIGN_KEY_OFFSET_RIGHT = 2

const THEME = {
    light: {
        background: '#fff',
        border: '#e4e4e7',
        scrollbar: '#a7a7a7',
        scrollbarHighlight: '#868686',
        empty: '#cfcfcf',
        number: '#0074f7',
        boolean: '#894ef7',
        bytes: '#225eff',
        uuid: '#088658',
        text: '#52525b',
        index: '#c9c9cb',
        focusedCell: '#0384EC',
        selectedSingleRow: 'rgb(0,0,0,0.06)',
        selectedMultipleRow: 'rgb(3,132,236,0.1)',
        deletedRowBorder: '#f87171',
        deletedRowBackground: 'rgba(220,38,38,0.12)',
        foreignKey: 'rgba(0,0,0,0.1)',
        foreignKeyIcon: '#909194',
        updatedCellBorder: '#f59e0b',
        updatedCellBackground: 'rgba(251,191,36,0.15)'
    } as const,
    dark: {
        background: '#111',
        border: '#262626',
        scrollbar: '#6e6e6e',
        scrollbarHighlight: '#9A9A9A',
        empty: '#424242',
        number: '#79B8FF',
        boolean: '#b392f0',
        bytes: '#225eff',
        uuid: '#088658',
        text: '#cfcfcf',
        index: '#5e5d61',
        focusedCell: '#0384EC',
        selectedSingleRow: 'rgb(255,255,255,0.06)',
        selectedMultipleRow: 'rgb(3,132,236,0.16)',
        deletedRowBorder: '#b91c1c',
        deletedRowBackground: 'rgba(185,28,28,0.12)',
        foreignKey: 'rgba(255,255,255,0.1)',
        foreignKeyIcon: '#9d9da4',
        updatedCellBorder: '#f59e0b',
        updatedCellBackground: 'rgba(251,191,36,0.2)'
    } as const
}

type Query = {
    columns: {
        name: string
        datatype: string
    }[]
    rows: Value[][]
}

interface VirtualTableOptions {
    monospaceFont: string
    startNumber?: number
    reserveSizeY?: number
    columnSizes: {
        changed: SizeMap
        defaultWidth: number[]
    }
    query?: Query
}

export interface Cell {
    row: number
    col: number
}

export interface Rect {
    x: number
    y: number
    width: number
    height: number
}

interface Range {
    start: number
    end: number
}

const enum Direction {
    Vertical,
    Horizontal
}

export type TimestampColumns = Map<number, TimestampFormatOptions>

export interface TimestampFormatOptions {
    type: TimestampType
    timeZone: TimeZone
}

export const enum TimestampType {
    MS = 0,
    S = 1
}

export const enum TimeZone {
    UTC = 0,
    Local = 1
}

const enum ForeignKeyType {
    Forward,
    Reverse
}

export class VirtualTable {
    private container: HTMLDivElement
    private canvas!: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private scrollDiv: HTMLDivElement

    private query!: Query
    private columnSizes: VirtualTableOptions['columnSizes']
    private foreignKeys: ForeignKeys | undefined
    private reverseForeignKeys: ForeignKeys | undefined
    private totalColumnsWidth!: number
    private columnsRange!: { start: number; end: number; width: number }[]
    private numberFormat?: Intl.NumberFormat
    private bytesFormat: BytesFormat
    private startNumber: number
    private reserveSizeY: number
    private noRowsText?: string
    private timestampColumns?: TimestampColumns

    private dpr: number
    private theme: typeof THEME.light | typeof THEME.dark
    private animationFrameId?: number
    private isMouseOverContainer = false
    private hideScrollbarTimer?: number
    private scrollbarHighlight: Direction | null = null

    private dragState: { direction: Direction; offset: number; startScroll: number } | null = null

    private focusedCell: Cell | null = null
    private selectedRows = new Set<number>()
    private lastSelectedIndex: number | null = null
    private deletedRows?: ReadonlySet<number>
    private hoveredForeignKey: (Cell & { type: ForeignKeyType }) | null = null
    private updatedCells?: ReadonlyMap<number, EditValue>

    public onScrollHorizontal?: (scrollLeft: number) => void
    public onCellView?: (cell: Cell) => void
    public onContextMenu?: (cell: Cell) => void
    public onCellCopy?: (cell: Cell) => void
    public onRowsCopy?: () => void
    public onRowsDelete?: () => void
    public onRowView?: (rowIndex: number) => void
    public onChangeColumnSizes?: (sizes: SizeMap) => void
    // prettier-ignore
    public onForeignKeyClick?: (cell: Cell, area: Rect, fk: ForeignKeys[keyof ForeignKeys]) => void
    public onCellPositionChange?: () => void

    private boundHandleScroll = this.handleScroll.bind(this)
    private boundHandlePointerDown = this.handlePointerDown.bind(this)
    private boundhandleCellDblClick = this.handleCellDblClick.bind(this)
    private boundHandleContextMenu = this.handleContextMenu.bind(this)
    private boundHandleKeyDown = this.handleKeyDown.bind(this)
    private boundHandleMouseEnter = this.handleMouseEnter.bind(this)
    private boundHandleMouseLeave = this.handleMouseLeave.bind(this)
    private boundHandleMouseMove = this.handleMouseMove.bind(this)
    private dprMediaQuery?: MediaQueryList
    private boundHandleDprChange = () => {
        this.dpr = window.devicePixelRatio
        this.rebuildCanvas()
        this.draw()
        if (this.dprMediaQuery) {
            this.dprMediaQuery.removeEventListener('change', this.boundHandleDprChange)
        }
        this.dprMediaQuery = matchMedia(`(resolution: ${this.dpr}dppx)`)
        this.dprMediaQuery.addEventListener('change', this.boundHandleDprChange)
    }
    private colorSchemeQuery?: MediaQueryList
    private boundHandleColorSchemeChange = (event: MediaQueryListEvent) => {
        this.theme = event.matches ? THEME.dark : THEME.light
        this.draw()
    }
    private resizeObserver?: ResizeObserver

    private fontNormal: string
    private fontMonospace: string
    private fontNoRows: string
    private set monospace(value: boolean) {
        this.ctx.font = value ? this.fontMonospace : this.fontNormal
    }

    constructor(container: HTMLDivElement, options: VirtualTableOptions) {
        {
            this.container = container
            this.container.setAttribute('role', 'grid')
            this.container.setAttribute('aria-label', 'Data Table')
            this.container.style.position = 'relative'
            this.container.style.overflow = 'auto'
            this.container.style.outline = 'none'
            this.container.style.width = '100%'
            this.container.style.height = '100%'
            this.container.tabIndex = 0
            this.container.style.scrollbarWidth = 'none'
            // scrollbarWidth may not be compatible, so using project CSS here
            this.container.classList.add('scrollbar-hide')

            this.createCanvas()

            this.scrollDiv = document.createElement('div')
            this.scrollDiv.style.position = 'absolute'
            this.scrollDiv.style.top = '0'
            this.scrollDiv.style.pointerEvents = 'none'

            this.container.appendChild(this.canvas)
            this.container.appendChild(this.scrollDiv)
            this.ctx = this.canvas.getContext('2d')!

            if (typeof this.ctx.roundRect !== 'function') {
                this.ctx.roundRect = (x: number, y: number, w: number, h: number, r: number) => {
                    r = Math.min(r, w / 2, h / 2)
                    this.ctx.beginPath()
                    this.ctx.moveTo(x + r, y)
                    this.ctx.arcTo(x + w, y, x + w, y + h, r)
                    this.ctx.arcTo(x + w, y + h, x, y + h, r)
                    this.ctx.arcTo(x, y + h, x, y, r)
                    this.ctx.arcTo(x, y, x + w, y, r)
                    this.ctx.closePath()
                }
            }
        }

        {
            const bodyFont = getComputedStyle(document.body).fontFamily
            this.fontNormal = `12px ${bodyFont}`
            this.fontMonospace = `12px "${options.monospaceFont}", ${bodyFont}`
            this.fontNoRows = `14px ${bodyFont}`
        }

        this.query = options.query ?? {
            columns: [],
            rows: []
        }
        this.columnSizes = options.columnSizes
        this.startNumber = options.startNumber ?? 1
        this.reserveSizeY = options.reserveSizeY ?? RESERVE_SIZE_Y
        this.bytesFormat = BytesFormat.BytesSize
        this.selectedRows = new Set()

        this.dpr = window.devicePixelRatio
        this.theme = matchMedia('(prefers-color-scheme: dark)').matches ? THEME.dark : THEME.light

        this.bindEvents()
        this.calc()
        this.draw()
    }

    private createCanvas() {
        this.canvas = document.createElement('canvas')
        this.canvas.style.position = 'sticky'
        this.canvas.style.top = '0'
        this.canvas.style.left = '0'
    }

    // On macOS, when Dataflare is put in the background then the device sleeps and wakes, the canvas becomes blurry
    // This is because during sleep dpr becomes 1, and although dpr reverts to 2 after wake, the canvas remains blurry after re-rendering
    // Here we create a new canvas to replace the old one to fix this issue, likely a Safari WebKit-only bug
    // But it cannot be reproduced in the Safari browser
    private rebuildCanvas() {
        const canvas = document.createElement('canvas')
        canvas.style.cssText = this.canvas.style.cssText
        this.canvas.parentNode?.replaceChild(canvas, this.canvas)
        this.canvas = canvas
        this.ctx = this.canvas.getContext('2d')!
    }

    private bindEvents() {
        this.container.addEventListener('scroll', this.boundHandleScroll, { passive: true })
        this.container.addEventListener('pointerdown', this.boundHandlePointerDown)
        this.container.addEventListener('dblclick', this.boundhandleCellDblClick)
        this.container.addEventListener('contextmenu', this.boundHandleContextMenu)
        this.container.addEventListener('keydown', this.boundHandleKeyDown)
        this.container.addEventListener('mouseenter', this.boundHandleMouseEnter)
        this.container.addEventListener('mouseleave', this.boundHandleMouseLeave)
        this.container.addEventListener('mousemove', this.boundHandleMouseMove, { passive: true })

        this.dprMediaQuery = matchMedia(`(resolution: ${this.dpr}dppx)`)
        this.dprMediaQuery.addEventListener('change', this.boundHandleDprChange)

        this.colorSchemeQuery = matchMedia('(prefers-color-scheme: dark)')
        this.colorSchemeQuery.addEventListener('change', this.boundHandleColorSchemeChange)

        this.resizeObserver = new ResizeObserver(() => {
            this.draw()
            this.onCellPositionChange?.()
        })
        this.resizeObserver.observe(this.container)
    }

    public destroy() {
        this.container.removeEventListener('scroll', this.boundHandleScroll)
        this.container.removeEventListener('pointerdown', this.boundHandlePointerDown)
        this.container.removeEventListener('dblclick', this.boundhandleCellDblClick)
        this.container.removeEventListener('contextmenu', this.boundHandleContextMenu)
        this.container.removeEventListener('keydown', this.boundHandleKeyDown)
        this.container.removeEventListener('mouseenter', this.boundHandleMouseEnter)
        this.container.removeEventListener('mouseleave', this.boundHandleMouseLeave)
        this.container.removeEventListener('mousemove', this.boundHandleMouseMove)

        if (this.resizeObserver) {
            this.resizeObserver.disconnect()
            this.resizeObserver = undefined
        }
        if (this.dprMediaQuery) {
            this.dprMediaQuery.removeEventListener('change', this.boundHandleDprChange)
            this.dprMediaQuery = undefined
        }
        if (this.colorSchemeQuery) {
            this.colorSchemeQuery.removeEventListener('change', this.boundHandleColorSchemeChange)
            this.colorSchemeQuery = undefined
        }
        if (this.animationFrameId !== undefined) {
            cancelAnimationFrame(this.animationFrameId)
            this.animationFrameId = undefined
        }
        if (this.hideScrollbarTimer !== undefined) {
            clearTimeout(this.hideScrollbarTimer)
            this.hideScrollbarTimer = undefined
        }

        this.container.innerHTML = ''
    }

    private calc() {
        const indexSize = this.columnSizes.changed['#'] ?? this.columnSizes.defaultWidth[0]
        const index = {
            start: 0,
            end: indexSize,
            width: indexSize
        }
        this.columnsRange = [index]
        let start = indexSize
        for (let i = 0; i < this.query.columns.length; i++) {
            const width =
                this.columnSizes.changed[this.query.columns[i].name] ?? this.columnSizes.defaultWidth[i + 1]
            this.columnsRange.push({
                start,
                end: start + width,
                width
            })
            start += width
        }
        this.totalColumnsWidth = start
        this.scrollDiv.style.height = `${ROW_HEIGHT * this.query.rows.length + this.reserveSizeY}px`
        this.scrollDiv.style.width = `${this.totalColumnsWidth + RESERVE_SIZE_X}px`
    }

    public focus() {
        this.container.focus()
    }

    public updateQuery(query: Query | undefined) {
        if (query === this.query) {
            return
        }
        this.query = query ?? { columns: [], rows: [] }

        const maxRow = this.query.rows.length - 1
        const maxSelectedRow =
            this.selectedRows.size > 0 ? Math.max(...this.selectedRows) : Number.MAX_SAFE_INTEGER
        if ((this.lastSelectedIndex !== null && this.lastSelectedIndex > maxRow) || maxSelectedRow > maxRow) {
            this.lastSelectedIndex = null
            this.selectedRows.clear()
        }
        if (this.deletedRows && this.deletedRows.size > 0) {
            if (Math.max(...this.deletedRows) > maxRow) {
                this.deletedRows = undefined
            }
        }
        if (this.focusedCell) {
            if (
                this.focusedCell.row > maxRow ||
                this.focusedCell.col < 0 ||
                this.focusedCell.col >= this.columnsRange.length
            ) {
                this.focusedCell = null
            }
        }

        this.calc()
        this.draw()
        this.onCellPositionChange?.()
    }

    public getQuery(): Query | undefined {
        return this.query
    }

    public updateColumnSizes(columnSizes: VirtualTableOptions['columnSizes']) {
        this.columnSizes = columnSizes
        this.calc()
        this.draw()
        this.onCellPositionChange?.()
    }

    public updateForeignKeys(foreignKeys: ForeignKeys | undefined) {
        if (foreignKeys !== this.foreignKeys) {
            this.foreignKeys = foreignKeys
            this.draw()
        }
    }

    public getForeignKeys(): ForeignKeys | undefined {
        return this.foreignKeys
    }

    public updateReverseForeignKeys(reverseForeignKeys: ForeignKeys | undefined) {
        if (reverseForeignKeys !== this.reverseForeignKeys) {
            this.reverseForeignKeys = reverseForeignKeys
            this.draw()
        }
    }

    public getReverseForeignKeys(): ForeignKeys | undefined {
        return this.reverseForeignKeys
    }

    public updateStartNumber(value: number | undefined) {
        const n = value ?? 1
        if (n !== this.startNumber) {
            this.startNumber = n
            this.draw()
        }
    }

    public updateNoRowsText(text: string | undefined) {
        if (text !== this.noRowsText) {
            this.noRowsText = text
            this.draw()
        }
    }

    public updateNumberFormat(format: Intl.NumberFormat | undefined) {
        if (format !== this.numberFormat) {
            this.numberFormat = format
            this.draw()
        }
    }

    private formatNumber(value: number | bigint): string {
        return this.numberFormat ? this.numberFormat.format(value) : value.toString()
    }

    private formatTimestamp(value: number | bigint, options: TimestampFormatOptions): string | null {
        const original = Number(value)
        const timestamp = options.type === TimestampType.MS ? original : original * 1000
        if (!Number.isFinite(timestamp) || timestamp < -8640000000000000 || timestamp > 8640000000000000) {
            return null
        }
        const date = new Date(timestamp)
        let year: number, month: number, day: number, hours: number, minutes: number, seconds: number
        let milliseconds = null as number | null
        let utcZone: boolean
        switch (options.timeZone) {
            case TimeZone.UTC: {
                year = date.getUTCFullYear()
                month = date.getUTCMonth() + 1
                day = date.getUTCDate()
                hours = date.getUTCHours()
                minutes = date.getUTCMinutes()
                seconds = date.getUTCSeconds()
                if (options.type === TimestampType.MS) {
                    milliseconds = date.getUTCMilliseconds()
                }
                utcZone = true
                break
            }
            case TimeZone.Local: {
                year = date.getFullYear()
                month = date.getMonth() + 1
                day = date.getDate()
                hours = date.getHours()
                minutes = date.getMinutes()
                seconds = date.getSeconds()
                if (options.type === TimestampType.MS) {
                    milliseconds = date.getMilliseconds()
                }
                utcZone = false
                break
            }
        }
        let m = month.toString().padStart(2, '0')
        let d = day.toString().padStart(2, '0')
        let ho = hours.toString().padStart(2, '0')
        let mi = minutes.toString().padStart(2, '0')
        let se = seconds.toString().padStart(2, '0')

        let val = `${year}-${m}-${d} ${ho}:${mi}:${se}`
        if (milliseconds !== null) {
            let mi = milliseconds.toString().padStart(3, '0')
            val += `.${mi}`
        }
        if (utcZone) {
            val += 'Z'
        }
        val += options.type === TimestampType.MS ? ` ms=${original}` : ` s=${original}`
        return val
    }

    public updateBytesFormat(format: BytesFormat) {
        if (format !== this.bytesFormat) {
            this.bytesFormat = format
            this.draw()
        }
    }

    public updateTimestampColumns(columns: TimestampColumns | undefined) {
        if (columns !== this.timestampColumns) {
            this.timestampColumns = columns
            this.draw()
        }
    }

    public updateDeletedRows(rows: ReadonlySet<number> | undefined) {
        if (rows !== this.deletedRows) {
            this.selectedRows.clear()
            this.lastSelectedIndex = this.focusedCell?.row ?? null
            this.deletedRows = rows
            this.draw()
        }
    }

    public updateUpdatedCells(cells: ReadonlyMap<number, EditValue> | undefined) {
        if (cells !== this.updatedCells) {
            this.updatedCells = cells
            this.draw()
        }
    }

    private formatBytes(bytes: Uint8Array): string {
        const MAX = 32
        switch (this.bytesFormat) {
            case BytesFormat.BytesSize: {
                return formatBytesSize(bytes.length)
            }
            case BytesFormat.Binary: {
                if (bytes.length > MAX) {
                    return '[' + bytes.slice(0, MAX).toString() + ',…]'
                }
                return '[' + bytes.toString() + ']'
            }
            case BytesFormat.Hex: {
                if (bytes.length > MAX) {
                    return bytesTohexString(bytes.slice(0, MAX)) + '…'
                }
                if (bytes.length === 0) {
                    return 'EMPTY'
                }
                return bytesTohexString(bytes)
            }
        }
    }

    public getCellPosition(cell: Cell): Rect | null {
        if (
            cell.row < 0 ||
            cell.row >= this.query.rows.length ||
            cell.col < 0 ||
            cell.col >= this.query.columns.length
        ) {
            return null
        }

        const { start: cellLeft, width: cellWidth } = this.columnsRange[cell.col + 1]
        const cellTop = cell.row * ROW_HEIGHT
        const cellX = cellLeft - this.container.scrollLeft
        const cellY = cellTop - this.container.scrollTop

        return {
            x: cellX,
            y: cellY,
            width: cellWidth,
            height: ROW_HEIGHT
        }
    }

    public getSelectedRowsSet(): ReadonlySet<number> {
        return this.selectedRows
    }

    public getSelectedRowsArray(): number[] {
        return Array.from(this.selectedRows).sort((a, b) => a - b)
    }

    private hoveredForeignKeyEq(row: number, col: number, type: ForeignKeyType): boolean {
        return (
            this.hoveredForeignKey?.row === row &&
            this.hoveredForeignKey?.col === col &&
            this.hoveredForeignKey?.type === type
        )
    }

    // Not using cache here because for uuid and timestamp columns, caching is meaningless as it would almost never hit
    // BUG: French locale numbers like '123 456 789' will be measured inaccurately; note: the character between digits is not a space
    public getColumnContentSize(col: number): number {
        const name = this.query.columns[col].name
        const fk = this.foreignKeys?.[name] !== undefined
        const rfk = this.reverseForeignKeys?.[name] !== undefined
        const buttonCount = (fk ? 1 : 0) + (rfk ? 1 : 0)
        const offset =
            buttonCount === 0
                ? // No foreign key button
                  PADDING * 2
                : // Has foreign key button
                  PADDING +
                  FOREIGN_KEY_OFFSET_RIGHT +
                  FOREIGN_KEY_WIDTH * buttonCount +
                  FOREIGN_KEY_OFFSET_RIGHT
        let textWidth = MIN_COLUMN_WIDTH - offset
        for (const row of this.query.rows) {
            const width = this.renderedTextWidth(row[col], col)
            if (width > textWidth) {
                textWidth = width
            }
        }

        return Math.ceil(textWidth) + offset
    }

    private draw() {
        if (this.animationFrameId !== undefined) {
            return
        }
        this.animationFrameId = requestAnimationFrame(() => {
            this.animationFrameId = undefined
            this._draw()
        })
    }

    private visibleArea() {
        const rect = this.container.getBoundingClientRect()

        const scrollTop = this.container.scrollTop
        const scrollLeft = this.container.scrollLeft

        const firstVisibleRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT))
        const lastVisibleRow = Math.min(
            Math.ceil((scrollTop + rect.height) / ROW_HEIGHT),
            this.query.rows.length
        )

        let firstVisibleCol = 0
        let lastVisibleCol = this.columnsRange.length

        for (let i = 0; i < this.columnsRange.length; i++) {
            if (this.columnsRange[i].end > scrollLeft) {
                firstVisibleCol = i
                break
            }
        }
        for (let i = 1; i < this.columnsRange.length; i++) {
            if (this.columnsRange[i].start >= scrollLeft + rect.width) {
                lastVisibleCol = i
                break
            }
        }

        return {
            rect,
            scrollTop,
            scrollLeft,
            firstVisibleRow,
            lastVisibleRow,
            firstVisibleCol,
            lastVisibleCol
        }
    }

    // Group Set<number> by consecutive numbers
    private groupContinuousRows(set: ReadonlySet<number>, firstRow: number, lastRow: number): Range[] {
        // None selected
        if (set.size === 0) {
            return []
        }
        // All selected
        if (set.size === this.query.rows.length) {
            return [{ start: 0, end: this.query.rows.length - 1 }]
        }
        // Partial selection
        const groups: Range[] = []
        const visibleRows: number[] = []
        // Only process rows within the visible area
        for (const r of set) {
            if (r >= firstRow && r < lastRow) {
                visibleRows.push(r)
            }
        }
        if (visibleRows.length > 0) {
            visibleRows.sort((a, b) => a - b)
            for (const r of visibleRows) {
                const last = groups[groups.length - 1]
                if (!last || r !== last.end + 1) {
                    groups.push({ start: r, end: r })
                } else {
                    last.end = r
                }
            }
        }
        return groups
    }

    private _draw() {
        const {
            rect,
            scrollTop,
            scrollLeft,
            firstVisibleRow,
            lastVisibleRow,
            firstVisibleCol,
            lastVisibleCol
        } = this.visibleArea()

        this.canvas.style.width = rect.width + 'px'
        this.canvas.style.height = rect.height + 'px'
        this.canvas.width = Math.floor(rect.width * this.dpr)
        this.canvas.height = Math.floor(rect.height * this.dpr)
        this.ctx.scale(this.dpr, this.dpr)
        this.ctx.textBaseline = 'middle'
        this.ctx.fillStyle = this.theme.background
        this.ctx.fillRect(0, 0, rect.width, rect.height)
        this.ctx.lineWidth = 1

        // Column right border
        const colHeight = (lastVisibleRow - firstVisibleRow) * ROW_HEIGHT - (scrollTop % ROW_HEIGHT)
        this.ctx.strokeStyle = this.theme.border
        for (let col = firstVisibleCol; col < lastVisibleCol; col++) {
            const x = this.columnsRange[col].end - scrollLeft
            this.ctx.beginPath()
            this.ctx.moveTo(x, 0)
            this.ctx.lineTo(x, colHeight)
            this.ctx.stroke()
        }

        const multipleSelection = this.selectedRows.size > 1
        let focused: Rect | null = null

        for (let row = firstVisibleRow; row < lastVisibleRow; row++) {
            const y = row * ROW_HEIGHT - scrollTop

            // Row bottom border
            // Handle row bottom border edge case to prevent being too close to the edge
            if (
                // Top
                y + ROW_HEIGHT !== 0 &&
                // Bottom
                y + ROW_HEIGHT !== rect.height
            ) {
                this.ctx.strokeStyle = this.theme.border
                this.ctx.beginPath()
                const lineStartX = Math.max(0, -scrollLeft)
                const lineEndX = Math.min(this.totalColumnsWidth - scrollLeft, rect.width)
                this.ctx.moveTo(lineStartX, y + ROW_HEIGHT)
                this.ctx.lineTo(lineEndX, y + ROW_HEIGHT)
                this.ctx.stroke()
            }

            // Deleted row background color
            if (this.columnsRange.length > 1 && this.deletedRows?.has(row)) {
                const x = Math.max(0, this.columnsRange[1].start - scrollLeft)
                const width = Math.min(this.totalColumnsWidth - scrollLeft, rect.width) - x
                if (width > 0) {
                    this.ctx.fillStyle = this.theme.deletedRowBackground
                    this.ctx.fillRect(x, y, width, ROW_HEIGHT)
                }
            }

            // Selected row background color
            if (this.selectedRows.has(row)) {
                const x = Math.max(0, -scrollLeft)
                const width = Math.min(this.totalColumnsWidth - scrollLeft, rect.width)
                this.ctx.fillStyle = multipleSelection
                    ? this.theme.selectedMultipleRow
                    : this.theme.selectedSingleRow
                this.ctx.fillRect(x, y, width, ROW_HEIGHT)
            }

            for (let col = firstVisibleCol; col < lastVisibleCol; col++) {
                const { start, width } = this.columnsRange[col]
                const x = start - scrollLeft
                const isIndexColumn = col === 0

                if (!isIndexColumn && this.focusedCell?.row === row && this.focusedCell?.col === col - 1) {
                    focused = { x, y, width, height: ROW_HEIGHT }
                }

                // Index cell
                if (isIndexColumn) {
                    this.renderIndex(row, x, y, width, ROW_HEIGHT)
                    continue
                }

                // Value cell style
                const key = row * this.query.columns.length + (col - 1)
                const updatedValue = this.updatedCells?.get(key)
                if (updatedValue !== undefined) {
                    this.ctx.fillStyle = this.theme.updatedCellBackground
                    this.ctx.strokeStyle = this.theme.updatedCellBorder
                    this.ctx.fillRect(x, y, width, ROW_HEIGHT)
                    const { x_, y_, w_, h_ } = this.calcRectEdge(rect, x, y, width, ROW_HEIGHT)
                    this.ctx.beginPath()
                    this.ctx.roundRect(x_, y_, w_, h_, 4)
                    this.ctx.stroke()
                }

                const columnName = this.query.columns[col - 1].name
                const foreignKeyValue = this.foreignKeys?.[columnName]
                const reverseForeignKeyValue = this.reverseForeignKeys?.[columnName]

                if (updatedValue === undefined) {
                    const v = this.query.rows[row][col - 1]
                    // prettier-ignore
                    this.renderCellContent(v, false, row, col - 1, x, y, width, foreignKeyValue,reverseForeignKeyValue)
                } else {
                    const v = editValueToRenderedValue(updatedValue)
                    // prettier-ignore
                    this.renderCellContent(v, true, row, col - 1, x, y, width, foreignKeyValue,reverseForeignKeyValue)
                }
            }
        }

        if (this.columnsRange.length > 1) {
            // prettier-ignore
            if (this.deletedRows) {
                this.drawGroupBorder(this.deletedRows, rect, scrollLeft, scrollTop, firstVisibleRow, lastVisibleRow, this.theme.deletedRowBorder)
            }
            // prettier-ignore
            if (multipleSelection) {
                this.drawGroupBorder(this.selectedRows, rect, scrollLeft, scrollTop, firstVisibleRow, lastVisibleRow, this.theme.focusedCell)
            }
        }

        if (focused) {
            // prettier-ignore
            const { x_, y_, w_, h_ } = this.calcRectEdge(rect, focused.x, focused.y, focused.width, focused.height)
            this.ctx.strokeStyle = this.theme.focusedCell
            this.ctx.beginPath()
            this.ctx.roundRect(x_, y_, w_, h_, 4)
            this.ctx.stroke()
        }

        this.drawNoRows(rect)
        this.drawScrollbars(rect, scrollLeft, scrollTop)
    }

    // Handle border edge case to prevent being too close to the edge
    // prettier-ignore
    private calcRectEdge( rect: DOMRect, x: number, y: number, width: number, height: number): { x_: number; y_: number; w_: number; h_: number } {
        // Top
        if (y === 0) {
            y = 0.5
            height -= 0.5
        }
        // Bottom
        else if (y + height === rect.height) {
            height -= 0.5
        }
        // Left
        if (x === 0) {
            x = 0.5
            width -= 0.5
        }
        // Right
        else if (x + width === rect.width) {
            width -= 0.5
        }
        return { x_: x, y_: y, w_: width, h_: height }
    }

    private drawGroupBorder(
        set: ReadonlySet<number>,
        rect: DOMRect,
        scrollLeft: number,
        scrollTop: number,
        firstVisibleRow: number,
        lastVisibleRow: number,
        color: string
    ) {
        if (this.columnsRange.length <= 1) {
            return
        }
        const groups = this.groupContinuousRows(set, firstVisibleRow, lastVisibleRow)
        if (groups.length === 0) {
            return
        }
        const { start } = this.columnsRange[1]
        let baseX = start - scrollLeft
        let baseWidth = this.totalColumnsWidth - start
        this.ctx.strokeStyle = color
        for (const group of groups) {
            let y = group.start * ROW_HEIGHT - scrollTop
            let height = (group.end - group.start + 1) * ROW_HEIGHT
            if (y + height < 0 || y > rect.height) {
                continue
            }
            // prettier-ignore
            const { x_, y_, w_, h_ } = this.calcRectEdge(rect, baseX, y, baseWidth, height)
            if (y_ + h_ < 0 || y_ > rect.height) {
                continue
            }
            if (w_ <= 0 || h_ <= 0) {
                continue
            }
            this.ctx.beginPath()
            this.ctx.roundRect(x_, y_, w_, h_, 4)
            this.ctx.stroke()
        }
    }

    private drawNoRows(rect: DOMRect) {
        if (this.query.rows.length !== 0 || this.noRowsText === undefined) {
            return
        }
        this.ctx.font = this.fontNoRows
        const text = this.noRowsText
        const width = this.ctx.measureText(text).width
        this.ctx.fillStyle = this.theme.foreignKeyIcon
        this.ctx.fillText(text, (rect.width - width) / 2, rect.height / 2)
    }

    private drawScrollbars(rect: DOMRect, scrollLeft: number, scrollTop: number) {
        if (!this.isMouseOverContainer) {
            return
        }

        const totalHeight = this.query.rows.length * ROW_HEIGHT + this.reserveSizeY
        const totalColumnsWidth = this.totalColumnsWidth + RESERVE_SIZE_X
        const showVerticalScrollbar = totalHeight > rect.height
        const showHorizontalScrollbar = totalColumnsWidth > rect.width

        if (showHorizontalScrollbar) {
            const scrollbarX = 0
            const scrollbarY = rect.height - SCROLLBAR_SIZE
            const scrollbarWidth = rect.width

            this.ctx.fillStyle = this.theme.background
            this.ctx.fillRect(scrollbarX, scrollbarY, scrollbarWidth, SCROLLBAR_SIZE)

            this.ctx.strokeStyle = this.theme.border
            this.ctx.beginPath()
            this.ctx.moveTo(scrollbarX, scrollbarY)
            this.ctx.lineTo(scrollbarWidth, scrollbarY)
            this.ctx.stroke()

            const indicatorScrollbarWidth = rect.width - (showVerticalScrollbar ? SCROLLBAR_SIZE : 0)
            const maxScrollLeft = totalColumnsWidth - rect.width
            const scrollRatio = maxScrollLeft > 0 ? Math.min(1, scrollLeft / maxScrollLeft) : 0
            const indicatorWidth = Math.max(
                MIN_INDICATOR_SIZE,
                (rect.width / totalColumnsWidth) * indicatorScrollbarWidth
            )
            const maxIndicatorX = indicatorScrollbarWidth - indicatorWidth
            const indicatorX =
                INDICATOR_MARGIN + scrollRatio * Math.max(0, maxIndicatorX - INDICATOR_MARGIN * 2)

            const indicatorY = scrollbarY + (SCROLLBAR_SIZE - INDICATOR_SIZE) / 2
            this.drawIndicator(Direction.Horizontal, indicatorX, indicatorY, indicatorWidth, INDICATOR_SIZE)
        }

        if (showVerticalScrollbar) {
            const scrollbarX = rect.width - SCROLLBAR_SIZE
            const scrollbarY = 0
            const scrollbarHeight = rect.height

            this.ctx.fillStyle = this.theme.background
            this.ctx.fillRect(scrollbarX, scrollbarY, SCROLLBAR_SIZE, scrollbarHeight)

            this.ctx.strokeStyle = this.theme.border
            this.ctx.beginPath()
            this.ctx.moveTo(scrollbarX, scrollbarY)
            this.ctx.lineTo(
                scrollbarX,
                showHorizontalScrollbar ? rect.height - SCROLLBAR_SIZE : scrollbarHeight
            )
            this.ctx.stroke()

            const indicatorScrollbarHeight = rect.height - (showHorizontalScrollbar ? SCROLLBAR_SIZE : 0)
            const maxScrollTop = totalHeight - rect.height
            const scrollRatio = maxScrollTop > 0 ? Math.min(1, scrollTop / maxScrollTop) : 0
            const indicatorHeight = Math.max(
                MIN_INDICATOR_SIZE,
                (rect.height / totalHeight) * indicatorScrollbarHeight
            )
            const maxIndicatorY = indicatorScrollbarHeight - indicatorHeight
            const indicatorY =
                INDICATOR_MARGIN + scrollRatio * Math.max(0, maxIndicatorY - INDICATOR_MARGIN * 2)

            const indicatorX = scrollbarX + (SCROLLBAR_SIZE - INDICATOR_SIZE) / 2
            this.drawIndicator(Direction.Vertical, indicatorX, indicatorY, INDICATOR_SIZE, indicatorHeight)
        }
    }

    private drawIndicator = (direction: Direction, x: number, y: number, width: number, height: number) => {
        const fill =
            this.scrollbarHighlight === direction || this.dragState?.direction === direction
                ? this.theme.scrollbarHighlight
                : this.theme.scrollbar
        this.ctx.fillStyle = fill
        this.ctx.beginPath()
        this.ctx.roundRect(x, y, width, height, INDICATOR_SIZE / 2)
        this.ctx.fill()
    }

    private isMouseInScrollbarArea(clientX: number, clientY: number): Direction | null {
        const rect = this.container.getBoundingClientRect()
        const totalHeight = this.query.rows.length * ROW_HEIGHT + this.reserveSizeY
        const totalColumnsWidth = this.totalColumnsWidth + RESERVE_SIZE_X

        const showVerticalScrollbar = totalHeight > rect.height
        const showHorizontalScrollbar = totalColumnsWidth > rect.width

        if (showHorizontalScrollbar) {
            const y = clientY - rect.top
            const scrollbarY = rect.height - SCROLLBAR_SIZE
            if (y + SCROLLBAR_RESERVE >= scrollbarY && y <= rect.height) {
                return Direction.Horizontal
            }
        }
        if (showVerticalScrollbar) {
            const x = clientX - rect.left
            const scrollbarX = rect.width - SCROLLBAR_SIZE
            if (x + SCROLLBAR_RESERVE >= scrollbarX && x <= rect.width) {
                return Direction.Vertical
            }
        }
        return null
    }

    private measureText(text: string, availableWidth: number): string {
        if (text.length > MAX_RENDER_TEXT_LENGTH) {
            text = text.substring(0, MAX_RENDER_TEXT_LENGTH) + '…'
        }
        const fullTextWidth = this.ctx.measureText(text).width
        if (fullTextWidth <= availableWidth) {
            return text
        }

        // Monospace and proportional fonts are 7.2 / 9.6 respectively; for performance, not measuring ellipsis width here
        const ellipsisWidth = 7
        const targetWidth = availableWidth - ellipsisWidth
        let left = 0
        let right = text.length
        let bestLength = 0
        while (left <= right) {
            const mid = Math.floor((left + right) / 2)
            const testText = text.substring(0, mid)
            const testWidth = this.ctx.measureText(testText).width
            if (testWidth <= targetWidth) {
                bestLength = mid
                left = mid + 1
            } else {
                right = mid - 1
            }
        }
        return text.substring(0, bestLength) + '…'
    }

    private renderIndex(row: number, x: number, y: number, w: number, h: number) {
        this.monospace = true
        const index = row + this.startNumber
        const text = this.measureText(index.toString(), w - PADDING * 2)
        this.ctx.fillStyle = this.theme.index
        this.ctx.fillText(text, x + PADDING, y + h / 2)
    }

    private renderCellContent(
        value: Value,
        updatedValue: boolean,
        row: number,
        col: number,
        x: number,
        y: number,
        w: number,
        fk: unknown | undefined,
        rfk: unknown | undefined
    ) {
        const buttonCount = (fk !== undefined ? 1 : 0) + (rfk !== undefined ? 1 : 0)
        const maxTextWidth =
            buttonCount === 0
                ? w - PADDING * 2
                : w -
                  PADDING -
                  FOREIGN_KEY_OFFSET_RIGHT -
                  FOREIGN_KEY_WIDTH * buttonCount -
                  FOREIGN_KEY_OFFSET_RIGHT

        const { text, color } = this.renderedText(value, col, maxTextWidth)
        this.ctx.fillStyle = updatedValue ? this.theme.updatedCellBorder : color
        this.ctx.fillText(text, x + PADDING, y + ROW_HEIGHT / 2)

        // Foreign key button
        const buttonY = y + (ROW_HEIGHT - FOREIGN_KEY_HEIGHT) / 2
        let buttonX = x + w - FOREIGN_KEY_OFFSET_RIGHT

        if (fk !== undefined) {
            buttonX -= FOREIGN_KEY_WIDTH
            const hovered = this.hoveredForeignKeyEq(row, col, ForeignKeyType.Forward)
            if (hovered) {
                this.ctx.fillStyle = this.theme.foreignKey
                this.ctx.beginPath()
                this.ctx.roundRect(buttonX, buttonY, FOREIGN_KEY_WIDTH, FOREIGN_KEY_HEIGHT, 4)
                this.ctx.fill()
            }
            this.renderForeignKeyArrow(buttonX, y, ForeignKeyType.Forward)
        }
        if (rfk !== undefined) {
            buttonX -= FOREIGN_KEY_WIDTH
            const hovered = this.hoveredForeignKeyEq(row, col, ForeignKeyType.Reverse)
            if (hovered) {
                this.ctx.fillStyle = this.theme.foreignKey
                this.ctx.beginPath()
                this.ctx.roundRect(buttonX, buttonY, FOREIGN_KEY_WIDTH, FOREIGN_KEY_HEIGHT, 4)
                this.ctx.fill()
            }
            this.renderForeignKeyArrow(buttonX, y, ForeignKeyType.Reverse)
        }
    }

    private renderForeignKeyArrow(buttonX: number, y: number, type: ForeignKeyType) {
        const iconSize = 8
        const iconX = buttonX + (FOREIGN_KEY_WIDTH - iconSize) / 2
        const iconY = y + (ROW_HEIGHT - iconSize) / 2
        const edge = 1
        const sw = 1.2
        const so = sw / 2

        this.ctx.save()
        this.ctx.lineCap = 'round'
        this.ctx.lineJoin = 'round'
        this.ctx.lineWidth = sw
        this.ctx.strokeStyle = this.theme.foreignKeyIcon
        this.ctx.beginPath()

        switch (type) {
            case ForeignKeyType.Forward: {
                this.ctx.moveTo(iconX + edge, iconY + so)
                this.ctx.lineTo(iconX + iconSize - so, iconY + so)
                this.ctx.lineTo(iconX + iconSize - so, iconY + iconSize - edge)
                break
            }
            case ForeignKeyType.Reverse: {
                this.ctx.moveTo(iconX + iconSize - edge, iconY + iconSize - so)
                this.ctx.lineTo(iconX + so, iconY + iconSize - so)
                this.ctx.lineTo(iconX + so, iconY + edge)
                break
            }
        }
        this.ctx.moveTo(iconX + so, iconY + iconSize - so)
        this.ctx.lineTo(iconX + iconSize - so, iconY + so)

        this.ctx.stroke()
        this.ctx.restore()
    }

    private renderedText(
        value: Value,
        col: number,
        maxWidth: number
    ): {
        text: string
        color: string
    } {
        if (typeof value === 'string') {
            if (value.length === 0) {
                this.monospace = false
                return {
                    text: 'EMPTY',
                    color: this.theme.empty
                }
            }
            switch (this.query.columns[col].datatype) {
                case 'uuid':
                case 'guid': {
                    this.monospace = true
                    return {
                        text: this.measureText(value, maxWidth),
                        color: this.theme.uuid
                    }
                }
                case 'date':
                case 'time':
                case 'timetz':
                case 'time_ns':
                case 'datetime':
                case 'timestamp':
                case 'timestamptz':
                case 'year':
                case 'bit':
                case 'inet':
                case 'cidr':
                case 'varint':
                case 'ipaddress':
                case 'bignum':
                case 'numeric': {
                    this.monospace = true
                    return {
                        text: this.measureText(value, maxWidth),
                        color: this.theme.text
                    }
                }
                default: {
                    this.monospace = false
                    return {
                        text: this.measureText(value, maxWidth),
                        color: this.theme.text
                    }
                }
            }
        }
        if (value === null) {
            this.monospace = false
            return {
                text: 'NULL',
                color: this.theme.empty
            }
        }
        if (typeof value === 'number' || typeof value === 'bigint') {
            this.monospace = true
            const { text, colored } = this.renderedNumberText(value, col)
            return {
                text: this.measureText(text, maxWidth),
                color: colored ? this.theme.number : this.theme.text
            }
        }
        if (typeof value === 'boolean') {
            this.monospace = true
            return {
                text: value ? 'true' : 'false',
                color: this.theme.boolean
            }
        }
        this.monospace = true
        return {
            text: this.measureText(this.formatBytes(value), maxWidth),
            color: this.theme.bytes
        }
    }

    private renderedTextWidth(value: Value, col: number): number {
        const measureWidth = (text: string) => {
            if (text.length > MAX_RENDER_TEXT_LENGTH) {
                text = text.substring(0, MAX_RENDER_TEXT_LENGTH) + '…'
            }
            return this.ctx.measureText(text).width
        }
        if (typeof value === 'string') {
            if (value.length === 0) {
                return 0
            }
            switch (this.query.columns[col].datatype) {
                case 'uuid':
                case 'guid':
                case 'date':
                case 'time':
                case 'timetz':
                case 'time_ns':
                case 'datetime':
                case 'timestamp':
                case 'timestamptz':
                case 'year':
                case 'bit':
                case 'inet':
                case 'cidr':
                case 'varint':
                case 'ipaddress':
                case 'bignum':
                case 'numeric': {
                    this.monospace = true
                    return measureWidth(value)
                }
                default: {
                    this.monospace = false
                    return measureWidth(value)
                }
            }
        }
        if (value === null) {
            return 0
        }
        if (typeof value === 'number' || typeof value === 'bigint') {
            this.monospace = true
            return measureWidth(this.renderedNumberText(value, col).text)
        }
        if (typeof value === 'boolean') {
            return 0
        }
        this.monospace = true
        return measureWidth(this.formatBytes(value))
    }

    private renderedNumberText(
        value: number | bigint,
        col: number
    ): {
        text: string
        colored: boolean
    } {
        const type = this.timestampColumns?.get(col)
        if (type === undefined) {
            return { text: this.formatNumber(value), colored: true }
        }
        const timestamp = this.formatTimestamp(value, type)
        if (timestamp === null) {
            return { text: this.formatNumber(value), colored: true }
        }
        return { text: timestamp, colored: false }
    }

    private getCellFromPoint(clientX: number, clientY: number): Cell | null {
        const rect = this.container.getBoundingClientRect()
        const x = clientX - rect.left + this.container.scrollLeft
        const y = clientY - rect.top + this.container.scrollTop

        const row = Math.floor(y / ROW_HEIGHT)
        if (row >= this.query.rows.length) {
            return null
        }

        let col = null as number | null
        for (let i = 0; i < this.columnsRange.length; i++) {
            const { start, end } = this.columnsRange[i]
            if (x >= start && x < end) {
                col = i
                break
            }
        }
        if (col === null) {
            return null
        }
        return { row, col: col - 1 }
    }

    private getForeignKeyFromPoint(
        clientX: number,
        clientY: number
    ): {
        cell: Cell
        fk: ForeignKeys[keyof ForeignKeys]
        area: Rect
        type: ForeignKeyType
    } | null {
        if (this.foreignKeys === undefined && this.reverseForeignKeys === undefined) {
            return null
        }

        const rect = this.container.getBoundingClientRect()
        const scrollLeft = this.container.scrollLeft
        const localX = clientX - rect.left + scrollLeft
        const localY = clientY - rect.top + this.container.scrollTop

        // Valid row range
        const row = Math.floor(localY / ROW_HEIGHT)
        if (row < 0 || row >= this.query.rows.length) {
            return null
        }

        // Valid Y-axis range
        const buttonY = row * ROW_HEIGHT + (ROW_HEIGHT - FOREIGN_KEY_HEIGHT) / 2
        if (localY < buttonY || localY > buttonY + FOREIGN_KEY_HEIGHT) {
            return null
        }

        // Valid X-axis range
        for (let i = 1; i < this.columnsRange.length; i++) {
            const { start, end, width } = this.columnsRange[i]

            if (localX < start || localX >= end) {
                continue
            }

            const columnName = this.query.columns[i - 1].name
            const fk = this.foreignKeys?.[columnName]
            const rfk = this.reverseForeignKeys?.[columnName]
            if (fk === undefined && rfk === undefined) {
                return null
            }

            const buttonsEndX = start + width - FOREIGN_KEY_OFFSET_RIGHT
            const fkButtonX = fk ? buttonsEndX - FOREIGN_KEY_WIDTH : -1
            const rfkButtonX = rfk
                ? fk
                    ? fkButtonX - FOREIGN_KEY_WIDTH
                    : buttonsEndX - FOREIGN_KEY_WIDTH
                : -1

            if (fk && localX >= fkButtonX && localX < fkButtonX + FOREIGN_KEY_WIDTH) {
                return {
                    cell: { row, col: i - 1 },
                    fk,
                    area: {
                        x: rect.left + fkButtonX - scrollLeft,
                        y: rect.top + buttonY - this.container.scrollTop,
                        width: FOREIGN_KEY_WIDTH,
                        height: FOREIGN_KEY_HEIGHT
                    },
                    type: ForeignKeyType.Forward
                }
            }
            if (rfk && localX >= rfkButtonX && localX < rfkButtonX + FOREIGN_KEY_WIDTH) {
                return {
                    cell: { row, col: i - 1 },
                    fk: rfk,
                    area: {
                        x: rect.left + rfkButtonX - scrollLeft,
                        y: rect.top + buttonY - this.container.scrollTop,
                        width: FOREIGN_KEY_WIDTH,
                        height: FOREIGN_KEY_HEIGHT
                    },
                    type: ForeignKeyType.Reverse
                }
            }
            break
        }

        return null
    }

    private scrollToCell(cell: Cell, animated: boolean) {
        const rect = this.container.getBoundingClientRect()
        const actualCol = cell.col + 1
        const { width: cellWidth, start: cellLeft } = this.columnsRange[actualCol]
        const cellTop = cell.row * ROW_HEIGHT

        const scrollLeft = this.container.scrollLeft
        const scrollTop = this.container.scrollTop

        let newScrollLeft = scrollLeft
        let newScrollTop = scrollTop

        if (cellLeft < scrollLeft) {
            newScrollLeft = cellLeft
        } else if (cellLeft + cellWidth > scrollLeft + rect.width) {
            if (cellWidth >= rect.width) {
                newScrollLeft = cellLeft
            } else {
                newScrollLeft = cellLeft + cellWidth - rect.width
            }
        }
        if (cellTop < scrollTop) {
            newScrollTop = cellTop
        } else if (cellTop + ROW_HEIGHT > scrollTop + rect.height) {
            newScrollTop = cellTop + ROW_HEIGHT - rect.height
        }

        if (newScrollLeft !== scrollLeft || newScrollTop !== scrollTop) {
            this.container.scrollTo({
                left: newScrollLeft,
                top: newScrollTop,
                behavior: animated ? 'smooth' : 'instant'
            })
        }
    }

    private handleScrollbarPointerDown(rect: DOMRect, x: number, y: number, e: PointerEvent): boolean {
        const totalHeight = this.query.rows.length * ROW_HEIGHT + this.reserveSizeY
        const totalColumnsWidth = this.totalColumnsWidth + RESERVE_SIZE_X

        const showVerticalScrollbar = totalHeight > rect.height
        const showHorizontalScrollbar = totalColumnsWidth > rect.width

        if (showVerticalScrollbar) {
            const scrollbarX = rect.width - SCROLLBAR_SIZE
            if (x + SCROLLBAR_RESERVE >= scrollbarX && x <= rect.width) {
                const scrollbarHeight = rect.height - (showHorizontalScrollbar ? SCROLLBAR_SIZE : 0)
                if (y >= 0 && y <= scrollbarHeight) {
                    const maxScrollTop = totalHeight - rect.height
                    const indicatorHeight = Math.max(
                        MIN_INDICATOR_SIZE,
                        (rect.height / totalHeight) * scrollbarHeight
                    )
                    const maxIndicatorY = scrollbarHeight - indicatorHeight
                    const scrollRatio =
                        maxScrollTop > 0 ? Math.min(1, this.container.scrollTop / maxScrollTop) : 0
                    const currentIndicatorY = scrollRatio * maxIndicatorY

                    const isClickOnIndicator =
                        y >= currentIndicatorY && y <= currentIndicatorY + indicatorHeight

                    if (isClickOnIndicator) {
                        this.dragState = {
                            direction: Direction.Vertical,
                            offset: indicatorHeight / 2,
                            startScroll: this.container.scrollTop
                        }
                    } else {
                        const targetIndicatorY = Math.max(0, Math.min(maxIndicatorY, y - indicatorHeight / 2))
                        const ratio = maxIndicatorY > 0 ? targetIndicatorY / maxIndicatorY : 0
                        this.container.scrollTop = ratio * maxScrollTop

                        this.dragState = {
                            direction: Direction.Vertical,
                            offset: indicatorHeight / 2,
                            startScroll: this.container.scrollTop
                        }
                    }

                    this.startScrollbarDrag(Direction.Vertical, e.pointerId)
                    return true
                }
            }
        }

        if (showHorizontalScrollbar) {
            const scrollbarY = rect.height - SCROLLBAR_SIZE
            if (y + SCROLLBAR_RESERVE >= scrollbarY && y <= rect.height) {
                const scrollbarWidth = rect.width - (showVerticalScrollbar ? SCROLLBAR_SIZE : 0)
                if (x >= 0 && x <= scrollbarWidth) {
                    const maxScrollLeft = totalColumnsWidth - rect.width
                    const indicatorWidth = Math.max(
                        MIN_INDICATOR_SIZE,
                        (rect.width / totalColumnsWidth) * scrollbarWidth
                    )
                    const maxIndicatorX = scrollbarWidth - indicatorWidth
                    const scrollRatio =
                        maxScrollLeft > 0 ? Math.min(1, this.container.scrollLeft / maxScrollLeft) : 0
                    const currentIndicatorX = scrollRatio * maxIndicatorX

                    const isClickOnIndicator =
                        x >= currentIndicatorX && x <= currentIndicatorX + indicatorWidth

                    if (isClickOnIndicator) {
                        this.dragState = {
                            direction: Direction.Horizontal,
                            offset: indicatorWidth / 2,
                            startScroll: this.container.scrollLeft
                        }
                    } else {
                        const targetIndicatorX = Math.max(0, Math.min(maxIndicatorX, x - indicatorWidth / 2))
                        const ratio = maxIndicatorX > 0 ? targetIndicatorX / maxIndicatorX : 0
                        this.container.scrollLeft = ratio * maxScrollLeft

                        this.dragState = {
                            direction: Direction.Horizontal,
                            offset: indicatorWidth / 2,
                            startScroll: this.container.scrollLeft
                        }
                    }

                    this.startScrollbarDrag(Direction.Horizontal, e.pointerId)
                    return true
                }
            }
        }

        return false
    }

    private startScrollbarDrag(direction: Direction, pointerId: number) {
        this.scrollbarHighlight = direction
        this.draw()

        this.canvas.setPointerCapture(pointerId)
        const rect = this.container.getBoundingClientRect()
        const totalHeight = this.query.rows.length * ROW_HEIGHT + this.reserveSizeY
        const totalColumnsWidth = this.totalColumnsWidth + RESERVE_SIZE_X

        const handlePointerMove = (e: PointerEvent) => {
            if (!this.dragState) {
                return
            }
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top

            switch (direction) {
                case Direction.Vertical: {
                    const showHorizontalScrollbar = totalColumnsWidth > rect.width
                    const scrollbarHeight = rect.height - (showHorizontalScrollbar ? SCROLLBAR_SIZE : 0)
                    const indicatorHeight = Math.max(
                        MIN_INDICATOR_SIZE,
                        (rect.height / totalHeight) * scrollbarHeight
                    )
                    const maxIndicatorY = scrollbarHeight - indicatorHeight

                    const targetIndicatorY = y - this.dragState.offset
                    const clampedIndicatorY = Math.max(0, Math.min(maxIndicatorY, targetIndicatorY))
                    const ratio = maxIndicatorY > 0 ? clampedIndicatorY / maxIndicatorY : 0

                    const maxScrollTop = totalHeight - rect.height
                    this.container.scrollTop = ratio * maxScrollTop
                    break
                }
                case Direction.Horizontal: {
                    const showVerticalScrollbar = totalHeight > rect.height
                    const scrollbarWidth = rect.width - (showVerticalScrollbar ? SCROLLBAR_SIZE : 0)
                    const indicatorWidth = Math.max(
                        MIN_INDICATOR_SIZE,
                        (rect.width / totalColumnsWidth) * scrollbarWidth
                    )
                    const maxIndicatorX = scrollbarWidth - indicatorWidth

                    const targetIndicatorX = x - this.dragState.offset
                    const clampedIndicatorX = Math.max(0, Math.min(maxIndicatorX, targetIndicatorX))
                    const ratio = maxIndicatorX > 0 ? clampedIndicatorX / maxIndicatorX : 0

                    const maxScrollLeft = totalColumnsWidth - rect.width
                    this.container.scrollLeft = ratio * maxScrollLeft
                    break
                }
            }
        }

        const handlePointerUp = () => {
            this.dragState = null
            this.canvas.releasePointerCapture(pointerId)
            this.canvas.removeEventListener('pointermove', handlePointerMove)
        }

        this.canvas.addEventListener('pointermove', handlePointerMove, { passive: true })
        this.canvas.addEventListener('pointerup', handlePointerUp, { once: true })
    }

    private handleScroll() {
        this.draw()
        this.onScrollHorizontal?.(this.container.scrollLeft)
        this.onCellPositionChange?.()
    }

    private handleMouseEnter() {
        if (this.hideScrollbarTimer !== undefined) {
            clearTimeout(this.hideScrollbarTimer)
            this.hideScrollbarTimer = undefined
        }
        this.isMouseOverContainer = true
        this.draw()
    }

    private handleMouseLeave() {
        if (this.hoveredForeignKey !== null) {
            this.hoveredForeignKey = null
            this.draw()
        }
        this.isMouseOverContainer = false
        this.hideScrollbarTimer = setTimeout(() => {
            this.hideScrollbarTimer = undefined
            this.draw()
        }, 300)
    }

    private metaKey(e: MouseEvent | KeyboardEvent | PointerEvent) {
        return isMacOS ? e.metaKey : e.ctrlKey
    }

    private handlePointerDown(e: PointerEvent) {
        if (e.button !== 0) {
            return
        }

        if (this.onForeignKeyClick) {
            const button = this.getForeignKeyFromPoint(e.clientX, e.clientY)
            if (button) {
                e.stopPropagation()
                e.preventDefault()
                this.focusedCell = button.cell
                this.draw()
                this.onForeignKeyClick(button.cell, button.area, button.fk)
                return
            }
        }

        const rect = this.container.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        if (this.handleScrollbarPointerDown(rect, x, y, e)) {
            return
        }

        const position = this.getCellFromPoint(e.clientX, e.clientY)
        if (!position) {
            return
        }

        if (position.col === -1) {
            this.lastSelectedIndex = position.row
            if (this.selectedRows.size !== 1 || !this.selectedRows.has(position.row)) {
                this.selectedRows = new Set([position.row])
                this.draw()
            }
            this.onRowView?.(position.row)
            return
        }

        if (e.shiftKey) {
            if (this.lastSelectedIndex === null) {
                return
            }
            const start = Math.min(this.lastSelectedIndex, position.row)
            const end = Math.max(this.lastSelectedIndex, position.row)
            this.selectedRows.clear()
            for (let i = start; i <= end; i++) {
                this.selectedRows.add(i)
            }
        } else if (this.metaKey(e)) {
            if (this.selectedRows.has(position.row)) {
                this.selectedRows.delete(position.row)
            } else {
                this.selectedRows.add(position.row)
                this.lastSelectedIndex = position.row
            }
        } else {
            this.lastSelectedIndex = position.row
            this.selectedRows = new Set([position.row])
        }

        this.focusedCell = position
        this.draw()
    }

    private handleMouseMove(e: MouseEvent) {
        const scrollbarDirection = this.isMouseInScrollbarArea(e.clientX, e.clientY)
        if (scrollbarDirection !== this.scrollbarHighlight) {
            this.scrollbarHighlight = scrollbarDirection
            this.draw()
        }

        const fk = this.getForeignKeyFromPoint(e.clientX, e.clientY)

        if (fk === null) {
            if (this.hoveredForeignKey !== null) {
                this.hoveredForeignKey = null
                this.draw()
            }
            return
        }

        if (!this.hoveredForeignKeyEq(fk.cell.row, fk.cell.col, fk.type)) {
            this.hoveredForeignKey = { ...fk.cell, type: fk.type }
            this.draw()
        }
    }

    private handleCellDblClick(e: MouseEvent) {
        const cell = this.getCellFromPoint(e.clientX, e.clientY)
        if (!cell || cell.col === -1) {
            return
        }
        this.onCellView?.(cell)
    }

    private handleContextMenu(e: MouseEvent) {
        e.stopPropagation()
        e.preventDefault()
        const cell = this.getCellFromPoint(e.clientX, e.clientY)
        if (!cell || cell.col === -1) {
            return
        }
        this.focusedCell = cell
        if (!this.selectedRows.has(cell.row)) {
            this.lastSelectedIndex = cell.row
            this.selectedRows = new Set([cell.row])
        }
        this.onContextMenu?.(cell)
        this.draw()
    }

    private handleKeyDown(e: KeyboardEvent) {
        switch (e.key.toLowerCase()) {
            case 'a':
                return this.handleSelectAllRows(e)
            case 'c':
                return this.handleCellCopy(e)
            case 'e':
                return this.handleExpandColumn(e)
            case 'backspace':
                return this.handleDeleteRows(e)
            case 'escape':
                return this.handleCancelSelectedRows(e)
            case 'enter':
                return this.handleEnter(e)
            case 'tab':
                return this.handleTab(e)
            case 'arrowleft':
                return this.handleLeft(e)
            case 'arrowright':
                return this.handleRight(e)
            case 'arrowup':
                return this.handleUp(e)
            case 'arrowdown':
                return this.handleDown(e)
        }
    }

    private handleSelectAllRows(e: KeyboardEvent) {
        if (this.metaKey(e)) {
            e.stopPropagation()
            e.preventDefault()
            const iter = Array.from({ length: this.query.rows.length }, (_, i) => i)
            this.selectedRows = new Set(iter)
            this.draw()
        }
    }

    private handleCellCopy(e: KeyboardEvent) {
        if (this.metaKey(e)) {
            if (e.shiftKey && this.selectedRows.size > 0) {
                e.stopPropagation()
                e.preventDefault()
                this.onRowsCopy?.()
            } else if (this.focusedCell) {
                e.stopPropagation()
                e.preventDefault()
                this.onCellCopy?.(this.focusedCell)
            }
        }
    }

    private handleDeleteRows(e: KeyboardEvent) {
        if (this.onRowsDelete && this.selectedRows.size > 0) {
            e.stopPropagation()
            e.preventDefault()
            this.onRowsDelete()
        }
    }

    private handleCancelSelectedRows(e: KeyboardEvent) {
        e.stopPropagation()
        e.preventDefault()
        this.lastSelectedIndex = null
        if (this.selectedRows.size !== 0) {
            this.selectedRows.clear()
            this.draw()
        }
    }

    private handleEnter(e: KeyboardEvent) {
        if (!this.focusedCell) {
            return
        }
        e.stopPropagation()
        e.preventDefault()
        if (e.shiftKey) {
            this.onRowView?.(this.focusedCell.row)
        } else {
            this.onCellView?.(this.focusedCell)
        }
    }

    private handleLeft(e: KeyboardEvent) {
        if (
            !this.focusedCell ||
            this.metaKey(e) ||
            this.query.rows.length === 0 ||
            this.query.columns.length === 0
        ) {
            return
        }
        e.stopPropagation()
        e.preventDefault()
        const newCol = this.focusedCell.col - 1
        if (newCol < 0) {
            this.container.scrollLeft = 0
            return
        }
        this.focusedCell.col = newCol
        this.scrollToCell(this.focusedCell, false)
        this.draw()
    }

    private handleRight(e: KeyboardEvent) {
        if (
            !this.focusedCell ||
            this.metaKey(e) ||
            this.query.rows.length === 0 ||
            this.query.columns.length === 0
        ) {
            return
        }
        e.stopPropagation()
        e.preventDefault()
        const newCol = this.focusedCell.col + 1
        const maxCol = this.columnsRange.length - 2
        if (newCol > maxCol) {
            this.container.scrollLeft = this.container.scrollWidth - this.container.clientWidth
            return
        }
        this.focusedCell.col = newCol
        this.scrollToCell(this.focusedCell, false)
        this.draw()
    }

    private handleUp(e: KeyboardEvent) {
        if (this.query.rows.length === 0 || this.query.columns.length === 0) {
            return
        }
        e.stopPropagation()
        e.preventDefault()
        this.focusedCell ??= { row: 0, col: 0 }
        if (this.metaKey(e)) {
            this.focusedCell.row = 0
            this.lastSelectedIndex = 0
            this.selectedRows = new Set([0])
            this.scrollToCell(this.focusedCell, false)
            this.draw()
            return
        }
        const newRow = this.focusedCell.row - 1
        if (newRow < 0) {
            return
        }
        this.focusedCell.row = newRow
        if (e.shiftKey && this.lastSelectedIndex !== null) {
            const start = Math.min(this.lastSelectedIndex, newRow)
            const end = Math.max(this.lastSelectedIndex, newRow)
            this.selectedRows.clear()
            for (let i = start; i <= end; i++) {
                this.selectedRows.add(i)
            }
        } else {
            this.lastSelectedIndex = newRow
            this.selectedRows = new Set([newRow])
        }
        this.scrollToCell(this.focusedCell, false)
        this.draw()
    }

    private handleDown(e: KeyboardEvent) {
        if (this.query.rows.length === 0 || this.query.columns.length === 0) {
            return
        }
        e.stopPropagation()
        e.preventDefault()
        this.focusedCell ??= { row: -1, col: 0 }
        if (this.metaKey(e)) {
            const newRow = this.query.rows.length - 1
            this.focusedCell.row = newRow
            this.lastSelectedIndex = newRow
            this.selectedRows = new Set([newRow])
            this.scrollToCell(this.focusedCell, false)
            this.draw()
            return
        }
        const newRow = this.focusedCell.row + 1
        if (newRow < this.query.rows.length) {
            this.focusedCell.row = newRow
            if (e.shiftKey && this.lastSelectedIndex !== null) {
                const start = Math.min(this.lastSelectedIndex, newRow)
                const end = Math.max(this.lastSelectedIndex, newRow)
                this.selectedRows.clear()
                for (let i = start; i <= end; i++) {
                    this.selectedRows.add(i)
                }
            } else {
                this.lastSelectedIndex = newRow
                this.selectedRows = new Set([newRow])
            }
            this.scrollToCell(this.focusedCell, false)
            this.draw()
        } else {
            this.container.scrollTop = this.container.scrollHeight - this.container.clientHeight
        }
    }

    private handleTab(e: KeyboardEvent) {
        if (this.query.rows.length === 0 || this.query.columns.length === 0) {
            return
        }
        e.stopPropagation()
        e.preventDefault()

        const totalCols = this.columnsRange.length - 1
        const minCol = 0
        const maxCol = this.columnsRange.length - 2

        if (!this.focusedCell) {
            if (e.shiftKey) {
                this.focusedCell = { row: this.query.rows.length - 1, col: maxCol }
            } else {
                this.focusedCell = { row: 0, col: minCol }
            }
            this.scrollToCell(this.focusedCell, true)
            this.draw()
            return
        }

        const { row, col } = this.focusedCell
        const totalCells = this.query.rows.length * totalCols
        const currentIndex = row * totalCols + (col - minCol)
        let newIndex
        if (e.shiftKey) {
            newIndex = (currentIndex - 1 + totalCells) % totalCells
        } else {
            newIndex = (currentIndex + 1) % totalCells
        }
        const newPosition = {
            row: Math.floor(newIndex / totalCols),
            col: (newIndex % totalCols) + minCol
        }
        this.focusedCell = newPosition
        this.scrollToCell(newPosition, true)
        this.draw()
    }

    private handleExpandColumn(e: KeyboardEvent) {
        if (!this.focusedCell || !this.onChangeColumnSizes || !this.metaKey(e)) {
            return
        }
        e.stopPropagation()
        e.preventDefault()

        const name = this.query.columns[this.focusedCell.col].name

        if (e.shiftKey) {
            this.onChangeColumnSizes({
                ...this.columnSizes.changed,
                [name]: MIN_COLUMN_WIDTH
            })
            return
        }

        this.onChangeColumnSizes({
            ...this.columnSizes.changed,
            [name]: this.getColumnContentSize(this.focusedCell.col)
        })
    }
}
