import type { SpreadsheetBatchOperation } from '../services/SpreadsheetApiService'
import type { SpreadsheetUnifiedMutationBatchPayload } from '../core'
import { buildOperationsFromMutationPlan } from '../core'
import {
  buildUiToBackendRowIdMapForPersist,
  normalizeBatchOperationsWithRowRefs,
  remapBatchOperationsWithUiToBackendRowMap
} from '../utils/spreadsheetBatchOperationRowRemap'
import {
  dropSetRangeCellsRedundantWithAddRows,
  dropSetRangeCellsRedundantWithMaterializedValues
} from '../utils/spreadsheetBatchOperationCellDedup'
import { buildRowIdentityDiagnostics, isSpreadsheetTemporaryClientRowId } from '../utils/spreadsheetRowIdentity'
import { resolveBackendRowUuidPredicateFromGridProps } from './univerBackendRowUuidPredicate'
import { detectTemporaryRowIdsInKnownRowIdFields } from '../utils/spreadsheetUnifiedBatchSubmitUtils'
import { debugMutationTrace } from './univerGridDebug'
import { clearSpreadsheetAutofillIntent } from './univerAutofillIntent'
import { isUnifiedMutationOperationType, normalizeBlankLikeEchoSignature } from './univerGridWorkbookMutationModule'
import { toEchoSignature } from './univerGridAuthoritativeHelpers'
import {
  protectSpreadsheetPendingLocalMutationCells,
  spreadsheetPendingLocalMutationCoordinateCellKey,
  spreadsheetPendingLocalMutationSemanticCellKey
} from '../utils/spreadsheetPendingMaterializationCells'
import { buildAddRowPayloadsFromUniverRows } from '../utils/spreadsheetViewerRows'
import { cellValuesAreEquivalentForPersist } from '../utils/spreadsheetPendingCells'
import type {
  PersistEmitInput,
  UniverMountHandleDetectedCellMutationDeps
} from './univerMountHandleDetectedCellMutation.types'

function emitHasPlannedValueWrites(emit: PersistEmitInput): boolean {
  return emit.plannedCellsFiltered.some(cell => cell.valueAction === 'set' || cell.valueAction === 'clear')
}

function countPersistableValueOperations(operations: readonly SpreadsheetBatchOperation[]): number {
  let count = 0
  for (const operation of operations) {
    if (operation.type === 'set_range' && Array.isArray(operation.data?.cells)) {
      count += operation.data.cells.length
      continue
    }
    if (operation.type === 'set_cell') {
      count += 1
      continue
    }
    if (operation.type === 'add_rows' && Array.isArray(operation.data?.rows)) {
      for (const row of operation.data.rows as Array<Record<string, unknown>>) {
        for (const key of Object.keys(row)) {
          if (!key.startsWith('_') && row[key] !== undefined) {
            count += 1
          }
        }
      }
    }
  }
  return count
}

function resolveBackendRowIdForPlannedCell(
  deps: UniverMountHandleDetectedCellMutationDeps,
  emit: PersistEmitInput,
  cell: PersistEmitInput['plannedCellsFiltered'][number],
  isUuid: (value: string) => boolean
): string {
  if (typeof cell.rowId === 'string' && isUuid(cell.rowId)) {
    return cell.rowId
  }
  const readiness = deps.propsRef.current.rowMaterializationReadinessRef?.current
  if (readiness && typeof cell.rowId === 'string' && cell.rowId) {
    return readiness.getResolvedBackendRowId(emit.targetSheetId, cell.rowId) ?? ''
  }
  return ''
}

function plannedValueWritesCoveredByMaterializedCache(
  deps: UniverMountHandleDetectedCellMutationDeps,
  emit: PersistEmitInput,
  materializedValuesByBackendRowId: Map<string, Record<string, unknown>>,
  isUuid: (value: string) => boolean
): boolean {
  const valueCells = emit.plannedCellsFiltered.filter(
    cell => cell.valueAction === 'set' || cell.valueAction === 'clear'
  )
  if (valueCells.length === 0) return false
  for (const cell of valueCells) {
    if (!cell.columnName) return false
    const backendRowId = resolveBackendRowIdForPlannedCell(deps, emit, cell, isUuid)
    if (!backendRowId) return false
    const materializedValues = materializedValuesByBackendRowId.get(backendRowId)
    if (!materializedValues || !Object.prototype.hasOwnProperty.call(materializedValues, cell.columnName)) {
      return false
    }
    const expectedValue = cell.valueAction === 'clear' ? null : cell.value
    if (!cellValuesAreEquivalentForPersist(materializedValues[cell.columnName], expectedValue)) {
      return false
    }
  }
  return true
}

