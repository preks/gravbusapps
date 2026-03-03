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

function toUniverCellData(raw: unknown, column: SpreadsheetColumn): UniverCellData | null {
  if (raw === undefined || raw === null || raw === '') return null
  const normalizedColumnName = String(column.name || '').toLowerCase()
  const normalizedColumnId = String(column.id || '').toLowerCase()
  const isAvatarColumn =
    normalizedColumnName === '_recipient_avatar' ||
    normalizedColumnId === '_recipient_avatar' ||
    normalizedColumnName === 'recipient_avatar' ||
    normalizedColumnId === 'recipient_avatar'
  const isLinkColumn =
    normalizedColumnName === '_copy_link' ||
    normalizedColumnId === '_copy_link' ||
    normalizedColumnName === 'copy_link' ||
    normalizedColumnId === 'copy_link'

  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>
    const objectValue =
      typeof obj.v === 'string'
        ? obj.v
        : typeof obj.m === 'string'
          ? obj.m
          : typeof obj.url === 'string'
            ? obj.url
            : typeof obj.src === 'string'
              ? obj.src
              : ''
    if ((column.type === 'image' || isAvatarColumn) && objectValue) {
      raw = objectValue
    } else if ((column.type === 'url' || isLinkColumn) && objectValue) {
      raw = objectValue
    } else {
      const cell: UniverCellData = {}
      if (obj.f && typeof obj.f === 'string') cell.f = obj.f.startsWith('=') ? obj.f : `=${obj.f}`
      const val = obj.v ?? obj.m
      if (val !== undefined && val !== null) cell.v = val as string | number | boolean
      else if (obj.m !== undefined) cell.v = obj.m as string | number | boolean
      const univerStyle = toUniverInlineStyle(obj)
      if (univerStyle) cell.s = univerStyle
      if (Object.keys(cell).length > 0) return cell
      return raw as UniverCellData
    }
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if ((column.type === 'url' || isLinkColumn) && /^https?:\/\//i.test(trimmed)) {
      const safeUrl = trimmed.replace(/"/g, '""')
      return { f: `=HYPERLINK("${safeUrl}","View Response")` }
    }
    if (column.type === 'image' || isAvatarColumn) {
      const isHttpImage = /^https?:\/\//i.test(trimmed)
      const isDataImage = /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(trimmed)
      const looksLikeRawBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(trimmed) && trimmed.length > 100
      const imageUrl = isHttpImage
        ? trimmed
        : isDataImage
          ? trimmed
          : looksLikeRawBase64
            ? `data:image/jpeg;base64,${trimmed}`
            : ''
      if (imageUrl) {
        const safeUrl = imageUrl.replace(/"/g, '""')
        return { f: `=IMAGE("${safeUrl}")` }
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

  const columnData: Record<number, { w?: number }> = {}
  visibleColumns.forEach((col, idx) => {
    const w = typeof col.width === 'number' && col.width > 0 ? col.width : UNIVER_DEFAULT_COL_WIDTH
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
