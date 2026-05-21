import { parseA1Reference } from '../core'

const SHEET_ID_PREFIX = 'sheetId:'
const CELL_REF_PREFIX = 'cellRef:'
const ROW_PREFIX = 'row:'
const COL_PREFIX = 'col:'
const END_ROW_PREFIX = 'endRow:'
const END_COL_PREFIX = 'endCol:'

export type ParsedSpreadsheetCursorPath = {
  row: number
  col: number
  endRow?: number
  endCol?: number
}

export const buildSpreadsheetCursorPath = (
  sheetId: string,
  cellRef: string,
  row: number,
  col: number,
  endRow?: number,
  endCol?: number
): string[] => {
  const base = [
    `${SHEET_ID_PREFIX}${sheetId}`,
    `${CELL_REF_PREFIX}${cellRef}`,
    `${ROW_PREFIX}${row}`,
    `${COL_PREFIX}${col}`
  ]
  const isMultiCell =
    typeof endRow === 'number' &&
    typeof endCol === 'number' &&
    Number.isFinite(endRow) &&
    Number.isFinite(endCol) &&
    (endRow !== row || endCol !== col)
  if (isMultiCell) {
    base.push(`${END_ROW_PREFIX}${endRow}`, `${END_COL_PREFIX}${endCol}`)
  }
  return base
}

export const parseSpreadsheetCursorPath = (
  path: string[] | undefined,
  renderedSheetId: string,
  options: { requireSheetMatch?: boolean; normalizeSheetId?: (sheetId: string) => string } = {}
): ParsedSpreadsheetCursorPath | null => {
  if (!path || path.length === 0) return null
  const normalizeSheetId = options.normalizeSheetId
  const normalizedRenderedSheetId = normalizeSheetId?.(renderedSheetId) ?? renderedSheetId

  const sheetIdEntry = path.find(item => item.startsWith(SHEET_ID_PREFIX))
  if (sheetIdEntry) {
    const cursorSheetId = sheetIdEntry.slice(SHEET_ID_PREFIX.length)
    const normalizedCursorSheetId = normalizeSheetId?.(cursorSheetId) ?? cursorSheetId
    if (normalizedCursorSheetId !== normalizedRenderedSheetId) return null
  } else if (options.requireSheetMatch) {
    return null
  }

  const endRowEntry = path.find(item => item.startsWith(END_ROW_PREFIX))
  const endColEntry = path.find(item => item.startsWith(END_COL_PREFIX))
  const parsedEndRow = endRowEntry ? Number(endRowEntry.slice(END_ROW_PREFIX.length)) : undefined
  const parsedEndCol = endColEntry ? Number(endColEntry.slice(END_COL_PREFIX.length)) : undefined
  const endRow =
    typeof parsedEndRow === 'number' && Number.isFinite(parsedEndRow) && parsedEndRow >= 0 ? parsedEndRow : undefined
  const endCol =
    typeof parsedEndCol === 'number' && Number.isFinite(parsedEndCol) && parsedEndCol >= 0 ? parsedEndCol : undefined

  const cellRefEntry = path.find(item => item.startsWith(CELL_REF_PREFIX))
  if (cellRefEntry) {
    const parsed = parseA1Reference(cellRefEntry.slice(CELL_REF_PREFIX.length))
    if (parsed) return { ...parsed, endRow, endCol }
  }

  const colEntry = path.find(item => item.startsWith(COL_PREFIX))
  if (!colEntry) return null
  const col = Number(colEntry.slice(COL_PREFIX.length))
  if (!Number.isFinite(col) || col < 0) return null

  const rowEntry = path.find(item => item.startsWith(ROW_PREFIX))
  if (!rowEntry) return null
  const row = Number(rowEntry.slice(ROW_PREFIX.length))
  if (!Number.isFinite(row) || row < 0) return null
  return { row, col, endRow, endCol }
}