function resolveOperationsAfterMaterializedValueDedup(
  deps: UniverMountHandleDetectedCellMutationDeps,
  emit: PersistEmitInput,
  preDedupOperations: SpreadsheetBatchOperation[],
  dedupResult: ReturnType<typeof dropSetRangeCellsRedundantWithMaterializedValues>,
  materializedValuesByBackendRowId: Map<string, Record<string, unknown>>,
  isUuid: (value: string) => boolean
): SpreadsheetBatchOperation[] {
  const retainedValueOpCount = countPersistableValueOperations(dedupResult.operations)
  const preDedupValueOpCount = countPersistableValueOperations(preDedupOperations)
  if (retainedValueOpCount > 0 || preDedupValueOpCount === 0 || !emitHasPlannedValueWrites(emit)) {
    return dedupResult.operations
  }
  if (plannedValueWritesCoveredByMaterializedCache(deps, emit, materializedValuesByBackendRowId, isUuid)) {
    return dedupResult.operations
  }
  // When add_rows in the same batch already seeds the typed value, suppressing set_range is correct.
  if (preDedupOperations.some(operation => operation.type === 'add_rows')) {
    const afterAddRowsDedup = dropSetRangeCellsRedundantWithAddRows(preDedupOperations)
    if (countPersistableValueOperations(afterAddRowsDedup.operations) > 0) {
      return dedupResult.operations
    }
  }
  return preDedupOperations
}

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

function getPersistColumnsForEmit(deps: UniverMountHandleDetectedCellMutationDeps, targetSheetId: string) {
  const pr = deps.propsRef.current
  if (pr.multiSheetWorkbookMode && typeof pr.getSheetContext === 'function') {
    return pr.getSheetContext(targetSheetId)?.columns ?? pr.columns
  }
  return pr.columns
}

function buildUnifiedOperationsForEmit(
  deps: UniverMountHandleDetectedCellMutationDeps,
  emit: PersistEmitInput
): SpreadsheetBatchOperation[] {
  let localOperationSequence = 0
  return buildOperationsFromMutationPlan({
    plan: emit.localMutationPlan,
    columns: getPersistColumnsForEmit(deps, emit.targetSheetId),
    createOperationId: (prefix: string) => {
      localOperationSequence += 1
      return `${prefix}_${localOperationSequence}`
    }
  })
}

