import type {
  SpreadsheetCommittedBatchEnvelope,
  SpreadsheetCommittedOperation
} from './spreadsheetCommittedDeltaContract'

export type SpreadsheetDeltaFeatureSupportResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported_operation' | 'unsupported_workbook_feature'; detail: string }

const SUPPORTED_PHASE_ONE_OPS = new Set([
  'set_cell',
  'set_range',
  'clear_cell',
  'set_style',
  'add_rows',
  'insert_rows_at',
  'delete_rows',
  'row_delete',
  'clear_all',
  'clear_format',
  'set_row_height',
  'set_col_width',
  'insert_row_slots',
  'delete_row_slots',
  'move_row_slots',
  'move_cell_range',
  'visibility_update',
  'freeze_panes',
  'column_add',
  'column_delete',
  'column_update',
  'columns_reorder',
  'column_reorder'
])

const RANGE_BOUND_WORKBOOK_KEYS = [
  'mergeData',
  'conditionalFormatting',
  'dataValidation',
  'filter',
  'filterData',
  'protectedRanges',
  'namedRanges',
  'comments',
  'notes',
  'images',
  'charts',
  'drawings',
  'rowGroups',
  'columnGroups'
]

const STRUCTURAL_OPS = new Set([
  'insert_row_slots',
  'delete_row_slots',
  'move_row_slots',
  'move_cell_range',
  'column_add',
  'column_delete',
  'columns_reorder',
  'column_reorder'
])

const valueHasEntries = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0
  return value != null
}

const getWorksheet = (
  workbookSnapshot: Record<string, unknown> | null | undefined,
  sheetId: string
): Record<string, unknown> | null => {
  const sheets = workbookSnapshot?.sheets
  if (!sheets || typeof sheets !== 'object' || Array.isArray(sheets)) return null
  const direct = (sheets as Record<string, unknown>)[sheetId]
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) return direct as Record<string, unknown>
  return null
}

type CellRangeRect = {
  startRow: number
  endRow: number
  startColumn: number
  endColumn: number
}

const toFiniteGridIndex = (value: unknown): number | null => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) return null
  return Math.trunc(numeric)
}

const parseMoveCellRangeRects = (
  data: Record<string, unknown>
): { fromRange: CellRangeRect; toRange: CellRangeRect } | null => {
  const parseRect = (value: unknown): CellRangeRect | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const rect = value as Record<string, unknown>
    const startRow = toFiniteGridIndex(rect.startRow)
    const endRow = toFiniteGridIndex(rect.endRow)
    const startColumn = toFiniteGridIndex(rect.startColumn)
    const endColumn = toFiniteGridIndex(rect.endColumn)
    if (startRow == null || endRow == null || startColumn == null || endColumn == null) return null
    if (endRow < startRow || endColumn < startColumn) return null
    return { startRow, endRow, startColumn, endColumn }
  }
  const fromRange = parseRect(data.fromRange)
  const toRange = parseRect(data.toRange)
  if (!fromRange || !toRange) return null
  return { fromRange, toRange }
}

const cellIntersectsRange = (row: number, column: number, range: CellRangeRect): boolean =>
  row >= range.startRow && row <= range.endRow && column >= range.startColumn && column <= range.endColumn

const worksheetHasFormulaInRanges = (worksheet: Record<string, unknown>, ranges: CellRangeRect[]): boolean => {
  const cellData = worksheet.cellData
  if (!cellData || typeof cellData !== 'object' || Array.isArray(cellData)) return false
  for (const [rowKey, rowCells] of Object.entries(cellData as Record<string, unknown>)) {
    const row = Number(rowKey)
    if (!Number.isFinite(row)) continue
    if (!rowCells || typeof rowCells !== 'object' || Array.isArray(rowCells)) continue
    for (const [columnKey, cell] of Object.entries(rowCells as Record<string, unknown>)) {
      const column = Number(columnKey)
      if (!Number.isFinite(column)) continue
      const intersectsMove = ranges.some(range => cellIntersectsRange(row, column, range))
      if (!intersectsMove) continue
      if (!cell || typeof cell !== 'object' || Array.isArray(cell)) continue
      if (Object.prototype.hasOwnProperty.call(cell as Record<string, unknown>, 'f')) return true
    }
  }
  return false
}

