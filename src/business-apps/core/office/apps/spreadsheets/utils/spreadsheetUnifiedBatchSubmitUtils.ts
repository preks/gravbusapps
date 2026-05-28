import type { SpreadsheetBatchOperation } from '../services/SpreadsheetApiService'
import {
  getSpreadsheetRowRefIdentity,
  isSpreadsheetBackendRowRef,
  isSpreadsheetBackendRowUuid,
  isSpreadsheetTemporaryClientRowId,
  resolveSpreadsheetRowRef,
  toRowIdString
} from './spreadsheetRowIdentity'

/** UTF-8 byte length for JSON size estimates (Node Jest may lack global TextEncoder at module load). */
function utf8ByteLength(value: string): number {
  if (typeof globalThis.TextEncoder !== 'undefined') {
    return new globalThis.TextEncoder().encode(value).length
  }
  return Buffer.byteLength(value, 'utf8')
}

export const SPREADSHEET_UNIFIED_MUTATION_SUBMIT_MAX_BYTES = 8 * 1024 * 1024

export interface SpreadsheetKnownRowIdFieldMatch {
  operationIndex: number
  operationId: string
  operationType: string
  fieldPath: string
  rowId: string
  referenceKind: 'rowId' | 'rowRef'
}

export interface SpreadsheetSuspiciousClientIdDiagnostic {
  path: string
  value: string
}

export interface SpreadsheetKnownRowIdFieldRemap {
  operationIndex: number
  operationId: string
  operationType: string
  fieldPath: string
  fromRowId: string
  toRowId: string
}

type KnownRowIdVisitor = (match: SpreadsheetKnownRowIdFieldMatch) => void

function visitKnownRowIdFields(operations: readonly SpreadsheetBatchOperation[], visitor: KnownRowIdVisitor): void {
  operations.forEach((op, operationIndex) => {
    const operationId = String(op.operationId ?? '')
    if (op.type === 'set_range' && Array.isArray(op.data?.cells)) {
      for (const [cellIndex, cell] of op.data.cells.entries()) {
        if (!cell || typeof cell !== 'object' || Array.isArray(cell)) continue
        const rowRef = resolveSpreadsheetRowRef((cell as { rowRef?: unknown }).rowRef)
        if (rowRef) {
          visitor({
            operationIndex,
            operationId,
            operationType: op.type,
            fieldPath: `data.cells[${cellIndex}].rowRef`,
            rowId: getSpreadsheetRowRefIdentity(rowRef),
            referenceKind: 'rowRef'
          })
          continue
        }
        visitor({
          operationIndex,
          operationId,
          operationType: op.type,
          fieldPath: `data.cells[${cellIndex}].rowId`,
          rowId: toRowIdString((cell as { rowId?: unknown }).rowId),
          referenceKind: 'rowId'
        })
      }
      return
    }

    if ((op.type === 'set_cell' || op.type === 'clear_cell') && op.data && typeof op.data === 'object') {
      const rowRef = resolveSpreadsheetRowRef((op.data as { rowRef?: unknown }).rowRef)
      if (rowRef) {
        visitor({
          operationIndex,
          operationId,
          operationType: op.type,
          fieldPath: 'data.rowRef',
          rowId: getSpreadsheetRowRefIdentity(rowRef),
          referenceKind: 'rowRef'
        })
        return
      }
      visitor({
        operationIndex,
        operationId,
        operationType: op.type,
        fieldPath: 'data.rowId',
        rowId: toRowIdString((op.data as { rowId?: unknown }).rowId),
        referenceKind: 'rowId'
      })
      return
    }

    if (op.type === 'delete_rows' && Array.isArray(op.data?.rowIds)) {
      for (const [rowIndex, rowId] of op.data.rowIds.entries()) {
        visitor({
          operationIndex,
          operationId,
          operationType: op.type,
          fieldPath: `data.rowIds[${rowIndex}]`,
          rowId: String(rowId ?? ''),
          referenceKind: 'rowId'
        })
      }
    }

    if (op.type === 'delete_rows' && Array.isArray(op.data?.rowRefs)) {
      for (const [rowIndex, rowRefValue] of op.data.rowRefs.entries()) {
        const rowRef = resolveSpreadsheetRowRef(rowRefValue)
        if (!rowRef) continue
        visitor({
          operationIndex,
          operationId,
          operationType: op.type,
          fieldPath: `data.rowRefs[${rowIndex}]`,
          rowId: getSpreadsheetRowRefIdentity(rowRef),
          referenceKind: 'rowRef'
        })
      }
    }
  })
}

