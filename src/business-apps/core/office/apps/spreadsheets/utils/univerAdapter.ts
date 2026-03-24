/**
 * Univer Data Adapter
 *
 * Converts between our spreadsheet format (SpreadsheetSheet, columns, rows)
 * and Univer's workbook/sheet/cell model for initial load and callbacks.
 */

import type { SpreadsheetSheet, SpreadsheetColumn } from '../types/spreadsheet'

/** Conversion context for mapping row/column indices to our rowId/columnId/name (used by collaboration and persist). */
export interface ConversionContext {
  columnIdToIndex: Map<string, number>
  columnIndexToId: Map<number, string>
  columnIndexToName: Map<number, string>
  rowIdToIndex: Map<string, number>
  rowIndexToId: Map<number, string>
  excelColToIndex: Map<string, number>
  indexToExcelCol: Map<number, string>
}

function indexToExcelColumn(index: number): string {
  let col = ''
  let num = index + 1
  while (num > 0) {
    const remainder = (num - 1) % 26
    col = String.fromCharCode(65 + remainder) + col
    num = Math.floor((num - 1) / 26)
  }
  return col
}

/** Univer cell data (minimal shape for value) */
export interface UniverCellData {
  v?: string | number | boolean | null
  f?: string
  s?: unknown
  t?: number
  [key: string]: unknown
}

/** Univer sheet cellData: row index -> col index -> cell */
export type UniverSheetCellData = Record<number, Record<number, UniverCellData>>

/** Univer worksheet snapshot */
export interface UniverWorksheetData {
  id: string
  name: string
  cellData: UniverSheetCellData
  rowCount?: number
  columnCount?: number
  defaultColumnWidth?: number
  defaultRowHeight?: number
  columnData?: Record<number, { w?: number }>
  rowData?: Record<number, { h?: number }>
  rowHeader?: { width?: number; hidden?: number }
  columnHeader?: { height?: number; hidden?: number }
}

/** Univer workbook snapshot for createWorkbook() */
export interface UniverWorkbookSnapshot {
  id: string
  name: string
  sheetOrder: string[]
  appVersion?: string
  locale?: string
  sheets: Record<string, UniverWorksheetData>
}

/**
 * Get cell value from our row/column format
 */
function getCellValue(row: Record<string, unknown>, column: SpreadsheetColumn): unknown {
  let value = row[column.name] ?? row[column.id]
  if (value === undefined) {
    const rowKeys = Object.keys(row)
    const matchingKey = rowKeys.find(
      key => key.toLowerCase() === column.name.toLowerCase() || key.toLowerCase() === column.id.toLowerCase()
    )
    if (matchingKey) value = row[matchingKey]
  }
  if (value && typeof value === 'object') {
    if (Array.isArray(value)) return value
    const cellObject = value as Record<string, unknown>
    if ('v' in cellObject || 'f' in cellObject || 'm' in cellObject || 'ct' in cellObject) {
      return cellObject
    }
    return ''
  }
  return value
}

function hexToRgb(hex: string, fallback: string): string {
  const cleaned = hex.replaceAll('#', '')
  if (cleaned.length === 6 || cleaned.length === 8) return `#${cleaned}`
  return fallback
}

/** Map our parsed style (from Excel import) to Univer inline style */
function toUniverInlineStyle(obj: Record<string, unknown>): Record<string, unknown> | undefined {
  const style: Record<string, unknown> = {}
  if (obj.bg && typeof obj.bg === 'string') {
    style.bg = { rgb: hexToRgb(obj.bg, obj.bg) }
  }
  if (obj.fc && typeof obj.fc === 'string') {
    style.cl = { rgb: hexToRgb(obj.fc, obj.fc) }
  }
  if (obj.bl) style.bl = 1
  if (obj.it) style.it = 1
  if (obj.ff && typeof obj.ff === 'string') style.ff = obj.ff
  if (typeof obj.fs === 'number') style.fs = obj.fs
  if (typeof obj.ht === 'number') style.ht = obj.ht + 1
  if (typeof obj.vt === 'number') style.vt = obj.vt + 1
  if (obj.tb === 2) style.tb = 2
  if (Object.keys(style).length === 0) return undefined
  return style
}

