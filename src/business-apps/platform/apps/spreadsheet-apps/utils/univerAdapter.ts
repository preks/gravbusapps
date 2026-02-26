/**
 * Univer Data Adapter
 *
 * Converts between our spreadsheet format (SpreadsheetSheet, columns, rows)
 * and Univer's workbook/sheet/cell model for initial load and callbacks.
 */

import type { SpreadsheetSheet, SpreadsheetColumn } from '../types/spreadsheet'

/** Conversion context for mapping row/column indices to our rowId/columnId (used by collaboration). */
export interface ConversionContext {
  columnIdToIndex: Map<string, number>
  columnIndexToId: Map<number, string>
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
      (key) =>
        key.toLowerCase() === column.name.toLowerCase() ||
        key.toLowerCase() === column.id.toLowerCase()
    )
    if (matchingKey) value = row[matchingKey]
  }
  if (value && typeof value === 'object' && !Array.isArray(value) && 'v' in (value as Record<string, unknown>)) {
    return (value as Record<string, unknown>).v
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return ''
  }
  return value
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
  const visibleColumns = columns.filter((c) => c.isVisible !== false)
  const cellData: UniverSheetCellData = {}

  data.forEach((row, rowIndex) => {
    const rowCells: Record<number, UniverCellData> = {}
    visibleColumns.forEach((col, colIndex) => {
      const raw = getCellValue(row, col)
      if (raw !== undefined && raw !== null && raw !== '') {
        rowCells[colIndex] = { v: raw as string | number | boolean }
      }
    })
    if (Object.keys(rowCells).length > 0) {
      cellData[rowIndex] = rowCells
    }
  })

  const worksheet: UniverWorksheetData = {
    id: sheet.id,
    name: sheet.name,
    cellData,
    rowCount: Math.max(data.length, 1),
    columnCount: Math.max(visibleColumns.length, 1)
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
  const columnIdToIndex = new Map<string, number>()
  const columnIndexToId = new Map<number, string>()
  const rowIdToIndex = new Map<string, number>()
  const rowIndexToId = new Map<number, string>()
  const excelColToIndex = new Map<string, number>()
  const indexToExcelCol = new Map<number, string>()
  columns.forEach((col, index) => {
    columnIdToIndex.set(col.id, index)
    columnIndexToId.set(index, col.id)
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
    rowIdToIndex,
    rowIndexToId,
    excelColToIndex,
    indexToExcelCol
  }
}
