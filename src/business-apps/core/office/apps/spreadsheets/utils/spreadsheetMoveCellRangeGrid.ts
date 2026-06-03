import type { SpreadsheetColumn } from '../types/spreadsheet'
import { applyMoveCellRangeTransform, type CellRangeRect } from './applyMoveCellRangeTransform'
import type { ViewerRow } from './spreadsheetRowIdentity'

const sortColumnsByOrder = (columns: SpreadsheetColumn[]): SpreadsheetColumn[] =>
  [...columns].sort((left, right) => left.order - right.order)

export type { CellRangeRect }

/**
 * `move_cell_range` row/column indices use the **visible grid** coordinate system:
 * - Column `0` is the leftmost **visible** column (matches `buildWorkbookSnapshot` / Univer).
 * - Hidden columns (`isVisible === false`) are excluded from the index space.
 * - The same indices are sent on the wire, applied to ViewerRow session data, and passed to Univer.
 */
export const MOVE_CELL_RANGE_USES_VISIBLE_GRID_INDICES = true

export type MoveCellRangeValidationResult =
  | { ok: true; fromRange: CellRangeRect; toRange: CellRangeRect }
  | { ok: false; reason: 'invalid_range' | 'dimension_mismatch' | 'column_out_of_bounds' }

const toFiniteIndex = (value: unknown): number | null => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return Math.max(0, Math.trunc(parsed))
}

export const visibleColumnsInGridOrder = (columns: SpreadsheetColumn[]): SpreadsheetColumn[] =>
  sortColumnsByOrder(columns).filter(column => column.isVisible !== false)

export const countVisibleGridColumns = (columns: SpreadsheetColumn[]): number =>
  visibleColumnsInGridOrder(columns).length

/** Column names indexed by visible grid column index (same order as Univer column indices). */
export const buildColumnNamesByVisibleGridIndex = (columns: SpreadsheetColumn[]): ReadonlyArray<string | null> =>
  visibleColumnsInGridOrder(columns).map(column => (typeof column?.name === 'string' ? column.name : null))

export const normalizeMoveCellRangeRect = (value: unknown): CellRangeRect | null => {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  const startRow = toFiniteIndex(candidate.startRow)
  const endRow = toFiniteIndex(candidate.endRow)
  const startColumn = toFiniteIndex(candidate.startColumn)
  const endColumn = toFiniteIndex(candidate.endColumn)
  if (startRow == null || endRow == null || startColumn == null || endColumn == null) return null
  if (endRow < startRow || endColumn < startColumn) return null
  return { startRow, endRow, startColumn, endColumn }
}

export const parseMoveCellRangeWirePayload = (data: {
  fromRange?: unknown
  toRange?: unknown
}): { fromRange: CellRangeRect; toRange: CellRangeRect } | null => {
  const fromRange = normalizeMoveCellRangeRect(data.fromRange)
  const toRange = normalizeMoveCellRangeRect(data.toRange)
  if (!fromRange || !toRange) return null
  return { fromRange, toRange }
}

const rangeDimensionsMatch = (fromRange: CellRangeRect, toRange: CellRangeRect): boolean =>
  fromRange.endRow - fromRange.startRow === toRange.endRow - toRange.startRow &&
  fromRange.endColumn - fromRange.startColumn === toRange.endColumn - toRange.startColumn

const rangeColumnsWithinVisibleGrid = (range: CellRangeRect, visibleColumnCount: number): boolean => {
  if (visibleColumnCount <= 0) return false
  const maxColumnIndex = visibleColumnCount - 1
  return range.startColumn <= maxColumnIndex && range.endColumn <= maxColumnIndex
}

export const validateMoveCellRangeForVisibleColumnCount = (
  visibleColumnCount: number,
  fromRange: CellRangeRect,
  toRange: CellRangeRect
): MoveCellRangeValidationResult => {
  const normalizedFrom = normalizeMoveCellRangeRect(fromRange)
  const normalizedTo = normalizeMoveCellRangeRect(toRange)
  if (!normalizedFrom || !normalizedTo) {
    return { ok: false, reason: 'invalid_range' }
  }
  if (!rangeDimensionsMatch(normalizedFrom, normalizedTo)) {
    return { ok: false, reason: 'dimension_mismatch' }
  }
  if (
    !rangeColumnsWithinVisibleGrid(normalizedFrom, visibleColumnCount) ||
    !rangeColumnsWithinVisibleGrid(normalizedTo, visibleColumnCount)
  ) {
    return { ok: false, reason: 'column_out_of_bounds' }
  }
  return { ok: true, fromRange: normalizedFrom, toRange: normalizedTo }
}

export const validateMoveCellRangeForVisibleGrid = (
  columns: SpreadsheetColumn[],
  fromRange: CellRangeRect,
  toRange: CellRangeRect
): MoveCellRangeValidationResult =>
  validateMoveCellRangeForVisibleColumnCount(countVisibleGridColumns(columns), fromRange, toRange)

export const applyMoveCellRangeToViewerRows = <T extends ViewerRow>(params: {
  rows: T[]
  columns: SpreadsheetColumn[]
  fromRange: CellRangeRect
  toRange: CellRangeRect
}): T[] => {
  const validation = validateMoveCellRangeForVisibleGrid(params.columns, params.fromRange, params.toRange)
  if (!validation.ok) {
    return params.rows
  }
  return applyMoveCellRangeTransform({
    rows: params.rows,
    columnNamesByGridIndex: buildColumnNamesByVisibleGridIndex(params.columns),
    fromRange: validation.fromRange,
    toRange: validation.toRange
  })
}

export const applyMoveCellRangeWirePayloadToViewerRows = <T extends ViewerRow>(params: {
  rows: T[]
  columns: SpreadsheetColumn[]
  fromRange?: unknown
  toRange?: unknown
}): T[] => {
  const parsed = parseMoveCellRangeWirePayload(params)
  if (!parsed) return params.rows
  return applyMoveCellRangeToViewerRows({
    rows: params.rows,
    columns: params.columns,
    fromRange: parsed.fromRange,
    toRange: parsed.toRange
  })
}
