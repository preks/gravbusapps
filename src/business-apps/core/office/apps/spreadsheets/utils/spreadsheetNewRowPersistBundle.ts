import type { SpreadsheetBatchOperation } from '../services/SpreadsheetApiService'
import {
  getSpreadsheetRowRefIdentity,
  isSpreadsheetTemporaryClientRowId,
  resolveSpreadsheetRowRef
} from './spreadsheetRowIdentity'

const CELL_TARGETING_OP_TYPES = new Set(['set_cell', 'clear_cell', 'set_range'])

export const isAddRowsOnlyOperationList = (operations: readonly SpreadsheetBatchOperation[]): boolean => {
  if (operations.length === 0) return false
  for (const op of operations) {
    if (String((op as { type?: unknown }).type ?? '') !== 'add_rows') {
      return false
    }
  }
  return true
}

export const collectClientRowIdsFromAddRowsOperations = (
  operations: readonly SpreadsheetBatchOperation[]
): Set<string> => {
  const ids = new Set<string>()
  for (const operation of operations) {
    if (String(operation.type ?? '') !== 'add_rows') continue
    const rows = Array.isArray(operation.data?.rows) ? (operation.data.rows as Array<Record<string, unknown>>) : []
    for (const row of rows) {
      const explicit =
        typeof row._clientRowId === 'string'
          ? row._clientRowId.trim()
          : typeof row._id === 'string'
            ? row._id.trim()
            : ''
      if (explicit && isSpreadsheetTemporaryClientRowId(explicit)) {
        ids.add(explicit)
      }
    }
  }
  return ids
}

const collectRowIdentitiesFromCellTargetingOperation = (operation: SpreadsheetBatchOperation): string[] => {
  const type = String(operation.type ?? '')
  if (!CELL_TARGETING_OP_TYPES.has(type)) return []
  const data = operation.data
  if (!data || typeof data !== 'object') return []

  const identities: string[] = []
  const record = data as Record<string, unknown>
  const pushIdentity = (rowRecord: Record<string, unknown>) => {
    const rowRef = resolveSpreadsheetRowRef(rowRecord.rowRef)
    const rowId = String(rowRecord.rowId ?? '')
    const identity = rowId || (rowRef ? getSpreadsheetRowRefIdentity(rowRef) : '')
    if (identity) identities.push(identity)
  }

  pushIdentity(record)
  if (type === 'set_range' && Array.isArray(record.cells)) {
    for (const cell of record.cells) {
      if (!cell || typeof cell !== 'object' || Array.isArray(cell)) continue
      pushIdentity(cell as Record<string, unknown>)
    }
  }
  return identities
}

export const batchOperationOnlyReferencesSeededClientRows = (
  operation: SpreadsheetBatchOperation,
  seededClientRowIds: ReadonlySet<string>
): boolean => {
  const type = String(operation.type ?? '')
  if (!CELL_TARGETING_OP_TYPES.has(type)) return false
  const identities = collectRowIdentitiesFromCellTargetingOperation(operation)
  if (identities.length === 0) return true
  return identities.every(identity => !isSpreadsheetTemporaryClientRowId(identity) || seededClientRowIds.has(identity))
}

export const isNewRowMaterializationBundle = (operations: readonly SpreadsheetBatchOperation[]): boolean => {
  if (!operations.some(op => String(op.type ?? '') === 'add_rows')) return false
  const seeded = collectClientRowIdsFromAddRowsOperations(operations)
  for (const operation of operations) {
    const type = String(operation.type ?? '')
    if (type === 'add_rows') continue
    if (!CELL_TARGETING_OP_TYPES.has(type)) return false
    if (!batchOperationOnlyReferencesSeededClientRows(operation, seeded)) return false
  }
  return true
}

export const mergeAddRowsOperationsInPlace = (operations: SpreadsheetBatchOperation[]): SpreadsheetBatchOperation[] => {
  const addRowsOps = operations.filter(op => String(op.type ?? '') === 'add_rows')
  if (addRowsOps.length <= 1) return operations

  const otherOps = operations.filter(op => String(op.type ?? '') !== 'add_rows')
  const rowsByClientId = new Map<string, Record<string, unknown>>()
  const rowsWithoutClientId: Array<Record<string, unknown>> = []

  for (const op of addRowsOps) {
    const rows = Array.isArray(op.data?.rows) ? (op.data.rows as Array<Record<string, unknown>>) : []
    for (const row of rows) {
      const clientRowId =
        typeof row._clientRowId === 'string'
          ? row._clientRowId.trim()
          : typeof row._id === 'string'
            ? row._id.trim()
            : ''
      if (clientRowId && isSpreadsheetTemporaryClientRowId(clientRowId)) {
        rowsByClientId.set(clientRowId, row)
        continue
      }
      rowsWithoutClientId.push(row)
    }
  }

  const mergedRows = [...rowsByClientId.values(), ...rowsWithoutClientId]
  const template = addRowsOps[0]
  const mergedAddRows: SpreadsheetBatchOperation = {
    ...template,
    operationId: template.operationId,
    type: 'add_rows',
    data: { rows: mergedRows }
  }
  return [...otherOps, mergedAddRows]
}
