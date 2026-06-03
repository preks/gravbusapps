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

const planRowInsertDirtyRegions = (
  data: Record<string, unknown>,
  operationType: 'add_rows' | 'insert_rows_at'
): SpreadsheetDeltaDirtyRegion[] => {
  const rows = Array.isArray(data.rows) ? (data.rows as Array<Record<string, unknown>>) : []
  if (operationType === 'insert_rows_at') {
    const insertAt = numberOrNull(data.insertAt) ?? 0
    const count = Math.max(rows.length, 1)
    return [
      {
        type: 'rect',
        minRow: insertAt,
        maxRow: insertAt + count - 1,
        minCol: 0,
        maxCol: SPREADSHEET_DELTA_ALL_COLUMNS
      }
    ]
  }

  let minRow = Number.POSITIVE_INFINITY
  let maxRow = -1
  for (const row of rows) {
    const gridRowIndex = numberOrNull(row._gridRowIndex)
    if (gridRowIndex == null) continue
    minRow = Math.min(minRow, gridRowIndex)
    maxRow = Math.max(maxRow, gridRowIndex)
  }
  if (maxRow < 0 || !Number.isFinite(minRow)) {
    return rows.length > 0 ? [{ type: 'entireUsedRange' }] : []
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

const planOperationRegions = (operation: SpreadsheetCommittedOperation): SpreadsheetDeltaDirtyRegion[] => {
  const data = operation.data
  if (operation.type === 'set_cell' || operation.type === 'clear_cell') {
    const row = numberOrNull(data.row) ?? numberOrNull(data.rowIndex)
    const col = numberOrNull(data.col) ?? numberOrNull(data.colIndex)
    return row != null && col != null ? [{ type: 'rect', minRow: row, maxRow: row, minCol: col, maxCol: col }] : []
  }
  if (operation.type === 'set_range') {
    const cells = Array.isArray(data.cells) ? (data.cells as Array<Record<string, unknown>>) : []
    const regions: SpreadsheetDeltaDirtyRegion[] = []
    for (const cell of cells) {
      const row = numberOrNull(cell.row) ?? numberOrNull(cell.rowIndex)
      const col = numberOrNull(cell.col) ?? numberOrNull(cell.colIndex)
      if (row == null || col == null) continue
      regions.push({ type: 'rect', minRow: row, maxRow: row, minCol: col, maxCol: col })
    }
    return regions
  }
  if (operation.type === 'add_rows' || operation.type === 'insert_rows_at') {
    return planRowInsertDirtyRegions(data, operation.type)
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
  if (operation.type === 'set_style') {
    const cells = Array.isArray(data.cells) ? (data.cells as Array<Record<string, unknown>>) : []
    const regions: SpreadsheetDeltaDirtyRegion[] = []
    for (const cell of cells) {
      const row = numberOrNull(cell.row) ?? numberOrNull(cell.rowIndex)
      const col = numberOrNull(cell.col) ?? numberOrNull(cell.colIndex)
      if (row == null || col == null) continue
      regions.push({ type: 'rect', minRow: row, maxRow: row, minCol: col, maxCol: col })
    }
    return regions
  }
  if (
    operation.type === 'clear_all' ||
    operation.type === 'clear_format' ||
    operation.type === 'merge_ranges' ||
    operation.type === 'unmerge_ranges'
  ) {
    return planClearRangeDirtyRegions(data)
  }
  return []
}

const planClearRangeDirtyRegions = (data: Record<string, unknown>): SpreadsheetDeltaDirtyRegion[] => {
  const rawRanges = Array.isArray(data.ranges) ? data.ranges : []
  const regions: SpreadsheetDeltaDirtyRegion[] = []
  for (const candidate of rawRanges) {
    if (!candidate || typeof candidate !== 'object') continue
    const record = candidate as Record<string, unknown>
    const range = rangeFromPayload(record)
    if (!range) continue
    regions.push({
      type: 'rect',
      minRow: range.startRow,
      maxRow: range.endRow,
      minCol: range.startColumn,
      maxCol: range.endColumn
    })
  }
  return regions.length > 0 ? regions : [{ type: 'entireUsedRange' }]
}

export function planCommittedBatchDirtyRegions(
  batch: SpreadsheetCommittedBatchEnvelope
): SpreadsheetDeltaDirtyRegion[] {
  if (batch.dirtyRegions && batch.dirtyRegions.length > 0) {
    return batch.dirtyRegions.flatMap(region => {
      if (region.type === 'sheetStructure') return [{ type: 'entireSheetStructure' as const }]
      if (region.type === 'cell' && region.row != null && region.col != null) {
        return [
          {
            type: 'rect' as const,
            minRow: region.row,
            maxRow: region.row,
            minCol: region.col,
            maxCol: region.col
          }
        ]
      }
      if (region.type === 'rect') {
        return [
          {
            type: 'rect' as const,
            minRow: region.minRow,
            maxRow: region.maxRow,
            minCol: region.minCol,
            maxCol: region.maxCol
          }
        ]
      }
      if (region.type === 'rowSlot') {
        return [
          {
            type: 'rect' as const,
            minRow: region.startRow,
            maxRow: region.startRow + Math.max(0, region.count) - 1,
            minCol: 0,
            maxCol: SPREADSHEET_DELTA_ALL_COLUMNS
          }
        ]
      }
      if (region.type === 'columnSlot') {
        return [{ type: 'colsFrom' as const, startCol: region.startCol }]
      }
      return []
    })
  }
  const regions: SpreadsheetDeltaDirtyRegion[] = []
  for (const operation of batch.operations) {
    regions.push(...planOperationRegions(operation))
  }
  return regions
}