function normalizeColumnToken(value: string): string {
  return value.toLowerCase()
}

function isAvatarColumn(column: SpreadsheetColumn): boolean {
  const normalizedName = normalizeColumnToken(String(column.name || ''))
  const normalizedId = normalizeColumnToken(String(column.id || ''))
  return (
    normalizedName === '_recipient_avatar' ||
    normalizedId === '_recipient_avatar' ||
    normalizedName === 'recipient_avatar' ||
    normalizedId === 'recipient_avatar'
  )
}

function getInitials(value: string): string {
  const normalized = value.trim()
  if (!normalized) return 'U'
  const parts = normalized.split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

function buildAvatarPlaceholderUrl(row: Record<string, unknown>): string | null {
  const fromName = row._recipient_name ?? row.recipient_name
  const fromEmail = row._recipient_email ?? row.recipient_email
  const base =
    (typeof fromName === 'string' && fromName.trim()) || (typeof fromEmail === 'string' && fromEmail.trim()) || ''
  if (!base) return null
  const initials = getInitials(base)
  const params = new URLSearchParams({
    name: initials,
    size: '64',
    rounded: 'true',
    background: 'E5E7EB',
    color: '374151',
    format: 'png'
  })
  return `https://ui-avatars.com/api/?${params.toString()}`
}

function isLinkColumn(column: SpreadsheetColumn): boolean {
  const normalizedName = normalizeColumnToken(String(column.name || ''))
  const normalizedId = normalizeColumnToken(String(column.id || ''))
  return (
    normalizedName === '_copy_link' ||
    normalizedId === '_copy_link' ||
    normalizedName === 'copy_link' ||
    normalizedId === 'copy_link'
  )
}

function extractObjectValue(obj: Record<string, unknown>): string {
  if (typeof obj.v === 'string') return obj.v
  if (typeof obj.m === 'string') return obj.m
  if (typeof obj.url === 'string') return obj.url
  if (typeof obj.src === 'string') return obj.src
  return ''
}

function toFormulaCell(obj: Record<string, unknown>): UniverCellData | null {
  const cell: UniverCellData = {}
  if (obj.f && typeof obj.f === 'string') cell.f = obj.f.startsWith('=') ? obj.f : `=${obj.f}`
  const val = obj.v ?? obj.m
  if (val !== undefined && val !== null) cell.v = val
  else if (obj.m !== undefined) cell.v = obj.m
  const univerStyle = toUniverInlineStyle(obj)
  if (univerStyle) cell.s = univerStyle
  return Object.keys(cell).length > 0 ? cell : null
}

function toImageUrl(raw: string): string {
  const trimmed = raw.trim()
  const isHttpImage = /^https?:\/\//i.test(trimmed)
  const isDataImage = /^data:image\/[a-z0-9.+-]+;base64,/i.test(trimmed)
  const looksLikeRawBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(trimmed) && trimmed.length > 100
  if (isHttpImage || isDataImage) return trimmed
  if (looksLikeRawBase64) return `data:image/jpeg;base64,${trimmed}`
  return ''
}

type ObjectRawResolution = { type: 'cell'; cell: UniverCellData } | { type: 'raw'; raw: unknown }

function isMediaOrLinkColumn(column: SpreadsheetColumn, avatarColumn: boolean, linkColumn: boolean): boolean {
  return column.type === 'image' || avatarColumn || column.type === 'url' || linkColumn
}

function resolveObjectRaw(
  raw: unknown,
  column: SpreadsheetColumn,
  avatarColumn: boolean,
  linkColumn: boolean
): ObjectRawResolution {
  if (Array.isArray(raw)) {
    return { type: 'cell', cell: { v: raw } }
  }

  const obj = raw as Record<string, unknown>
  const objectValue = extractObjectValue(obj)
  if (isMediaOrLinkColumn(column, avatarColumn, linkColumn) && objectValue) {
    return { type: 'raw', raw: objectValue }
  }

  return { type: 'cell', cell: toFormulaCell(obj) ?? (obj as UniverCellData) }
}

function toHyperlinkCell(raw: string, column: SpreadsheetColumn, linkColumn: boolean): UniverCellData | null {
  if (column.type !== 'url' && !linkColumn) {
    return null
  }
  if (!/^https?:\/\//i.test(raw)) {
    return null
  }
  const safeUrl = raw.replaceAll('"', '""')
  return { f: `=HYPERLINK("${safeUrl}","View Response")` }
}

function toImageCell(raw: string, column: SpreadsheetColumn, avatarColumn: boolean): UniverCellData | null {
  if (column.type !== 'image' && !avatarColumn) {
    return null
  }

  const imageUrl = toImageUrl(raw)
  if (!imageUrl) {
    return null
  }

  const safeUrl = imageUrl.replaceAll('"', '""')
  if (avatarColumn) {
    return { f: `=IMAGE("${safeUrl}", "", 3, 32, 32)` }
  }
  return { f: `=IMAGE("${safeUrl}")` }
}

function toUniverCellData(raw: unknown, column: SpreadsheetColumn): UniverCellData | null {
  if (raw === undefined || raw === null || raw === '') return null
  const avatarColumn = isAvatarColumn(column)
  const linkColumn = isLinkColumn(column)

  if (typeof raw === 'object') {
    const resolved = resolveObjectRaw(raw, column, avatarColumn, linkColumn)
    if (resolved.type === 'cell') {
      return resolved.cell
    }
    raw = resolved.raw
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    const hyperlinkCell = toHyperlinkCell(trimmed, column, linkColumn)
    if (hyperlinkCell) {
      return hyperlinkCell
    }

    const imageCell = toImageCell(trimmed, column, avatarColumn)
    if (imageCell) {
      return imageCell
    }
  }

  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
    return { v: raw }
  }
  return null
}