export function collectKnownRowIdFieldMatches(
  operations: readonly SpreadsheetBatchOperation[]
): SpreadsheetKnownRowIdFieldMatch[] {
  const matches: SpreadsheetKnownRowIdFieldMatch[] = []
  visitKnownRowIdFields(operations, match => {
    if (match.rowId !== '') {
      matches.push(match)
    }
  })
  return matches
}

/**
 * Collect `client_*` ids materialized by `add_rows` ops in the same batch.
 * A `set_range` whose `rowRef.clientHandle.clientRowId` matches one of these
 * is safe to ship: the BE applies `add_rows` before the dependent cell write
 * within the batch. Outside that case, a clientHandle must be held by the
 * readiness gate until an `add_rows` for it has been acknowledged — sending
 * it raw guarantees `unknown_client_row_handle`.
 */
function collectClientRowIdsMaterializedByBatch(operations: readonly SpreadsheetBatchOperation[]): Set<string> {
  const ids = new Set<string>()
  for (const op of operations) {
    if (op.type !== 'add_rows') continue
    const rows = (op.data as { rows?: unknown })?.rows
    if (!Array.isArray(rows)) continue
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue
      const clientRowId = (row as { _clientRowId?: unknown })._clientRowId
      if (typeof clientRowId === 'string' && clientRowId) {
        ids.add(clientRowId)
      }
    }
  }
  return ids
}

export function detectTemporaryRowIdsInKnownRowIdFields(
  operations: readonly SpreadsheetBatchOperation[],
  isTemporaryRowId: (value: string) => boolean = isSpreadsheetTemporaryClientRowId
): SpreadsheetKnownRowIdFieldMatch[] {
  const matches: SpreadsheetKnownRowIdFieldMatch[] = []
  const selfMaterializedClientRowIds = collectClientRowIdsMaterializedByBatch(operations)
  visitKnownRowIdFields(operations, match => {
    if (match.rowId === '' || !isTemporaryRowId(match.rowId)) {
      return
    }
    if (match.referenceKind === 'rowRef' && selfMaterializedClientRowIds.has(match.rowId)) {
      return
    }
    matches.push(match)
  })
  return matches
}

export function findSuspiciousClientIdsAnywhereForDiagnostics(
  operations: SpreadsheetBatchOperation[],
  isTemporaryRowId: (value: string) => boolean = isSpreadsheetTemporaryClientRowId
): SpreadsheetSuspiciousClientIdDiagnostic[] {
  const matches: SpreadsheetSuspiciousClientIdDiagnostic[] = []
  const seen = new WeakSet<object>()

  const visitValue = (value: unknown, path: string): void => {
    if (typeof value === 'string') {
      if (isTemporaryRowId(value)) {
        matches.push({ path, value })
      }
      return
    }
    if (!value || typeof value !== 'object') return
    if (seen.has(value)) return
    seen.add(value)

    if (Array.isArray(value)) {
      value.forEach((item, index) => visitValue(item, `${path}[${index}]`))
      return
    }

    Object.entries(value).forEach(([key, nested]) => {
      visitValue(nested, path ? `${path}.${key}` : key)
    })
  }

  operations.forEach((operation, operationIndex) => {
    visitValue(operation, `operations[${operationIndex}]`)
  })

  return matches
}

