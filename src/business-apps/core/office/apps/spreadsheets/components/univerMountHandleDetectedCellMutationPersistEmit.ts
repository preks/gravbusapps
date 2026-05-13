import type { SpreadsheetBatchOperation } from '../services/SpreadsheetApiService'
import type { SpreadsheetStylePatch, SpreadsheetUnifiedMutationBatchPayload } from '../core'
import { buildOperationsFromMutationPlan } from '../core'
import { remapBatchOperationsWithUiToBackendRowMap } from '../utils/spreadsheetBatchOperationRowRemap'
import { buildUiToBackendRowIdMap, isSpreadsheetBackendRowUuid, type ViewerRow } from '../utils/spreadsheetRowIdentity'
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

function buildUnifiedOperationsForEmit(
  deps: UniverMountHandleDetectedCellMutationDeps,
  emit: PersistEmitInput
): SpreadsheetBatchOperation[] {
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
      const unifiedOperations =
        unifiedOpsOverride === undefined ? buildUnifiedOperationsForEmit(deps, emit) : unifiedOpsOverride

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

  const unifiedOperations = buildUnifiedOperationsForEmit(deps, emit)
  const flushSlot = deps.propsRef.current.flushUnmaterializedRowsBeforePersistRef
  const needsFlush = needsRowMaterializationFlush(emit, unifiedOperations) && Boolean(flushSlot?.current)

  if (needsFlush) {
    return (async () => {
      await deps.flushUnmaterializedRowsBeforePersist?.(emit.targetSheetId)
      const isUuid = deps.isUuidForRowRemap ?? isSpreadsheetBackendRowUuid
      const rows = getPersistRowsForRemap(deps, emit.targetSheetId)
      const uiToBackend = buildUiToBackendRowIdMap(rows as ViewerRow[], isUuid)
      const remapped = remapBatchOperationsWithUiToBackendRowMap(unifiedOperations, uiToBackend)
      return runDetectedCellMutationPersistEmitSync(deps, emit, remapped)
    })()
  }

  return runDetectedCellMutationPersistEmitSync(deps, emit, unifiedOperations)
}
