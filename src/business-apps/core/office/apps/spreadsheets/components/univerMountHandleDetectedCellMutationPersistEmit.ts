import type { SpreadsheetBatchOperation } from '../services/SpreadsheetApiService'
import type { SpreadsheetStylePatch, SpreadsheetUnifiedMutationBatchPayload } from '../core'
import { buildOperationsFromMutationPlan } from '../core'
import { remapBatchOperationsWithUiToBackendRowMap } from '../utils/spreadsheetBatchOperationRowRemap'
import {
  buildRowIdentityDiagnostics,
  buildUiToBackendRowIdMap,
  isSpreadsheetBackendRowUuid
} from '../utils/spreadsheetRowIdentity'
import { detectTemporaryRowIdsInKnownRowIdFields } from '../utils/spreadsheetUnifiedBatchSubmitUtils'
import { MAX_INDIVIDUAL_CLEAR_CELL_OPS } from '../utils/spreadsheetViewerRows'
import { debugMutationTrace } from './univerGridDebug'
import { isUnifiedMutationOperationType } from './univerGridWorkbookMutationModule'
import type {
  PersistEmitInput,
  UniverMountHandleDetectedCellMutationDeps
} from './univerMountHandleDetectedCellMutation.types'

function getPersistRowsForRemap(
  deps: UniverMountHandleDetectedCellMutationDeps,
  targetSheetId: string
): Record<string, unknown>[] {
  if (deps.getPersistSheetRowsSnapshot) {
    return deps.getPersistSheetRowsSnapshot(targetSheetId)
  }
  const pr = deps.propsRef.current
  if (pr.multiSheetWorkbookMode && typeof pr.getSheetContext === 'function') {
    return pr.getSheetContext(targetSheetId)?.data ?? pr.data
  }
  return pr.data
}

function buildUnifiedOperationsForEmit(emit: PersistEmitInput): SpreadsheetBatchOperation[] {
  let localOperationSequence = 0
  return buildOperationsFromMutationPlan({
    plan: emit.localMutationPlan,
    createOperationId: (prefix: string) => {
      localOperationSequence += 1
      return `${prefix}_${localOperationSequence}`
    },
    maxIndividualClearCellOps: MAX_INDIVIDUAL_CLEAR_CELL_OPS
  })
}

function needsRowMaterializationFlush(emit: PersistEmitInput, unifiedOperations: SpreadsheetBatchOperation[]): boolean {
  if (unifiedOperations.length === 0) return false
  return (
    emit.materializeRowsBeforeEmit ||
    emit.plannedCellsFiltered.some(
      cell =>
        (cell.valueAction === 'set' || cell.valueAction === 'clear' || cell.stylePatch != null) &&
        !isSpreadsheetBackendRowUuid(cell.rowId)
    )
  )
}

function emitRowIdentityDiagnostics(
  deps: UniverMountHandleDetectedCellMutationDeps,
  emit: PersistEmitInput,
  stage: string,
  payload: Record<string, unknown>
): void {
  deps.callbacksRef.current.onDiagnosticsTraceEvent?.({
    source: 'client',
    stage,
    traceId: emit.mutationTraceId,
    payload: {
      targetSheetId: emit.targetSheetId,
      ...payload
    }
  })
}

/**
 * Synchronous persist emit. When `unifiedOpsOverride` is set (post-flush remap path), uses it instead of rebuilding.
 */
export function runDetectedCellMutationPersistEmitSync(
  deps: UniverMountHandleDetectedCellMutationDeps,
  emit: PersistEmitInput,
  unifiedOpsOverride?: SpreadsheetBatchOperation[] | null
): boolean {
  const { propsRef, callbacksRef, pendingFormattingPasteIntentRef } = deps
  const {
    source,
    targetSheetId,
    mutationTraceId,
    plannedCellsFiltered,
    emittedChangedCells,
    planStyles,
    hadPasteIntentForSheet,
    hadPasteFormattingIntentForSheet
  } = emit

  let handledPersistable = false
  if (source !== 'selection-reconcile') {
    const onMutationBatchOp = propsRef.current.onMutationBatchOp
    if (onMutationBatchOp) {
      const unifiedOperations: SpreadsheetBatchOperation[] =
        unifiedOpsOverride === undefined ? buildUnifiedOperationsForEmit(emit) : (unifiedOpsOverride ?? [])

      if (unifiedOperations.length > 0) {
        const operations: SpreadsheetUnifiedMutationBatchPayload['operations'] = []
        for (const operation of unifiedOperations) {
          if (!isUnifiedMutationOperationType(operation.type)) continue
          operations.push({
            type: operation.type,
            data: operation.data
          })
        }
        if (operations.length > 0) {
          const operationTypes = operations.map(operation => operation.type)
          debugMutationTrace('unified-emit', {
            traceId: mutationTraceId,
            sheetId: targetSheetId,
            operationCount: operations.length,
            operationTypes: operationTypes.join('|')
          })
          callbacksRef.current.onDiagnosticsTraceEvent?.({
            source: 'client',
            stage: 'grid_unified_mutation_emit',
            traceId: mutationTraceId,
            payload: {
              targetSheetId,
              operationCount: operations.length,
              operationTypes
            }
          })
          onMutationBatchOp({
            sheetId: targetSheetId,
            traceId: mutationTraceId,
            operations
          })
          handledPersistable = true
        }
      }
    } else {
      const { onCellsChange: onCellsChangeLegacy, onCellChange: onCellChangeLegacy } = callbacksRef.current
      if (emittedChangedCells.length > 0) {
        const tracedCells = emittedChangedCells.map(cell => ({
          ...cell,
          sheetId: targetSheetId,
          traceId: mutationTraceId
        }))
        if (onCellsChangeLegacy) {
          onCellsChangeLegacy(tracedCells)
          handledPersistable = true
        } else if (onCellChangeLegacy) {
          for (const cell of tracedCells) {
            onCellChangeLegacy(cell.rowId, cell.columnName, cell.value, targetSheetId)
          }
          handledPersistable = true
        }
      }
      const styleBatchCells = plannedCellsFiltered
        .filter(cell => cell.stylePatch != null)
        .map(cell => ({
          row: cell.rowIndex,
          col: cell.colIndex,
          stylePatch: cell.stylePatch as SpreadsheetStylePatch
        }))
      if (styleBatchCells.length > 0 && propsRef.current.onStyleBatchOp) {
        propsRef.current.onStyleBatchOp({
          sheetId: targetSheetId,
          traceId: mutationTraceId,
          styles: planStyles,
          cells: styleBatchCells
        })
        handledPersistable = true
      }
    }
  }

  if ((hadPasteIntentForSheet || hadPasteFormattingIntentForSheet) && source === 'sheet-value-changed') {
    pendingFormattingPasteIntentRef.current = null
  }

  return handledPersistable
}