export function mapKnownSemanticRowIdFields(
  operations: SpreadsheetBatchOperation[],
  mapRowId: (match: SpreadsheetKnownRowIdFieldMatch) => string | undefined
): { operations: SpreadsheetBatchOperation[]; remappedFields: SpreadsheetKnownRowIdFieldRemap[] } {
  const remappedFields: SpreadsheetKnownRowIdFieldRemap[] = []

  const nextOperations = operations.map((op, operationIndex) => {
    const operationId = String(op.operationId ?? '')

    if (op.type === 'set_range' && Array.isArray(op.data?.cells)) {
      let didChange = false
      const nextCells = op.data.cells.map((cell, cellIndex) => {
        if (!cell || typeof cell !== 'object' || Array.isArray(cell)) return cell
        const currentCell = cell as Record<string, unknown>
        const fromRowId = toRowIdString(currentCell.rowId)
        const toRowId =
          mapRowId({
            operationIndex,
            operationId,
            operationType: op.type,
            fieldPath: `data.cells[${cellIndex}].rowId`,
            rowId: fromRowId,
            referenceKind: 'rowId'
          }) ?? fromRowId

        if (toRowId === fromRowId) return cell
        didChange = true
        remappedFields.push({
          operationIndex,
          operationId,
          operationType: op.type,
          fieldPath: `data.cells[${cellIndex}].rowId`,
          fromRowId,
          toRowId
        })
        return { ...currentCell, rowId: toRowId }
      })

      if (!didChange) return op
      return { ...op, data: { ...op.data, cells: nextCells } }
    }

    if ((op.type === 'set_cell' || op.type === 'clear_cell') && op.data && typeof op.data === 'object') {
      const fromRowId = toRowIdString((op.data as { rowId?: unknown }).rowId)
      const toRowId =
        mapRowId({
          operationIndex,
          operationId,
          operationType: op.type,
          fieldPath: 'data.rowId',
          rowId: fromRowId,
          referenceKind: 'rowId'
        }) ?? fromRowId

      if (toRowId === fromRowId) return op
      remappedFields.push({
        operationIndex,
        operationId,
        operationType: op.type,
        fieldPath: 'data.rowId',
        fromRowId,
        toRowId
      })
      return { ...op, data: { ...op.data, rowId: toRowId } }
    }

    if (op.type === 'delete_rows' && Array.isArray(op.data?.rowIds)) {
      let didChange = false
      const nextRowIds = op.data.rowIds.map((rowId, rowIndex) => {
        const fromRowId = String(rowId ?? '')
        const toRowId =
          mapRowId({
            operationIndex,
            operationId,
            operationType: op.type,
            fieldPath: `data.rowIds[${rowIndex}]`,
            rowId: fromRowId,
            referenceKind: 'rowId'
          }) ?? fromRowId

        if (toRowId === fromRowId) return rowId
        didChange = true
        remappedFields.push({
          operationIndex,
          operationId,
          operationType: op.type,
          fieldPath: `data.rowIds[${rowIndex}]`,
          fromRowId,
          toRowId
        })
        return toRowId
      })

      if (!didChange) return op
      return { ...op, data: { ...op.data, rowIds: nextRowIds } }
    }

    return op
  })

  return { operations: nextOperations, remappedFields }
}

export function splitBatchOperationsByApproxJsonSize(
  operations: SpreadsheetBatchOperation[],
  maxBytes: number
): SpreadsheetBatchOperation[][] {
  if (operations.length === 0) return []
  const chunks: SpreadsheetBatchOperation[][] = []
  let current: SpreadsheetBatchOperation[] = []
  let size = 0
  for (const op of operations) {
    const opSize = utf8ByteLength(JSON.stringify(op))
    if (current.length > 0 && size + opSize > maxBytes) {
      chunks.push(current)
      current = []
      size = 0
    }
    current.push(op)
    size += opSize
  }
  if (current.length > 0) chunks.push(current)
  return chunks
}

export function summarizeUnifiedBatchOperationsForDiagnostics(operations: SpreadsheetBatchOperation[]): {
  approximatePayloadBytes: number
  operationCount: number
  operationTypes: string[]
  hasNonBackendRowIdInSetRange: boolean
  temporaryRowIdCount: number
  temporaryRowIdMatches: SpreadsheetKnownRowIdFieldMatch[]
  temporaryRowIdOperationTypes: string[]
  suspiciousClientIds: SpreadsheetSuspiciousClientIdDiagnostic[]
} {
  let approximatePayloadBytes = 0
  let hasNonBackendRowIdInSetRange = false
  for (const op of operations) {
    approximatePayloadBytes += utf8ByteLength(JSON.stringify(op))
    if (op.type === 'set_range' && Array.isArray(op.data?.cells)) {
      for (const c of op.data.cells as Array<{ rowId?: unknown }>) {
        const rowRef = resolveSpreadsheetRowRef((c as { rowRef?: unknown }).rowRef)
        const id = rowRef ? getSpreadsheetRowRefIdentity(rowRef) : String(c.rowId ?? '')
        const isBackendIdentity = rowRef ? isSpreadsheetBackendRowRef(rowRef) : isSpreadsheetBackendRowUuid(id)
        if (id && !isBackendIdentity) {
          hasNonBackendRowIdInSetRange = true
          break
        }
      }
    }
  }

  const temporaryRowIdMatches = detectTemporaryRowIdsInKnownRowIdFields(operations)
  const suspiciousClientIds = findSuspiciousClientIdsAnywhereForDiagnostics(operations)

  return {
    approximatePayloadBytes,
    operationCount: operations.length,
    operationTypes: operations.map(o => o.type),
    hasNonBackendRowIdInSetRange,
    temporaryRowIdCount: temporaryRowIdMatches.length,
    temporaryRowIdMatches,
    temporaryRowIdOperationTypes: Array.from(new Set(temporaryRowIdMatches.map(match => match.operationType))),
    suspiciousClientIds
  }
}
