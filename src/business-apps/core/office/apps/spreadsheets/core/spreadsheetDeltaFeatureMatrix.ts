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
  'merge_ranges',
  'unmerge_ranges',
  'column_add',
  'column_delete',
  'column_update',
  'columns_reorder',
  'column_reorder'
])

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

const batchHasColumnReorderSupport = (batch: SpreadsheetCommittedBatchEnvelope): boolean => {
  const batchColumns = Array.isArray(batch.columns) ? batch.columns : []
  if (batchColumns.length > 0) {
    return true
  }
  const gridColumnIndexByColumnId = batch.gridColumnIndexByColumnId
  if (
    gridColumnIndexByColumnId &&
    typeof gridColumnIndexByColumnId === 'object' &&
    !Array.isArray(gridColumnIndexByColumnId) &&
    Object.keys(gridColumnIndexByColumnId).length > 0
  ) {
    return true
  }
  const visibleColumnIds = Array.isArray(batch.visibleColumnIds) ? batch.visibleColumnIds : []
  return visibleColumnIds.length > 0
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
      !hasFullColumnObjectsForReorder(operation.data) &&
      !batchHasColumnReorderSupport(params.batch)
    ) {
      return { ok: false, reason: 'unsupported_workbook_feature', detail: 'column_reorder_missing_index_maps' }
    }
  }
  return { ok: true }
}