/** True when move_cell_range touches formula cells inside fromRange or toRange (not the whole sheet). */
const operationMayMoveFormulaCells = (
  operation: SpreadsheetCommittedOperation,
  worksheet: Record<string, unknown> | null
): boolean => {
  if (operation.type !== 'move_cell_range' || !worksheet) return false
  const moveRanges = parseMoveCellRangeRects(operation.data)
  if (!moveRanges) return false
  return worksheetHasFormulaInRanges(worksheet, [moveRanges.fromRange, moveRanges.toRange])
}

const hasFullColumnObjectsForReorder = (data: Record<string, unknown>): boolean => {
  const columns = data.columns
  return (
    Array.isArray(columns) &&
    columns.length > 0 &&
    columns.every(
      column =>
        column &&
        typeof column === 'object' &&
        !Array.isArray(column) &&
        typeof (column as { id?: unknown }).id === 'string'
    )
  )
}

const hasColumnIndexMaps = (data: Record<string, unknown>): boolean => {
  const previous = data.previousIndexByColumnId
  const next = data.nextIndexByColumnId
  if (previous && typeof previous === 'object' && !Array.isArray(previous) && next && typeof next === 'object') {
    return Object.keys(previous as Record<string, unknown>).length > 0
  }
  const previousColumns = Array.isArray(data.previousColumns) ? data.previousColumns : []
  const nextColumns = Array.isArray(data.columns)
    ? data.columns
    : Array.isArray(data.nextColumns)
      ? data.nextColumns
      : []
  const hasColumnIdentity = (column: unknown): boolean => {
    if (!column || typeof column !== 'object' || Array.isArray(column)) return false
    const record = column as Record<string, unknown>
    return typeof record.id === 'string' || typeof record.columnId === 'string'
  }
  return previousColumns.length > 0 && nextColumns.length > 0 && previousColumns.every(hasColumnIdentity)
}

const insertedRowsHaveServerIds = (operation: SpreadsheetCommittedOperation): boolean => {
  if (operation.type !== 'insert_row_slots' && operation.type !== 'insert_rows_at' && operation.type !== 'add_rows')
    return true
  const rows = Array.isArray(operation.data.rows) ? operation.data.rows : []
  return rows.every(row => row && typeof row === 'object' && typeof (row as Record<string, unknown>).id === 'string')
}

const rowStructuralPayloadHasIds = (operation: SpreadsheetCommittedOperation): boolean => {
  if (operation.type !== 'delete_row_slots' && operation.type !== 'move_row_slots') return true
  const rowIds = Array.isArray(operation.data.rowIds) ? operation.data.rowIds : []
  return rowIds.length > 0 && rowIds.every(rowId => typeof rowId === 'string' && rowId.trim().length > 0)
}

export function validateCommittedBatchFeatureSupport(params: {
  batch: SpreadsheetCommittedBatchEnvelope
  workbookSnapshot?: Record<string, unknown> | null
}): SpreadsheetDeltaFeatureSupportResult {
  const worksheet = getWorksheet(params.workbookSnapshot, params.batch.sheetId)
  for (const operation of params.batch.operations) {
    if (!SUPPORTED_PHASE_ONE_OPS.has(operation.type)) {
      return { ok: false, reason: 'unsupported_operation', detail: operation.type }
    }
    if (!insertedRowsHaveServerIds(operation)) {
      return { ok: false, reason: 'unsupported_workbook_feature', detail: 'inserted_rows_missing_server_ids' }
    }
    if (!rowStructuralPayloadHasIds(operation)) {
      return { ok: false, reason: 'unsupported_workbook_feature', detail: 'row_structural_payload_missing_ids' }
    }
    if (
      (operation.type === 'columns_reorder' || operation.type === 'column_reorder') &&
      !hasColumnIndexMaps(operation.data) &&
      !hasFullColumnObjectsForReorder(operation.data)
    ) {
      return { ok: false, reason: 'unsupported_workbook_feature', detail: 'column_reorder_missing_index_maps' }
    }
    if (!STRUCTURAL_OPS.has(operation.type)) continue
    if (operationMayMoveFormulaCells(operation, worksheet)) {
      return { ok: false, reason: 'unsupported_workbook_feature', detail: 'formulas' }
    }
    for (const key of RANGE_BOUND_WORKBOOK_KEYS) {
      if (valueHasEntries(worksheet?.[key])) {
        return { ok: false, reason: 'unsupported_workbook_feature', detail: key }
      }
    }
  }
  return { ok: true }
}
