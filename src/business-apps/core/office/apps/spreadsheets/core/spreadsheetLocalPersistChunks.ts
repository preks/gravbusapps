import type { SpreadsheetBatchOperation } from '../services/SpreadsheetApiService'
import type { LocalPersistKind } from './spreadsheetSheetWorkQueue'
import { splitBatchOperationsByApproxJsonSize } from '../utils/spreadsheetUnifiedBatchSubmitUtils'

export type SpreadsheetLocalPersistChunk = {
  kind: LocalPersistKind
  operations: SpreadsheetBatchOperation[]
}

const WORKBOOK_FEATURE_OP_TYPES = new Set([
  'merge_ranges',
  'unmerge_ranges',
  'freeze_panes',
  'visibility_update',
  'filter_update',
  'filter_clear',
  'protect_ranges_update',
  'sheet_protection_update'
])

export const isWorkbookFeatureBatchOperationType = (type: string): boolean => WORKBOOK_FEATURE_OP_TYPES.has(type)

export const classifyLocalPersistKindFromChunk = (chunk: SpreadsheetBatchOperation[]): LocalPersistKind => {
  if (chunk.length === 0) return 'unknownAtomic'
  let allSetCell = true
  let allClearCell = true
  let allSetRange = true
  let anyStyle = false
  let anyStructural = false
  let anyAddRows = false
  for (const op of chunk) {
    const t = String(op.type ?? '')
    if (t !== 'set_cell') allSetCell = false
    if (t !== 'clear_cell') allClearCell = false
    if (t !== 'set_range') allSetRange = false
    if (t === 'add_rows') anyAddRows = true
    if (t === 'set_style' || t === 'set_row_height' || t === 'set_col_width') anyStyle = true
    if (
      t === 'insert_row_slots' ||
      t === 'delete_row_slots' ||
      t === 'move_row_slots' ||
      t === 'insert_column_slots' ||
      t === 'delete_column_slots' ||
      t === 'move_column_slots' ||
      t === 'move_cell_range' ||
      t === 'reorder_columns' ||
      t === 'reorder_rows'
    ) {
      anyStructural = true
    }
  }
  if (allSetCell) return 'cellValue'
  if (allClearCell) return 'clear'
  if (allSetRange) return 'rangeValue'
  if (anyAddRows || anyStructural) return 'structural'
  if (anyStyle) return 'style'
  let allWorkbookFeature = true
  for (const op of chunk) {
    if (!isWorkbookFeatureBatchOperationType(String(op.type ?? ''))) {
      allWorkbookFeature = false
      break
    }
  }
  if (allWorkbookFeature) return 'workbookFeature'
  return 'unknownAtomic'
}

const classifyLocalPersistKindForOperation = (operation: SpreadsheetBatchOperation): LocalPersistKind => {
  const type = String(operation.type ?? '')
  if (isWorkbookFeatureBatchOperationType(type)) return 'workbookFeature'
  return classifyLocalPersistKindFromChunk([operation])
}

export function splitUnifiedOperationsByPersistKind(
  operations: SpreadsheetBatchOperation[],
  maxBytesPerChunk: number
): SpreadsheetLocalPersistChunk[] {
  if (operations.length === 0) return []

  const grouped: SpreadsheetLocalPersistChunk[] = []
  for (const operation of operations) {
    const kind = classifyLocalPersistKindForOperation(operation)
    const tail = grouped[grouped.length - 1]
    if (!tail || tail.kind !== kind) {
      grouped.push({ kind, operations: [operation] })
      continue
    }
    tail.operations.push(operation)
  }

  return grouped.flatMap(group =>
    splitBatchOperationsByApproxJsonSize(group.operations, maxBytesPerChunk).map(operations => ({
      kind: group.kind,
      operations
    }))
  )
}
