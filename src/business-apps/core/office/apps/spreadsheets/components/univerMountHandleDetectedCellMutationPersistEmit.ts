import type { SpreadsheetBatchOperation } from '../services/SpreadsheetApiService'
import type { SpreadsheetStylePatch, SpreadsheetUnifiedMutationBatchPayload } from '../core'
import { buildOperationsFromMutationPlan } from '../core'
import { remapBatchOperationsWithUiToBackendRowMap } from '../utils/spreadsheetBatchOperationRowRemap'
import {
  buildRowIdentityDiagnostics,
  buildUiToBackendRowIdMap,
  isSpreadsheetTemporaryClientRowId
} from '../utils/spreadsheetRowIdentity'
import { resolveBackendRowUuidPredicateFromGridProps } from './univerBackendRowUuidPredicate'
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
  // 1a invariant: persistence must never submit unresolved temporary row ids (`client_*`).
  // Materialization is required when the host explicitly asked for it, OR a planned cell
  // carries a temporary client row id that the backend would reject. Custom non-UUID row ids
  // that hosts use intentionally (e.g. project-specific persisted identifiers) are NOT
  // temporary — only the `client_*` shape triggers materialization here.
  return (
    emit.materializeRowsBeforeEmit ||
    emit.plannedCellsFiltered.some(
      cell =>
        (cell.valueAction === 'set' || cell.valueAction === 'clear' || cell.stylePatch != null) &&
        typeof cell.rowId === 'string' &&
        isSpreadsheetTemporaryClientRowId(cell.rowId)
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

// Rate-limit per (workbook|worksheet|errorCode) to avoid log floods if a host integration is
// permanently misconfigured. We only need one warning per minute per host scope to keep the
// signal visible without burying other logs.
const MISSING_FLUSH_WARN_INTERVAL_MS = 60_000
const lastMissingFlushWarnAtByKey = new Map<string, number>()

function shouldEmitMissingFlushWarning(scopeKey: string, now: number): boolean {
  const last = lastMissingFlushWarnAtByKey.get(scopeKey)
  if (last !== undefined && now - last < MISSING_FLUSH_WARN_INTERVAL_MS) return false
  lastMissingFlushWarnAtByKey.set(scopeKey, now)
  return true
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
    const isUuid = resolveBackendRowUuidPredicateFromGridProps(deps.propsRef)
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
  const needsMaterialization = needsRowMaterializationFlush(emit, unifiedOperations)
  const flushHookPresent = Boolean(flushSlot?.current) || Boolean(deps.flushUnmaterializedRowsBeforePersist)
  const needsFlush = needsMaterialization && flushHookPresent

  if (affectedUiRowIds.length > 0) {
    const isUuid = resolveBackendRowUuidPredicateFromGridProps(deps.propsRef)
    const rowsBeforeFlush = getPersistRowsForRemap(deps, emit.targetSheetId)
    emitRowIdentityDiagnostics(deps, emit, 'grid_row_materialization_before_flush', {
      flushHookPresent,
      needsFlush,
      temporaryRowIdMatches,
      rowIdentities: buildRowIdentityDiagnostics({
        uiRowIds: affectedUiRowIds,
        rows: rowsBeforeFlush,
        isUuid
      })
    })
  }

  // 1a: Row materialization is required but the host did not wire a flush dependency. We must
  // NOT silently bypass the operation queue — that is the exact race that drops cells under
  // concurrent emits. Leave the cell in the pending journal (handled = false), warn (rate
  // limited per host scope), and emit telemetry so the missing wiring is observable.
  if (needsMaterialization && !flushHookPresent) {
    const errorCode = 'cell_emit_missing_flush_dependency'
    const hadTempRowIds = affectedUiRowIds.length > 0
    const rateLimitKey = `${emit.targetSheetId}|${errorCode}`
    if (shouldEmitMissingFlushWarning(rateLimitKey, Date.now())) {
      console.warn('[SPREADSHEET_PERSIST] emit_dispatch: missing_flush_dependency', {
        errorCode,
        worksheetId: emit.targetSheetId,
        commandId: emit.commandId,
        affectedUiRowIds,
        hadTempRowIds,
        traceId: emit.mutationTraceId
      })
    }
    deps.callbacksRef.current.onDiagnosticsTraceEvent?.({
      source: 'client',
      stage: 'spreadsheet.cell_emit.missing_flush_dependency',
      severity: 'error',
      sheetId: emit.targetSheetId,
      traceId: emit.mutationTraceId,
      payload: {
        errorCode,
        worksheetId: emit.targetSheetId,
        commandId: emit.commandId,
        affectedUiRowIds,
        hadTempRowIds
      }
    })
    return false
  }

  if (needsFlush) {
    return (async () => {
      const isUuid = resolveBackendRowUuidPredicateFromGridProps(deps.propsRef)
      let handled = false

      // Critical section: flush + snapshot read + remap + submit MUST run as a single
      // operation-queue task. Otherwise a concurrent processUniverDataChange (from a debounced
      // Univer data change, snapshot checkpoint, etc.) can mutate the session rows between our
      // `getPersistRowsForRemap` read and another emit's, causing one of them to remap against
      // a stale `uiToBackend` map and submit a cell op with a raw `client_*` rowId (which the
      // backend rejects). See Fix B in spreadsheet-row-write-race-fix plan.
      const runCriticalSection = async (): Promise<void> => {
        const rows = getPersistRowsForRemap(deps, emit.targetSheetId)
        const uiToBackend = buildUiToBackendRowIdMap(rows, isUuid)
        let remapResult = remapBatchOperationsWithUiToBackendRowMap(unifiedOperations, uiToBackend)

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

        // Fix C: If any operation still references a temp `client_*` rowId after the first remap,
        // do NOT submit it raw (backend would reject with `invalid_row_ref`). Re-read the rows
        // (the materialization writes may have just landed) and try once more. If still
        // unresolved, log and bail so the cell stays in the pending journal for the next flush.
        if (remapResult.unresolvedTemporaryRowIdMatches.length > 0) {
          // 1b: After flush, if any operation still references a temp `client_*` rowId, never
          // submit it raw (backend rejects with `invalid_row_ref`). Re-read the rows once — the
          // materialization writes may have just landed — and try again. If still unresolved,
          // bail so the cell stays in the pending journal for the next flush cycle.
          deps.callbacksRef.current.onDiagnosticsTraceEvent?.({
            source: 'client',
            stage: 'spreadsheet.cell_emit.unresolved_temp_id_retry',
            severity: 'warning',
            sheetId: emit.targetSheetId,
            traceId: emit.mutationTraceId,
            payload: {
              targetSheetId: emit.targetSheetId,
              unresolvedCount: remapResult.unresolvedTemporaryRowIdMatches.length
            }
          })
          const rowsRetry = getPersistRowsForRemap(deps, emit.targetSheetId)
          const uiToBackendRetry = buildUiToBackendRowIdMap(rowsRetry, isUuid)
          const remapRetry = remapBatchOperationsWithUiToBackendRowMap(unifiedOperations, uiToBackendRetry)
          if (remapRetry.unresolvedTemporaryRowIdMatches.length === 0) {
            remapResult = remapRetry
          } else {
            emitRowIdentityDiagnostics(deps, emit, 'grid_row_identity_unresolved_after_retry', {
              mapSize: remapRetry.mapSize,
              availableRemapKeys: remapRetry.availableRemapKeys.slice(0, 20),
              unresolvedTemporaryRowIdMatches: remapRetry.unresolvedTemporaryRowIdMatches
            })
            deps.callbacksRef.current.onDiagnosticsTraceEvent?.({
              source: 'client',
              stage: 'spreadsheet.cell_emit.unresolved_temp_id_bail',
              severity: 'error',
              sheetId: emit.targetSheetId,
              traceId: emit.mutationTraceId,
              payload: {
                targetSheetId: emit.targetSheetId,
                unresolvedCount: remapRetry.unresolvedTemporaryRowIdMatches.length,
                unresolvedTemporaryRowIdMatches: remapRetry.unresolvedTemporaryRowIdMatches
              }
            })
            console.warn('[SPREADSHEET_PERSIST] emit_dispatch: unresolved_temporary_row_id_after_retry', {
              targetSheetId: emit.targetSheetId,
              traceId: emit.mutationTraceId,
              unresolvedCount: remapRetry.unresolvedTemporaryRowIdMatches.length,
              unresolvedTemporaryRowIdMatches: remapRetry.unresolvedTemporaryRowIdMatches
            })
            handled = false
            return
          }
        }

        handled = runDetectedCellMutationPersistEmitSync(deps, emit, remapResult.operations)
        if (!handled && remapResult.unresolvedTemporaryRowIdMatches.length > 0) {
          console.warn('[SPREADSHEET_PERSIST] emit_dispatch: post_flush_persist_false', {
            targetSheetId: emit.targetSheetId,
            traceId: emit.mutationTraceId,
            unresolvedTemporaryRowIdMatches: remapResult.unresolvedTemporaryRowIdMatches
          })
        }
      }

      // Critical section runs inside the same queue task as the flush. The `needsMaterialization
      // && !flushHookPresent` branch above guarantees a flush dep exists when we reach here.
      const flushImpl =
        deps.flushUnmaterializedRowsBeforePersist ??
        deps.propsRef.current.flushUnmaterializedRowsBeforePersistRef?.current
      if (!flushImpl) {
        // Defense in depth: 1a's gate should make this unreachable.
        return false
      }
      await flushImpl(emit.targetSheetId, runCriticalSection)

      return handled
    })()
  }

  return runDetectedCellMutationPersistEmitSync(deps, emit, unifiedOperations)
}