const DEFAULT_MIN_ROWS = 1000
const UNIVER_DEFAULT_COL_WIDTH = 73
const UNIVER_DEFAULT_ROW_HEIGHT = 23
const UNIVER_ROW_HEADER_WIDTH = 46
const UNIVER_COLUMN_HEADER_HEIGHT = 20
const AVATAR_COL_WIDTH = 40
const TRACKING_HEADER_WRAP_STYLE = { tb: 2, bl: 1 }

function buildRowCells(
  row: Record<string, unknown>,
  visibleColumns: SpreadsheetColumn[]
): Record<number, UniverCellData> {
  const rowCells: Record<number, UniverCellData> = {}
  const isTrackingHeaderRow = row._isTrackingHeader === true
  for (let colIndex = 0; colIndex < visibleColumns.length; colIndex++) {
    const col = visibleColumns[colIndex]
    const raw = getCellValue(row, col)
    let cell = toUniverCellData(raw, col)
    if (!cell && isAvatarColumn(col)) {
      const placeholderUrl = buildAvatarPlaceholderUrl(row)
      if (placeholderUrl) {
        cell = toUniverCellData(placeholderUrl, col)
      }
    }
    if (!cell) continue
    if (isTrackingHeaderRow) {
      const existingStyle =
        cell.s && typeof cell.s === 'object' ? (cell.s as Record<string, unknown>) : ({} as Record<string, unknown>)
      cell.s = { ...existingStyle, ...TRACKING_HEADER_WRAP_STYLE }
    }
    rowCells[colIndex] = cell
  }
  return rowCells
}

function buildCellData(data: Record<string, unknown>[], visibleColumns: SpreadsheetColumn[]): UniverSheetCellData {
  const cellData: UniverSheetCellData = {}
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const rowCells = buildRowCells(data[rowIndex], visibleColumns)
    if (Object.keys(rowCells).length > 0) cellData[rowIndex] = rowCells
  }
  return cellData
}

function buildColumnWidths(visibleColumns: SpreadsheetColumn[]): Record<number, { w?: number }> {
  const columnData: Record<number, { w?: number }> = {}
  for (let idx = 0; idx < visibleColumns.length; idx++) {
    const col = visibleColumns[idx]
    let w: number
    if (typeof col.width === 'number' && col.width > 0) w = col.width
    else if (isAvatarColumn(col)) w = AVATAR_COL_WIDTH
    else w = UNIVER_DEFAULT_COL_WIDTH
    columnData[idx] = { w }
  }
  return columnData
}