function collectBackendRowIdsFromOperations(operations: SpreadsheetBatchOperation[]): string[] {
  const backendRowIds = new Set<string>()
  operations.forEach(operation => {
    if (operation.type === 'set_range' && Array.isArray(operation.data?.cells)) {
      operation.data.cells.forEach(cell => {
        if (!cell || typeof cell !== 'object' || Array.isArray(cell)) return
        const rowId = (cell as { rowId?: unknown }).rowId
        if (typeof rowId === 'string' && rowId) {
          backendRowIds.add(rowId)
        }
      })
      return
    }

    if (operation.type === 'set_cell' && operation.data && typeof operation.data === 'object') {
      const rowId = (operation.data as { rowId?: unknown }).rowId
      if (typeof rowId === 'string' && rowId) {
        backendRowIds.add(rowId)
      }
    }
  })
  return Array.from(backendRowIds)
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

function protectPlannedValueCellsFromAuthoritativeReapply(
  deps: UniverMountHandleDetectedCellMutationDeps,
  emit: PersistEmitInput
): void {
  const pendingLocalMutationCellsRef = deps.propsRef.current.pendingLocalMutationCellsRef
  if (!pendingLocalMutationCellsRef) return
  const entries = emit.plannedCellsFiltered.flatMap((cell, index) => {
    if (cell.valueAction !== 'set' && cell.valueAction !== 'clear') return []
    const expectedSignature =
      cell.valueAction === 'clear' ? 'blank' : normalizeBlankLikeEchoSignature(toEchoSignature(cell.value))
    const ownerId = `plan:${emit.mutationTraceId}:${index}:${cell.rowIndex}:${cell.colIndex}:${cell.columnName}`
    const keys = [
      spreadsheetPendingLocalMutationCoordinateCellKey(emit.targetSheetId, cell.rowIndex, cell.colIndex),
      spreadsheetPendingLocalMutationSemanticCellKey(emit.targetSheetId, cell.rowId, cell.columnName)
    ]
    return keys.map(key => ({ key, ownerId: `${ownerId}:${key}`, expectedSignature }))
  })
  if (entries.length === 0) return
  protectSpreadsheetPendingLocalMutationCells(pendingLocalMutationCellsRef, entries)

  const ownershipRegistry = deps.propsRef.current.versionCausalOwnershipRef?.current
  const intentJournal = deps.propsRef.current.spreadsheetIntentJournalRef?.current
  const baseVersion = deps.propsRef.current.resolveKnownSheetVersion?.(emit.targetSheetId) ?? 0
  for (const cell of emit.plannedCellsFiltered) {
    if (cell.valueAction !== 'set' && cell.valueAction !== 'clear') continue
    if (!cell.columnName) continue
    const logicalRowHandle = cell.rowId || `row@${cell.rowIndex}`
    ownershipRegistry?.registerIntent({
      sheetId: emit.targetSheetId,
      logicalRowHandle,
      columnName: cell.columnName,
      baseVersion
    })
    intentJournal?.captureIntent({
      sheetId: emit.targetSheetId,
      logicalRowHandle,
      columnName: cell.columnName,
      value: cell.value,
      baseVersion
    })
    if (logicalRowHandle && !isSpreadsheetTemporaryClientRowId(logicalRowHandle)) {
      ownershipRegistry?.markSubmitted(emit.targetSheetId, logicalRowHandle, cell.columnName)
    }
  }
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
  const { propsRef, callbacksRef, pendingFormattingPasteIntentRef, pendingAutofillIntentRef } = deps
  const {
    source,
    targetSheetId,
    mutationTraceId,
    plannedCellsFiltered,
    emittedChangedCells,
    hadPasteIntentForSheet,
    hadPasteFormattingIntentForSheet,
    autofillApplyType
  } = emit

  const isReadOnlyReconcileSource = source === 'selection-reconcile' || source === 'deferred-reconcile'
  if (!isReadOnlyReconcileSource) {
    protectPlannedValueCellsFromAuthoritativeReapply(deps, emit)
  }
  let handledPersistable = false
  if (!isReadOnlyReconcileSource) {
    const onMutationBatchOp = propsRef.current.onMutationBatchOp
    if (onMutationBatchOp) {
      const unifiedOperations: SpreadsheetBatchOperation[] =
        unifiedOpsOverride === undefined ? buildUnifiedOperationsForEmit(deps, emit) : (unifiedOpsOverride ?? [])

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
    } else if (emittedChangedCells.length > 0 || plannedCellsFiltered.some(cell => cell.stylePatch != null)) {
      callbacksRef.current.onDiagnosticsTraceEvent?.({
        source: 'client',
        stage: 'grid_unified_mutation_emit_missing_callback',
        severity: 'warning',
        traceId: mutationTraceId,
        payload: {
          targetSheetId,
          changedCellCount: emittedChangedCells.length,
          styleCellCount: plannedCellsFiltered.filter(cell => cell.stylePatch != null).length
        }
      })
    }
  }

  if ((hadPasteIntentForSheet || hadPasteFormattingIntentForSheet) && source === 'sheet-value-changed') {
    pendingFormattingPasteIntentRef.current = null
  }
  if (autofillApplyType != null && source === 'sheet-value-changed') {
    clearSpreadsheetAutofillIntent(pendingAutofillIntentRef, emit.targetSheetId)
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
  if (emit.source === 'selection-reconcile' || emit.source === 'deferred-reconcile') {
    return runDetectedCellMutationPersistEmitSync(deps, emit, undefined)
  }
  const onMutationBatchOp = deps.propsRef.current.onMutationBatchOp
  if (!onMutationBatchOp) {
    return runDetectedCellMutationPersistEmitSync(deps, emit, undefined)
  }

  const unifiedOperations = buildUnifiedOperationsForEmit(deps, emit)
  protectPlannedValueCellsFromAuthoritativeReapply(deps, emit)
  const temporaryRowIdMatches = detectTemporaryRowIdsInKnownRowIdFields(unifiedOperations)
  const affectedUiRowIds = Array.from(new Set(temporaryRowIdMatches.map(match => match.rowId)))
  const currentRows = getPersistRowsForRemap(deps, emit.targetSheetId)
  const targetColumns = getPersistColumnsForEmit(deps, emit.targetSheetId)
  const inlineAddRowPayloads =
    affectedUiRowIds.length === 0
      ? []
      : buildAddRowPayloadsFromUniverRows(
          currentRows.filter(row => {
            const clientRowId =
              typeof row._clientRowId === 'string' ? row._clientRowId : typeof row._id === 'string' ? row._id : ''
            return clientRowId ? affectedUiRowIds.includes(clientRowId) : false
          }),
          targetColumns
        ).sort((left, right) => Number(left._gridRowIndex ?? 0) - Number(right._gridRowIndex ?? 0))
  if (affectedUiRowIds.length > 0) {
    const isUuid = resolveBackendRowUuidPredicateFromGridProps(deps.propsRef)
    emitRowIdentityDiagnostics(deps, emit, 'grid_optimistic_row_identity_created', {
      temporaryRowIdMatches,
      rowIdentities: buildRowIdentityDiagnostics({
        uiRowIds: affectedUiRowIds,
        rows: currentRows,
        isUuid
      })
    })
  }
  const flushSlot = deps.propsRef.current.flushUnmaterializedRowsBeforePersistRef
  const needsMaterialization = needsRowMaterializationFlush(emit, unifiedOperations)
  const flushHookPresent = Boolean(flushSlot?.current) || Boolean(deps.flushUnmaterializedRowsBeforePersist)
  const needsInlineMaterializationBatch = needsMaterialization && inlineAddRowPayloads.length > 0
  const needsFlush = needsMaterialization && !needsInlineMaterializationBatch && flushHookPresent

  if (affectedUiRowIds.length > 0) {
    const isUuid = resolveBackendRowUuidPredicateFromGridProps(deps.propsRef)
    emitRowIdentityDiagnostics(deps, emit, 'grid_row_materialization_before_flush', {
      flushHookPresent,
      needsFlush,
      needsInlineMaterializationBatch,
      inlineAddRowPayloadCount: inlineAddRowPayloads.length,
      temporaryRowIdMatches,
      rowIdentities: buildRowIdentityDiagnostics({
        uiRowIds: affectedUiRowIds,
        rows: currentRows,
        isUuid
      })
    })
  }

  if (needsInlineMaterializationBatch) {
    const materializationOperation: SpreadsheetBatchOperation = {
      operationId: 'add_rows_inline_1',
      type: 'add_rows',
      data: {
        rows: inlineAddRowPayloads
      }
    }
    const normalizedOperations = normalizeBatchOperationsWithRowRefs(
      [materializationOperation, ...unifiedOperations],
      new Map()
    )
    const dedupResult = dropSetRangeCellsRedundantWithAddRows(normalizedOperations)
    if (
      dedupResult.droppedCellCount > 0 ||
      dedupResult.droppedSetRangeOpCount > 0 ||
      dedupResult.retainedMismatchedCellKeys.length > 0
    ) {
      deps.callbacksRef.current.onDiagnosticsTraceEvent?.({
        source: 'client',
        stage: 'spreadsheet.cell_emit.dedup_with_add_rows',
        traceId: emit.mutationTraceId,
        payload: {
          targetSheetId: emit.targetSheetId,
          droppedCellCount: dedupResult.droppedCellCount,
          droppedSetRangeOpCount: dedupResult.droppedSetRangeOpCount,
          droppedCellKeys: dedupResult.droppedCellKeys.slice(0, 20),
          retainedMismatchedCellCount: dedupResult.retainedMismatchedCellKeys.length,
          retainedMismatchedCellKeys: dedupResult.retainedMismatchedCellKeys.slice(0, 20),
          addRowPayloadCount: inlineAddRowPayloads.length
        }
      })
    }
    const handled = runDetectedCellMutationPersistEmitSync(deps, emit, dedupResult.operations)
    return handled
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
    deps.callbacksRef.current.onDiagnosticsTraceEvent?.({
      source: 'client',
      stage: 'spreadsheet.cell_emit.readiness_gate_start',
      traceId: emit.mutationTraceId,
      payload: {
        targetSheetId: emit.targetSheetId,
        unresolvedTemporaryRowIdCount: temporaryRowIdMatches.length,
        affectedUiRowIds
      }
    })
    return (async () => {
      const isUuid = resolveBackendRowUuidPredicateFromGridProps(deps.propsRef)
      let handled = false

      // Critical section: flush + snapshot read + remap + submit MUST run as a single
      // operation-queue task. Otherwise a concurrent processUniverDataChange (from a debounced
      // Univer data change, snapshot checkpoint, etc.) can mutate the session rows between our
      // `getPersistRowsForRemap` read and another emit's, causing one of them to remap against
      // a stale `uiToBackend` map and submit a cell op with a raw `client_*` rowId (which the
      // backend rejects). See Fix B in spreadsheet-row-write-race-fix plan.
      const buildPersistRowIdMap = (rows: Record<string, unknown>[]) => {
        const readinessResolved = new Map<string, string>()
        const readiness = deps.propsRef.current.rowMaterializationReadinessRef?.current
        if (readiness) {
          affectedUiRowIds.forEach(clientRowId => {
            const backendRowId = readiness.getResolvedBackendRowId(emit.targetSheetId, clientRowId)
            if (backendRowId) {
              readinessResolved.set(clientRowId, backendRowId)
            }
          })
        }
        return buildUiToBackendRowIdMapForPersist({
          sheetId: emit.targetSheetId,
          rows,
          isUuid,
          rowSlotIdentityRegistry: deps.propsRef.current.rowSlotIdentityRegistryRef?.current ?? null,
          readinessResolvedByClientRowId: readinessResolved
        })
      }

      const runCriticalSection = async (): Promise<void> => {
        const rows = getPersistRowsForRemap(deps, emit.targetSheetId)
        const uiToBackend = buildPersistRowIdMap(rows)
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
        // unresolved, delegate to the viewer readiness gate (awaits `insert_row_slots`, etc.).
        if (remapResult.unresolvedTemporaryRowIdMatches.length > 0) {
          // 1b: After flush, if any operation still references a temp `client_*` rowId, never
          // submit it raw (backend rejects with `invalid_row_ref`). Re-read the rows once — the
          // materialization writes may have just landed — and try again. If still unresolved,
          // hand off to `onMutationBatchOp` so SpreadsheetAppViewer can await readiness.
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
          const uiToBackendRetry = buildPersistRowIdMap(rowsRetry)
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
              stage: 'spreadsheet.cell_emit.defer_to_viewer_readiness_gate',
              severity: 'warning',
              sheetId: emit.targetSheetId,
              traceId: emit.mutationTraceId,
              payload: {
                targetSheetId: emit.targetSheetId,
                unresolvedCount: remapRetry.unresolvedTemporaryRowIdMatches.length,
                unresolvedTemporaryRowIdMatches: remapRetry.unresolvedTemporaryRowIdMatches
              }
            })
            console.warn('[SPREADSHEET_PERSIST] emit_dispatch: defer_to_viewer_readiness_gate', {
              targetSheetId: emit.targetSheetId,
              traceId: emit.mutationTraceId,
              unresolvedCount: remapRetry.unresolvedTemporaryRowIdMatches.length,
              unresolvedTemporaryRowIdMatches: remapRetry.unresolvedTemporaryRowIdMatches
            })
            handled = runDetectedCellMutationPersistEmitSync(deps, emit, unifiedOperations)
            return
          }
        }

        const rowMaterializationReadiness = deps.propsRef.current.rowMaterializationReadinessRef?.current
        const materializedValuesByBackendRowId = new Map<string, Record<string, unknown>>()
        if (rowMaterializationReadiness) {
          collectBackendRowIdsFromOperations(remapResult.operations).forEach(rowId => {
            const materializedValues = rowMaterializationReadiness.getMaterializedValuesByBackendRowId(
              emit.targetSheetId,
              rowId
            )
            if (materializedValues) {
              materializedValuesByBackendRowId.set(rowId, materializedValues)
            }
          })
        }
        const dedupResult = dropSetRangeCellsRedundantWithMaterializedValues(
          remapResult.operations,
          materializedValuesByBackendRowId
        )
        if (
          dedupResult.droppedCellCount > 0 ||
          dedupResult.droppedSetRangeOpCount > 0 ||
          dedupResult.retainedMismatchedCellKeys.length > 0
        ) {
          deps.callbacksRef.current.onDiagnosticsTraceEvent?.({
            source: 'client',
            stage: 'spreadsheet.cell_emit.dedup_with_materialized_values',
            traceId: emit.mutationTraceId,
            payload: {
              targetSheetId: emit.targetSheetId,
              droppedCellCount: dedupResult.droppedCellCount,
              droppedSetRangeOpCount: dedupResult.droppedSetRangeOpCount,
              droppedCellKeys: dedupResult.droppedCellKeys.slice(0, 20),
              retainedMismatchedCellCount: dedupResult.retainedMismatchedCellKeys.length,
              retainedMismatchedCellKeys: dedupResult.retainedMismatchedCellKeys.slice(0, 20),
              materializedValueRowCount: materializedValuesByBackendRowId.size
            }
          })
        }
        const operationsToEmit = resolveOperationsAfterMaterializedValueDedup(
          deps,
          emit,
          remapResult.operations,
          dedupResult,
          materializedValuesByBackendRowId,
          isUuid
        )
        if (
          operationsToEmit.length === 0 &&
          countPersistableValueOperations(remapResult.operations) > 0 &&
          materializedValuesByBackendRowId.size > 0
        ) {
          // All value writes were already covered by materialized row values.
        }
        handled = runDetectedCellMutationPersistEmitSync(deps, emit, operationsToEmit)
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

  const handled = runDetectedCellMutationPersistEmitSync(deps, emit, unifiedOperations)
  return handled
}
