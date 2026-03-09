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
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const cellObject = value as Record<string, unknown>
    if ('v' in cellObject || 'f' in cellObject || 'm' in cellObject || 'ct' in cellObject) {
      return cellObject
    }
    return ''
  }
  return value
}

/** Map our parsed style (from Excel import) to Univer inline style */
function toUniverInlineStyle(obj: Record<string, unknown>): Record<string, unknown> | undefined {
  const style: Record<string, unknown> = {}
  if (obj.bg && typeof obj.bg === 'string') {
    const hex = obj.bg.replace('#', '')
    style.bg = { rgb: hex.length === 6 || hex.length === 8 ? `#${hex}` : obj.bg }
  }
  if (obj.fc && typeof obj.fc === 'string') {
    const hex = obj.fc.replace('#', '')
    style.cl = { rgb: hex.length === 6 || hex.length === 8 ? `#${hex}` : obj.fc }
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
  if (val !== undefined && val !== null) cell.v = val as string | number | boolean
  else if (obj.m !== undefined) cell.v = obj.m as string | number | boolean
  const univerStyle = toUniverInlineStyle(obj)
  if (univerStyle) cell.s = univerStyle
  return Object.keys(cell).length > 0 ? cell : null
}

function toImageUrl(raw: string): string {
  const trimmed = raw.trim()
  const isHttpImage = /^https?:\/\//i.test(trimmed)
  const isDataImage = /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(trimmed)
  const looksLikeRawBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(trimmed) && trimmed.length > 100
  if (isHttpImage || isDataImage) return trimmed
  if (looksLikeRawBase64) return `data:image/jpeg;base64,${trimmed}`
  return ''
}

function toUniverCellData(raw: unknown, column: SpreadsheetColumn): UniverCellData | null {
  if (raw === undefined || raw === null || raw === '') return null
  const avatarColumn = isAvatarColumn(column)
  const linkColumn = isLinkColumn(column)

  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>
    const objectValue = extractObjectValue(obj)
    if ((column.type === 'image' || avatarColumn || column.type === 'url' || linkColumn) && objectValue)
      raw = objectValue
    else return toFormulaCell(obj) ?? (raw as UniverCellData)
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if ((column.type === 'url' || linkColumn) && /^https?:\/\//i.test(trimmed)) {
      const safeUrl = trimmed.replace(/"/g, '""')
      return { f: `=HYPERLINK("${safeUrl}","View Response")` }
    }
    if (column.type === 'image' || avatarColumn) {
      const imageUrl = toImageUrl(trimmed)
      if (imageUrl) {
        const safeUrl = imageUrl.replace(/"/g, '""')
        // Avatar columns: use custom size (sizing=3, 32x32) for small round-like display.
        // Regular image columns: default stretch behavior.
        const isAvatar = avatarColumn
        return isAvatar
          ? { f: `=IMAGE("${safeUrl}", "", 3, 32, 32)` }
          : { f: `=IMAGE("${safeUrl}")` }
      }
    }
  }

  return { v: raw as string | number | boolean }
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
  const cellData: UniverSheetCellData = {}

  data.forEach((row, rowIndex) => {
    const rowCells: Record<number, UniverCellData> = {}
    visibleColumns.forEach((col, colIndex) => {
      const raw = getCellValue(row, col)
      const cell = toUniverCellData(raw, col)
      if (cell) {
        rowCells[colIndex] = cell
      }
    })
    if (Object.keys(rowCells).length > 0) {
      cellData[rowIndex] = rowCells
    }
  })

  const DEFAULT_MIN_ROWS = 1000
  const UNIVER_DEFAULT_COL_WIDTH = 73
  const UNIVER_DEFAULT_ROW_HEIGHT = 23
  const UNIVER_ROW_HEADER_WIDTH = 46
  const UNIVER_COLUMN_HEADER_HEIGHT = 20

  const AVATAR_COL_WIDTH = 40
  const columnData: Record<number, { w?: number }> = {}
  visibleColumns.forEach((col, idx) => {
    let w: number
    if (typeof col.width === 'number' && col.width > 0) {
      w = col.width
    } else if (isAvatarColumn(col)) {
      w = AVATAR_COL_WIDTH
    } else {
      w = UNIVER_DEFAULT_COL_WIDTH
    }
    columnData[idx] = { w }
  })

  const rowData: Record<number, { h?: number }> = {}
  data.forEach((row, idx) => {
    const h = row._height as number | undefined
    if (typeof h === 'number' && h > 0) {
      rowData[idx] = { h }
    }
  })

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
  if (!sheets) return

  const visibleColumns = columns.filter(c => c.isVisible !== false)
  const avatarColIndices = new Set(
    visibleColumns.map((col, idx) => (isAvatarColumn(col) ? idx : -1)).filter(i => i >= 0)
  )
  if (avatarColIndices.size === 0) return

  const AVATAR_COL_WIDTH = 40

  for (const sheetData of Object.values(sheets)) {
    if (!sheetData?.cellData) continue

    for (const rowCells of Object.values(sheetData.cellData) as Record<number, UniverCellData>[]) {
      if (typeof rowCells !== 'object') continue
      for (const colIdx of avatarColIndices) {
        const cell = rowCells[colIdx]
        if (!cell?.f || typeof cell.f !== 'string') continue
        const m = cell.f.match(OLD_IMAGE_FORMULA)
        if (m) {
          const url = m[1].replace(/""/g, '"')
          cell.f = `=IMAGE("${url.replace(/"/g, '""')}", "", 3, 32, 32)`
        }
      }
    }

    if (sheetData.columnData && typeof sheetData.columnData === 'object') {
      for (const colIdx of avatarColIndices) {
        const colConfig = sheetData.columnData[colIdx]
        if (colConfig && typeof colConfig === 'object') {
          ;(colConfig as { w?: number }).w = AVATAR_COL_WIDTH
        } else {
          ;(sheetData.columnData as Record<number, { w?: number }>)[colIdx] = { w: AVATAR_COL_WIDTH }
        }
      }
    }
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
    const rowId = (row._id as string) || `row_${index}`
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