function buildRowHeights(data: Record<string, unknown>[]): Record<number, { h?: number }> {
  const rowData: Record<number, { h?: number }> = {}
  for (let idx = 0; idx < data.length; idx++) {
    const h = data[idx]._height
    if (typeof h === 'number' && h > 0) rowData[idx] = { h }
  }
  return rowData
}

/**
 * Build Univer workbook snapshot from sheet, data, and columns.
 * Used to initialize Univer with our current sheet data.
 */
export function buildWorkbookSnapshot(
  sheet: SpreadsheetSheet,
  data: Record<string, unknown>[],
  columns: SpreadsheetColumn[]
): UniverWorkbookSnapshot {
  const visibleColumns = columns.filter(c => c.isVisible !== false)
  const cellData = buildCellData(data, visibleColumns)
  const columnData = buildColumnWidths(visibleColumns)
  const rowData = buildRowHeights(data)

  const worksheet: UniverWorksheetData = {
    id: sheet.id,
    name: sheet.name,
    cellData,
    rowCount: Math.max(data.length, DEFAULT_MIN_ROWS),
    columnCount: Math.max(visibleColumns.length, 1),
    defaultColumnWidth: UNIVER_DEFAULT_COL_WIDTH,
    defaultRowHeight: UNIVER_DEFAULT_ROW_HEIGHT,
    columnData: Object.keys(columnData).length > 0 ? columnData : undefined,
    rowData: Object.keys(rowData).length > 0 ? rowData : undefined,
    rowHeader: { width: UNIVER_ROW_HEADER_WIDTH },
    columnHeader: { height: UNIVER_COLUMN_HEADER_HEIGHT }
  }

  return {
    id: `workbook-${sheet.id}`,
    name: sheet.name,
    sheetOrder: [sheet.id],
    appVersion: '0.15.0',
    locale: 'en-US',
    sheets: {
      [sheet.id]: worksheet
    }
  }
}

/** Regex to match old 1-arg IMAGE formula for upgrade to sized version (allows optional spaces) */
const OLD_IMAGE_FORMULA = /^=IMAGE\s*\(\s*"((?:[^"]|"")*)"\s*\)$/

function upgradeImageFormula(cell: UniverCellData): void {
  const formula = cell.f
  if (typeof formula !== 'string') return
  const m = formula.match(OLD_IMAGE_FORMULA)
  if (m) {
    const url = m[1].replaceAll('""', '"')
    cell.f = `=IMAGE("${url.replaceAll('"', '""')}", "", 3, 32, 32)`
  }
}

function processAvatarCellsInRow(rowCells: Record<number, UniverCellData>, avatarColIndices: Set<number>): void {
  for (const colIdx of avatarColIndices) {
    const cell = rowCells[colIdx]
    if (cell?.f && typeof cell.f === 'string') upgradeImageFormula(cell)
  }
}

function processAvatarColumnConfig(sheetData: UniverWorksheetData, avatarColIndices: Set<number>): void {
  const columnData = sheetData.columnData
  if (columnData !== undefined && typeof columnData === 'object') {
    for (const colIdx of avatarColIndices) {
      const colConfig = columnData[colIdx]
      if (colConfig && typeof colConfig === 'object') colConfig.w = AVATAR_COL_WIDTH
      else columnData[colIdx] = { w: AVATAR_COL_WIDTH }
    }
  }
}

/**
 * Transform a loaded Univer snapshot to use small avatar images.
 * - Upgrades =IMAGE("url") to =IMAGE("url", "", 3, 32, 32) in avatar columns
 * - Ensures avatar column width is 40px
 * Call this before passing a bootstrap snapshot to Univer.
 */
