import type { SpreadsheetBatchOperation } from '../services/SpreadsheetApiService'
import {
  detectTemporaryRowIdsInKnownRowIdFields,
  mapKnownSemanticRowIdFields,
  type SpreadsheetKnownRowIdFieldMatch,
  type SpreadsheetKnownRowIdFieldRemap
} from './spreadsheetUnifiedBatchSubmitUtils'
import {
  createSpreadsheetRowRefFromRowId,
  createBackendRowRef,
  isSpreadsheetClientRowRef,
  resolveSpreadsheetRowRef,
  toRowIdString
} from './spreadsheetRowIdentity'

export interface SpreadsheetBatchOperationRowRemapResult {
  operations: SpreadsheetBatchOperation[]
  remappedEntries: SpreadsheetKnownRowIdFieldRemap[]
  unresolvedTemporaryRowIdMatches: SpreadsheetKnownRowIdFieldMatch[]
  mapSize: number
  availableRemapKeys: string[]
}

/**
 * Rewrites `rowId` fields in cell persistence ops using a UI→backend map
 * (e.g. after `add_rows` materializes `client_*` ids to server UUIDs).
 */
export function remapBatchOperationsWithUiToBackendRowMap(
  operations: SpreadsheetBatchOperation[],
  uiToBackend: Map<string, string>
): SpreadsheetBatchOperationRowRemapResult {
  const { operations: remappedOperations, remappedFields } = mapKnownSemanticRowIdFields(operations, match =>
    uiToBackend.get(match.rowId)
  )
  const normalizedOperations = remappedOperations.map(operation =>
    normalizeOperationRowReference(operation, uiToBackend)
  )

  return {
    operations: normalizedOperations,
    remappedEntries: remappedFields,
    unresolvedTemporaryRowIdMatches: detectTemporaryRowIdsInKnownRowIdFields(normalizedOperations),
    mapSize: uiToBackend.size,
    availableRemapKeys: Array.from(uiToBackend.keys())
  }
}

const normalizeCellRowReference = (
  cell: Record<string, unknown>,
  uiToBackend: Map<string, string>
): Record<string, unknown> => {
  const existingRowRef = resolveSpreadsheetRowRef(cell.rowRef)
  if (existingRowRef) {
    if (existingRowRef.kind === 'clientHandle') {
      const backendRowId = uiToBackend.get(existingRowRef.clientRowId)
      if (backendRowId) {
        return {
          ...cell,
          rowId: backendRowId,
          rowRef: createBackendRowRef(backendRowId)
        }
      }
    }
    return cell
  }

  const rawRowId = toRowIdString(cell.rowId)
  if (!rawRowId) return cell

  const backendRowId = uiToBackend.get(rawRowId)
  if (backendRowId) {
    return {
      ...cell,
      rowId: backendRowId,
      rowRef: createBackendRowRef(backendRowId)
    }
  }

  const explicitRowRef = createSpreadsheetRowRefFromRowId(rawRowId)
  if (!explicitRowRef || !isSpreadsheetClientRowRef(explicitRowRef)) {
    return cell
  }

  return {
    ...cell,
    rowRef: explicitRowRef,
    rowId: undefined
  }
}

const normalizeOperationRowReference = (
  operation: SpreadsheetBatchOperation,
  uiToBackend: Map<string, string>
): SpreadsheetBatchOperation => {
  if (operation.type === 'set_range' && Array.isArray(operation.data?.cells)) {
    return {
      ...operation,
      data: {
        ...operation.data,
        cells: operation.data.cells.map(cell =>
          cell && typeof cell === 'object' && !Array.isArray(cell)
            ? normalizeCellRowReference(cell as Record<string, unknown>, uiToBackend)
            : cell
        )
      }
    }
  }

  if (
    (operation.type === 'set_cell' || operation.type === 'clear_cell') &&
    operation.data &&
    typeof operation.data === 'object'
  ) {
    return {
      ...operation,
      data: normalizeCellRowReference(operation.data as Record<string, unknown>, uiToBackend)
    }
  }

  if (operation.type === 'delete_rows' && Array.isArray(operation.data?.rowIds)) {
    const nextRowIds: string[] = []
    const rowRefs = operation.data.rowIds.flatMap(rowId => {
      const rawRowId = String(rowId ?? '')
      const backendRowId = uiToBackend.get(rawRowId)
      if (backendRowId) {
        nextRowIds.push(backendRowId)
        return [createBackendRowRef(backendRowId)]
      }
      const explicitRowRef = createSpreadsheetRowRefFromRowId(rawRowId)
      if (explicitRowRef) {
        if (explicitRowRef.kind === 'backendUuid') {
          nextRowIds.push(explicitRowRef.rowUuid)
        }
        return [explicitRowRef]
      }
      nextRowIds.push(rawRowId)
      return []
    })

    return {
      ...operation,
      data: {
        ...operation.data,
        rowIds: nextRowIds,
        rowRefs
      }
    }
  }

  if (operation.type === 'delete_rows' && Array.isArray(operation.data?.rowRefs)) {
    const nextRowIds: string[] = []
    const rowRefs = operation.data.rowRefs.flatMap(rowRefValue => {
      const rowRef = resolveSpreadsheetRowRef(rowRefValue)
      if (!rowRef) return []
      if (rowRef.kind === 'clientHandle') {
        const backendRowId = uiToBackend.get(rowRef.clientRowId)
        if (backendRowId) {
          nextRowIds.push(backendRowId)
          return [createBackendRowRef(backendRowId)]
        }
      }
      if (rowRef.kind === 'backendUuid') {
        nextRowIds.push(rowRef.rowUuid)
      }
      return [rowRef]
    })

    return {
      ...operation,
      data: {
        ...operation.data,
        rowIds: nextRowIds,
        rowRefs
      }
    }
  }

  return operation
}

/**
 * Converts row-id based mutation payloads into explicit row refs.
 * Known backend ids remain in `rowId` for compatibility, while unresolved ids move to `rowRef`.
 */
export function normalizeBatchOperationsWithRowRefs(
  operations: SpreadsheetBatchOperation[],
  uiToBackend: Map<string, string>
): SpreadsheetBatchOperation[] {
  return operations.map(operation => normalizeOperationRowReference(operation, uiToBackend))
}
