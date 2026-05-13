import type { SpreadsheetBatchOperation } from '../services/SpreadsheetApiService'
import {
  detectTemporaryRowIdsInKnownRowIdFields,
  mapKnownSemanticRowIdFields,
  type SpreadsheetKnownRowIdFieldMatch,
  type SpreadsheetKnownRowIdFieldRemap
} from './spreadsheetUnifiedBatchSubmitUtils'

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

  return {
    operations: remappedOperations,
    remappedEntries: remappedFields,
    unresolvedTemporaryRowIdMatches: detectTemporaryRowIdsInKnownRowIdFields(remappedOperations),
    mapSize: uiToBackend.size,
    availableRemapKeys: Array.from(uiToBackend.keys())
  }
}