export function transformAvatarFormulasInSnapshot(
  snapshot: Record<string, unknown>,
  columns: SpreadsheetColumn[]
): void {
  const sheets = snapshot?.sheets as Record<string, UniverWorksheetData> | undefined
  if (sheets === undefined) return

  const visibleColumns = columns.filter(c => c.isVisible !== false)
  const avatarColIndices = new Set(
    visibleColumns.map((col, idx) => (isAvatarColumn(col) ? idx : -1)).filter(i => i >= 0)
  )
  if (avatarColIndices.size === 0) return

  for (const sheetData of Object.values(sheets)) {
    const cellData = sheetData?.cellData
    if (cellData !== undefined) {
      for (const rowCells of Object.values(cellData) as Record<number, UniverCellData>[]) {
        if (typeof rowCells === 'object') processAvatarCellsInRow(rowCells, avatarColIndices)
      }
    }
    processAvatarColumnConfig(sheetData, avatarColIndices)
  }
}

/**
 * Create conversion context for mapping row/column indices to our rowId/columnId.
 * Used by UniverSheetGrid and collaboration for applyRemoteCellUpdate and operation mapping.
 */
export function createUniverConversionContext(
  columns: SpreadsheetColumn[],
  data: Record<string, unknown>[]
): ConversionContext {
  const visibleColumns = columns.filter(col => col.isVisible !== false)
  const columnIdToIndex = new Map<string, number>()
  const columnIndexToId = new Map<number, string>()
  const columnIndexToName = new Map<number, string>()
  const rowIdToIndex = new Map<string, number>()
  const rowIndexToId = new Map<number, string>()
  const excelColToIndex = new Map<string, number>()
  const indexToExcelCol = new Map<number, string>()
  visibleColumns.forEach((col, index) => {
    columnIdToIndex.set(col.id, index)
    columnIndexToId.set(index, col.id)
    columnIndexToName.set(index, col.name)
    const excelCol = indexToExcelColumn(index)
    excelColToIndex.set(excelCol, index)
    indexToExcelCol.set(index, excelCol)
  })
  data.forEach((row, index) => {
    const rowId = typeof row._id === 'string' ? row._id : `row_${index}`
    rowIdToIndex.set(rowId, index)
    rowIndexToId.set(index, rowId)
  })
  return {
    columnIdToIndex,
    columnIndexToId,
    columnIndexToName,
    rowIdToIndex,
    rowIndexToId,
    excelColToIndex,
    indexToExcelCol
  }
}

/**
 * Extract URL from =HYPERLINK("url","text") formula.
 */
export function extractUrlFromHyperlinkFormula(formula: string): string | null {
  if (!formula || typeof formula !== 'string') return null
  const trimmed = formula.trim()
  const match = trimmed.match(/^=?\s*HYPERLINK\s*\(\s*"((?:[^"\\]|\\.)*)"\s*,/i)
  if (!match) return null
  const url = match[1].replace(/\\"/g, '"').trim()
  return /^https?:\/\//i.test(url) ? url : null
}

/**
 * Returns the URL for the cell at (row, col) if it is the link column and contains a valid URL.
 * Tries data first, then parses HYPERLINK formula from cell if provided.
 */
export function getHyperlinkUrlFromSelection(
  row: number,
  col: number,
  data: Record<string, unknown>[],
  columns: SpreadsheetColumn[],
  cellFormula?: string | null
): string | null {
  const visibleColumns = columns.filter(c => c.isVisible !== false)
  if (col < 0 || col >= visibleColumns.length || row < 0) return null
  const column = visibleColumns[col]
  if (row < data.length && isLinkColumn(column)) {
    const raw = getCellValue(data[row], column)
    if (typeof raw === 'string' && /^https?:\/\//i.test(raw.trim())) return raw.trim()
    if (raw && typeof raw === 'object') {
      const url =
        (raw as Record<string, unknown>).url ??
        (raw as Record<string, unknown>).v ??
        (raw as Record<string, unknown>).src
      if (typeof url === 'string' && /^https?:\/\//i.test(url.trim())) return url.trim()
    }
  }
  if (cellFormula) {
    const fromFormula = extractUrlFromHyperlinkFormula(cellFormula)
    if (fromFormula) return fromFormula
  }
  return null
}
