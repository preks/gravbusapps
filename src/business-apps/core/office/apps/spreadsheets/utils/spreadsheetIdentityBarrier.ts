import type { SpreadsheetBatchOperation } from '../services/SpreadsheetApiService'
import { collectClientRowIdsFromAddRowsOperations } from './spreadsheetNewRowPersistBundle'
import {
  getSpreadsheetRowRefIdentity,
  isSpreadsheetTemporaryClientRowId,
  resolveSpreadsheetRowRef
} from './spreadsheetRowIdentity'

const CELL_TARGETING_OP_TYPES = new Set(['set_cell', 'clear_cell', 'set_range', 'set_style'])

const collectUnresolvedIdentity = (
  unresolved: Set<string>,
  record: Record<string, unknown>,
  seededByAddRows: ReadonlySet<string>
): void => {
  const rowRef = resolveSpreadsheetRowRef(record.rowRef)
  const rowId = String(record.rowId ?? '')
  const identity = rowId || (rowRef ? getSpreadsheetRowRefIdentity(rowRef) : '')
  if (identity && isSpreadsheetTemporaryClientRowId(identity) && !seededByAddRows.has(identity)) {
    unresolved.add(identity)
  }
}

/**
 * Row identity must be resolved in the stabilization barrier before the work queue
 * admits a mutation. The queue orders and version-gates only — it never waits on
 * materialization (that would deadlock with barrier → queue → materialization cycles).
 */
export function findUnresolvedRowIdsInBatchOperations(operations: SpreadsheetBatchOperation[]): string[] {
  const seededByAddRows = collectClientRowIdsFromAddRowsOperations(operations)
  const unresolved = new Set<string>()
  for (const operation of operations) {
    const type = String(operation.type ?? '')
    if (!CELL_TARGETING_OP_TYPES.has(type)) {
      continue
    }
    const data = operation.data
    if (!data || typeof data !== 'object') {
      continue
    }
    const record = data as Record<string, unknown>
    collectUnresolvedIdentity(unresolved, record, seededByAddRows)
    if (type === 'set_range' || type === 'set_style') {
      const cells = record.cells
      if (!Array.isArray(cells)) {
        continue
      }
      for (const cell of cells) {
        if (!cell || typeof cell !== 'object') {
          continue
        }
        collectUnresolvedIdentity(unresolved, cell as Record<string, unknown>, seededByAddRows)
      }
    }
  }
  return [...unresolved]
}

export function assertLocalPersistIdentityBarrier(operations: SpreadsheetBatchOperation[]): void {
  const unresolved = findUnresolvedRowIdsInBatchOperations(operations)
  if (unresolved.length === 0) {
    return
  }
  throw new Error(`SheetWorkQueue: unresolved row identity held in barrier (${unresolved.slice(0, 5).join(', ')})`)
}
