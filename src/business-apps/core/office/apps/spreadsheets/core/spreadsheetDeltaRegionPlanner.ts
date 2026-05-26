import type {
  SpreadsheetCommittedBatchEnvelope,
  SpreadsheetCommittedOperation
} from './spreadsheetCommittedDeltaContract'

export type SpreadsheetDeltaDirtyRegion =
  | { type: 'rect'; minRow: number; maxRow: number; minCol: number; maxCol: number }
  | { type: 'rowsFrom'; startRow: number }
  | { type: 'colsFrom'; startCol: number }
  | { type: 'entireUsedRange' }
  | { type: 'entireSheetStructure' }

/** Sentinel maxCol for row-band rects; clamped to visible column count at apply time. */
export const SPREADSHEET_DELTA_ALL_COLUMNS = Number.MAX_SAFE_INTEGER

const numberOrNull = (value: unknown): number | null => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) return null
  return Math.trunc(numeric)
}

const rangeFromPayload = (
  value: unknown
): { startRow: number; endRow: number; startColumn: number; endColumn: number } | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const startRow = numberOrNull(record.startRow)
  const endRow = numberOrNull(record.endRow)
  const startColumn = numberOrNull(record.startColumn)
  const endColumn = numberOrNull(record.endColumn)
  if (startRow == null || endRow == null || startColumn == null || endColumn == null) return null
  return {
    startRow,
    endRow: Math.max(startRow, endRow),
    startColumn,
    endColumn: Math.max(startColumn, endColumn)
  }
}

const planMoveRowSlotsDirtyRegion = (data: Record<string, unknown>): SpreadsheetDeltaDirtyRegion[] => {
  const source = numberOrNull(data.sourceStartGridRowIndex) ?? 0
  const count = Math.max(0, numberOrNull(data.count) ?? 0)
  const destination = numberOrNull(data.destinationGridRowIndex) ?? 0
  if (count <= 0) {
    return []
  }
  const sourceEnd = source + count - 1
  const destinationEnd = destination + count - 1
  const minRow = Math.min(source, destination)
  let maxRow = Math.max(sourceEnd, destinationEnd)
  if (destination > sourceEnd) {
    maxRow = Math.max(maxRow, destination - 1)
  }
  return [
    {
      type: 'rect',
      minRow,
      maxRow,
      minCol: 0,
      maxCol: SPREADSHEET_DELTA_ALL_COLUMNS
    }
  ]
}

const planInsertRowSlotsDirtyRegion = (data: Record<string, unknown>): SpreadsheetDeltaDirtyRegion[] => {
  const start = numberOrNull(data.startGridRowIndex) ?? 0
  const count = Math.max(0, numberOrNull(data.count) ?? 0)
  if (count <= 0) {
    return []
  }
  return [
    {
      type: 'rect',
      minRow: start,
      maxRow: start + count - 1,
      minCol: 0,
      maxCol: SPREADSHEET_DELTA_ALL_COLUMNS
    }
  ]
}

const planOperationRegions = (operation: SpreadsheetCommittedOperation): SpreadsheetDeltaDirtyRegion[] => {
  const data = operation.data
  if (operation.type === 'set_cell' || operation.type === 'clear_cell') {
    const row = numberOrNull(data.row) ?? numberOrNull(data.rowIndex)
    const col = numberOrNull(data.col) ?? numberOrNull(data.colIndex)
    return row != null && col != null ? [{ type: 'rect', minRow: row, maxRow: row, minCol: col, maxCol: col }] : []
  }
  if (operation.type === 'set_range') {
    return [{ type: 'entireUsedRange' }]
  }
  if (operation.type === 'insert_row_slots') {
    return planInsertRowSlotsDirtyRegion(data)
  }
  if (operation.type === 'delete_row_slots') {
    const startRow = numberOrNull(data.startGridRowIndex) ?? 0
    return [{ type: 'rowsFrom', startRow }]
  }
  if (operation.type === 'move_row_slots') {
    return planMoveRowSlotsDirtyRegion(data)
  }
  if (operation.type === 'move_cell_range') {
    const fromRange = rangeFromPayload(data.fromRange)
    const toRange = rangeFromPayload(data.toRange)
    if (!fromRange || !toRange) return [{ type: 'entireUsedRange' }]
    return [
      {
        type: 'rect',
        minRow: Math.min(fromRange.startRow, toRange.startRow),
        maxRow: Math.max(fromRange.endRow, toRange.endRow),
        minCol: Math.min(fromRange.startColumn, toRange.startColumn),
        maxCol: Math.max(fromRange.endColumn, toRange.endColumn)
      }
    ]
  }
  if (operation.type === 'column_add') {
    return [{ type: 'colsFrom', startCol: numberOrNull(data.insertIndex) ?? numberOrNull(data.columnIndex) ?? 0 }]
  }
  if (operation.type === 'column_update') {
    return []
  }
  if (operation.type === 'column_delete') {
    return [
      {
        type: 'colsFrom',
        startCol:
          numberOrNull(data.visibleDeleteIndex) ?? numberOrNull(data.columnIndex) ?? numberOrNull(data.insertIndex) ?? 0
      }
    ]
  }
  if (operation.type === 'columns_reorder' || operation.type === 'column_reorder') {
    return [{ type: 'entireSheetStructure' }]
  }
  if (operation.type === 'set_style' || operation.type === 'clear_all' || operation.type === 'clear_format') {
    return [{ type: 'entireUsedRange' }]
  }
  return []
}

export function planCommittedBatchDirtyRegions(
  batch: SpreadsheetCommittedBatchEnvelope
): SpreadsheetDeltaDirtyRegion[] {
  const regions: SpreadsheetDeltaDirtyRegion[] = []
  for (const operation of batch.operations) {
    regions.push(...planOperationRegions(operation))
  }
  return regions
}