/**
 * When new rows use `client_*` ids, flush `add_rows` before HTTP batch and remap operation row ids.
 * Otherwise returns a synchronous boolean (same-tick `onMutationBatchOp`) so tests and callers stay predictable.
 */
export function runDetectedCellMutationPersistEmitDispatch(
  deps: UniverMountHandleDetectedCellMutationDeps,
  emit: PersistEmitInput
): boolean | Promise<boolean> {
  if (emit.source === 'selection-reconcile') {
    return runDetectedCellMutationPersistEmitSync(deps, emit, undefined)
  }
  const onMutationBatchOp = deps.propsRef.current.onMutationBatchOp
  if (!onMutationBatchOp) {
    return runDetectedCellMutationPersistEmitSync(deps, emit, undefined)
  }

  const unifiedOperations = buildUnifiedOperationsForEmit(emit)
  const temporaryRowIdMatches = detectTemporaryRowIdsInKnownRowIdFields(unifiedOperations)
  const affectedUiRowIds = Array.from(new Set(temporaryRowIdMatches.map(match => match.rowId)))
  if (affectedUiRowIds.length > 0) {
    const isUuid = deps.isUuidForRowRemap ?? isSpreadsheetBackendRowUuid
    const optimisticRows = getPersistRowsForRemap(deps, emit.targetSheetId)
    emitRowIdentityDiagnostics(deps, emit, 'grid_optimistic_row_identity_created', {
      temporaryRowIdMatches,
      rowIdentities: buildRowIdentityDiagnostics({
        uiRowIds: affectedUiRowIds,
        rows: optimisticRows,
        isUuid
      })
    })
  }
  const flushSlot = deps.propsRef.current.flushUnmaterializedRowsBeforePersistRef
  const needsFlush = needsRowMaterializationFlush(emit, unifiedOperations) && Boolean(flushSlot?.current)

  if (affectedUiRowIds.length > 0) {
    const isUuid = deps.isUuidForRowRemap ?? isSpreadsheetBackendRowUuid
    const rowsBeforeFlush = getPersistRowsForRemap(deps, emit.targetSheetId)
    emitRowIdentityDiagnostics(deps, emit, 'grid_row_materialization_before_flush', {
      flushHookPresent: Boolean(flushSlot?.current),
      needsFlush,
      temporaryRowIdMatches,
      rowIdentities: buildRowIdentityDiagnostics({
        uiRowIds: affectedUiRowIds,
        rows: rowsBeforeFlush,
        isUuid
      })
    })
  }

  if (needsFlush) {
    return (async () => {
      await deps.flushUnmaterializedRowsBeforePersist?.(emit.targetSheetId)
      const isUuid = deps.isUuidForRowRemap ?? isSpreadsheetBackendRowUuid
      const rows = getPersistRowsForRemap(deps, emit.targetSheetId)
      const uiToBackend = buildUiToBackendRowIdMap(rows, isUuid)
      const remapResult = remapBatchOperationsWithUiToBackendRowMap(unifiedOperations, uiToBackend)

      if (affectedUiRowIds.length > 0) {
        emitRowIdentityDiagnostics(deps, emit, 'grid_row_identity_after_remap_map_build', {
          mapSize: remapResult.mapSize,
          availableRemapKeys: remapResult.availableRemapKeys.slice(0, 20),
          remappedEntries: remapResult.remappedEntries,
          unresolvedTemporaryRowIdMatches: remapResult.unresolvedTemporaryRowIdMatches,
          rowIdentities: buildRowIdentityDiagnostics({
            uiRowIds: affectedUiRowIds,
            rows,
            uiToBackend,
            isUuid
          })
        })
      }

      return runDetectedCellMutationPersistEmitSync(deps, emit, remapResult.operations)
    })()
  }

  return runDetectedCellMutationPersistEmitSync(deps, emit, unifiedOperations)
}
