import { createSpreadsheetTraceId } from '../services/spreadsheetDiagnostics'
import {
  buildAuthoritativeMutationEnvelope,
  resolveSpreadsheetLocalMutationIntent,
  applyAutofillMutationCellPolicy,
  type SpreadsheetLocalMutationIntent
} from './univerMutationPlanner'
import { autofillApplyTypeKeepsValueWrites, clearSpreadsheetAutofillIntent } from './univerAutofillIntent'
import { debugMutationTrace } from './univerGridDebug'
import { resolveBackendRowUuidPredicateFromGridProps } from './univerBackendRowUuidPredicate'
import { remoteEchoKey, toEchoSignature, getSpreadsheetRowAtUniverGridIndex } from './univerGridAuthoritativeHelpers'
import { resolveBackendRowIdForViewerRow } from '../utils/spreadsheetRowIdentity'
import { readSpreadsheetRowCellValue } from '../core'
import {
  spreadsheetPendingLocalMutationCoordinateCellKey,
  spreadsheetPendingLocalMutationSemanticCellKey
} from '../utils/spreadsheetPendingMaterializationCells'
import {
  buildUnifiedPlannerMutationSignature,
  countCellMatrixEntries,
  isPersistableCellDataMutationValue,
  isRegionReplaceStyleCollaborationCommand,
  normalizeBlankLikeEchoSignature,
  summarizeCellMatrixForDebug
} from './univerGridWorkbookMutationModule'
import { buildSpreadsheetLocalCellPaintGuard, isGridCellLocallyOwned } from '../utils/spreadsheetLocalCellPaintGuard'
import { getCommandKind } from './univerCommandClassification'
import type {
  DetectedCellMutationReady,
  PersistEmitInput,
  PersistPlanPhaseResult,
  UniverMountHandleDetectedCellMutationDeps
} from './univerMountHandleDetectedCellMutation.types'

export function runDetectedCellMutationPersistPlanPhase(
  deps: UniverMountHandleDetectedCellMutationDeps,
  ready: DetectedCellMutationReady
): PersistPlanPhaseResult {
  const {
    callbacksRef,
    contextRef,
    lastCellValueMutationAtRef,
    lastSyncedGridCellSignaturesRef,
    recentLocalMutationSignaturesRef,
    getWorkbookSnapshotRef,
    pendingFormattingPasteIntentRef,
    pendingAutofillIntentRef
  } = deps

  const {
    now,
    source,
    commandId,
    targetSheetId,
    contextOwnedByHost,
    cellValue,
    ctxBefore,
    contextColumns,
    currentData,
    resolveStableRowTarget,
    resolveStableColumnName,
    rowIdentityStructureHealthy,
    rowIdentityStructuralMismatch,
    columnIdentityStructureHealthy,
    columnIdentityStructuralMismatch,
    hadPasteIntentForSheet,
    hadPasteFormattingIntentForSheet,
    autofillApplyType,
    disableMixedValueStylePayloads,
    preserveUndefinedAsNull,
    explicitPayloadAbsoluteCellValue,
    worksheetCellValue,
    workbookSnapshotCellValue,
    payloadCellValue,
    ranges,
    shouldSuppress,
    pendingNewRowsUpdate,
    liveMergeRanges
  } = ready

  lastCellValueMutationAtRef.current = now
  const { onDataChange: onDataChangeCb } = callbacksRef.current

  const pendingNewRowsCtx = pendingNewRowsUpdate?.nextContext ?? ctxBefore
  const pendingNewRowCount = pendingNewRowsUpdate
    ? Math.max(0, pendingNewRowsUpdate.nextData.length - currentData.length)
    : 0
  const createsNewRows = pendingNewRowCount > 0

  const mutatedCellCount = countCellMatrixEntries(cellValue)
  const allowValueCarryingStylePayloads = false
  const hasPersistableMutation = Object.values(cellValue).some(rowCells => {
    if (!rowCells || typeof rowCells !== 'object') return false
    return Object.values(rowCells).some(cell => isPersistableCellDataMutationValue(cell))
  })
  const replaceRangeStyleIntent =
    hadPasteFormattingIntentForSheet || isRegionReplaceStyleCollaborationCommand(commandId)
  const pasteIntoNewRows =
    createsNewRows &&
    hasPersistableMutation &&
    source === 'sheet-value-changed' &&
    (hadPasteIntentForSheet || hadPasteFormattingIntentForSheet)
  const autofillIntoNewRows =
    createsNewRows &&
    hasPersistableMutation &&
    source === 'sheet-value-changed' &&
    autofillApplyType != null &&
    autofillApplyTypeKeepsValueWrites(autofillApplyType)

  const mutationTraceId = createSpreadsheetTraceId('grid_mutation')

  const authoritativeIntent: SpreadsheetLocalMutationIntent = resolveSpreadsheetLocalMutationIntent({
    hasPersistableMutation,
    allowValueCarryingStylePayloads,
    commandId: String(commandId ?? ''),
    mergedCellValue: cellValue,
    replaceRangeStyleIntent,
    pasteIntoNewRows,
    autofillApplyType
  })

  const localCellPaintGuard = buildSpreadsheetLocalCellPaintGuard({
    sheetId: targetSheetId,
    rows: currentData,
    columns: contextColumns,
    versionCausalOwnershipRef: deps.propsRef.current.versionCausalOwnershipRef,
    pendingLocalMutationCellsRef: deps.propsRef.current.pendingLocalMutationCellsRef,
    resolveKnownSheetVersion: deps.propsRef.current.resolveKnownSheetVersion
  })
  const wasRecentlyLocallyMutated = (globalRowIndex: number, globalColIndex: number): boolean =>
    isGridCellLocallyOwned(localCellPaintGuard, globalRowIndex, globalColIndex)

  const getAuthoritativeSignatureForCell = (globalRowIndex: number, globalColIndex: number): string | undefined => {
    return lastSyncedGridCellSignaturesRef.current.get(remoteEchoKey(globalRowIndex, globalColIndex))
  }

  const isReadOnlyReconcileSource = source === 'selection-reconcile' || source === 'deferred-reconcile'
  const userInitiatedValueClear =
    !isReadOnlyReconcileSource && (getCommandKind(commandId) === 'clearLike' || Boolean(preserveUndefinedAsNull))
  // Read-only reconcile confirms grid vs session; it never persists. Skipping
  // `getWorkbookSnapshot()` avoids Univer `save()` + structured-clone of the
  // entire workbook per deferred cell (the dominant CPU cost under collab).
  // `deferred-replay` also skips snapshot capture for the same perf reason but still persists.
  const skipWorkbookSnapshotForPlanner = isReadOnlyReconcileSource || source === 'deferred-replay'
  const workbookSnapshotForPlanner = skipWorkbookSnapshotForPlanner
    ? null
    : (getWorkbookSnapshotRef.current?.() ?? null)

  const isUuidForRowPersist = resolveBackendRowUuidPredicateFromGridProps(deps.propsRef)
  const isRowPersistedAtGridIndex = (globalRowIndex: number): boolean => {
    const row = getSpreadsheetRowAtUniverGridIndex(currentData, globalRowIndex)
    if (!row) return false
    return Boolean(resolveBackendRowIdForViewerRow(row, isUuidForRowPersist))
  }
  const persistedBaselineRows = deps.getPersistedBaselineRowsSnapshot?.(targetSheetId) ?? null
  const persistedBaselineVisibleColumns = contextColumns.filter(column => column.isVisible !== false)
  const getPersistedSignatureForCell = (globalRowIndex: number, globalColIndex: number): string | undefined => {
    if (!persistedBaselineRows) return undefined
    const baselineRow = getSpreadsheetRowAtUniverGridIndex(persistedBaselineRows, globalRowIndex)
    const baselineColumn = persistedBaselineVisibleColumns[globalColIndex]
    if (!baselineRow || !baselineColumn) return undefined
    return normalizeBlankLikeEchoSignature(toEchoSignature(readSpreadsheetRowCellValue(baselineRow, baselineColumn)))
  }
  const isCellStillPendingLocalAck = (
    rowIndex: number,
    colIndex: number,
    rowId: string,
    columnName: string,
    nextSignature: string
  ): boolean => {
    const pendingLocalMutationCells = deps.propsRef.current.pendingLocalMutationCellsRef?.current
    if (!pendingLocalMutationCells) return false
    const coordinateKey = spreadsheetPendingLocalMutationCoordinateCellKey(targetSheetId, rowIndex, colIndex)
    const semanticKey = spreadsheetPendingLocalMutationSemanticCellKey(targetSheetId, rowId, columnName)
    if (!pendingLocalMutationCells.has(coordinateKey) && !pendingLocalMutationCells.has(semanticKey)) {
      return false
    }
    const persistedSignature = getPersistedSignatureForCell(rowIndex, colIndex)
    return typeof persistedSignature !== 'string' || persistedSignature !== nextSignature
  }

  const authoritativeEnvelope = buildAuthoritativeMutationEnvelope({
    sheetId: targetSheetId,
    traceId: mutationTraceId,
    intent: authoritativeIntent,
    currentData,
    contextColumns,
    ctx: pendingNewRowsCtx,
    resolveStableRowTarget,
    resolveStableColumnName,
    wasRecentlyLocallyMutated,
    getAuthoritativeSignatureForCell,
    isRowPersistedAtGridIndex,
    getPersistedSignatureForCell,
    ranges,
    explicitPayloadAbsoluteCellValue,
    worksheetCellValue,
    mergedCellValue: cellValue,
    workbookSnapshot: workbookSnapshotForPlanner,
    allowValueCarryingStylePayloads,
    autofillApplyType,
    replaceRangeStyleIntent: replaceRangeStyleIntent || pasteIntoNewRows || autofillIntoNewRows,
    shouldSuppress,
    allowRecentlyLocalBlankClear: source !== 'deferred-replay' || preserveUndefinedAsNull,
    userInitiatedValueClear,
    mutationCommandId: commandId ?? '',
    liveMergeRanges: liveMergeRanges ?? undefined
  })

  let plannedCellsFiltered = applyAutofillMutationCellPolicy({
    cells:
      authoritativeEnvelope.plan?.cells.filter(cell => cell.valueAction !== 'none' || cell.stylePatch != null) ?? [],
    intent: authoritativeIntent,
    replaceRangeStyleIntent: replaceRangeStyleIntent || pasteIntoNewRows || autofillIntoNewRows,
    source,
    mutatedCellCount,
    createsNewRows,
    autofillApplyType
  })

  if (source === 'deferred-replay') {
    plannedCellsFiltered = plannedCellsFiltered.flatMap(cell => {
      if (cell.valueAction === 'none') return [cell]
      const nextSig =
        cell.valueAction === 'clear' ? 'blank' : normalizeBlankLikeEchoSignature(toEchoSignature(cell.value))
      if (isCellStillPendingLocalAck(cell.rowIndex, cell.colIndex, cell.rowId, cell.columnName, nextSig)) {
        return [cell]
      }
      const authoritativeSig = getAuthoritativeSignatureForCell(cell.rowIndex, cell.colIndex)
      if (typeof authoritativeSig !== 'string') return [cell]
      if (normalizeBlankLikeEchoSignature(authoritativeSig) !== nextSig) return [cell]
      if (cell.stylePatch) {
        return [{ ...cell, valueAction: 'none' }]
      }
      return []
    })
  }

  const strippedValueWriteCount =
    (authoritativeEnvelope.plan?.cells.filter(cell => cell.valueAction === 'set' || cell.valueAction === 'clear')
      .length ?? 0) -
    plannedCellsFiltered.filter(cell => cell.valueAction === 'set' || cell.valueAction === 'clear').length
  if (strippedValueWriteCount > 0) {
    callbacksRef.current.onDiagnosticsTraceEvent?.({
      source: 'client',
      stage: 'grid_mutation_incidental_value_writes_stripped',
      traceId: mutationTraceId,
      payload: {
        targetSheetId,
        commandId: commandId ?? null,
        intent: authoritativeIntent,
        strippedValueWriteCount,
        mutatedCellCount
      }
    })
  }

  debugMutationTrace('resolved', {
    source,
    commandId: commandId ?? '',
    sheetId: targetSheetId,
    mutatedCellCount,
    plannedCellCount: plannedCellsFiltered.length,
    plannerDiagnostics: authoritativeEnvelope.diagnostics
  })

  callbacksRef.current.onDiagnosticsTraceEvent?.({
    source: 'client',
    stage: 'grid_mutation_resolved',
    traceId: mutationTraceId,
    payload: {
      source,
      commandId: commandId ?? null,
      targetSheetId,
      preserveUndefinedAsNull,
      disableMixedValueStylePayloads,
      allowValueCarryingStylePayloads,
      hasPersistableMutation,
      hasStyleOnlyMutation: authoritativeIntent === 'formatOnly',
      replaceRangeStyleIntent,
      mutatedCellCount,
      plannedCellCount: plannedCellsFiltered.length,
      payloadMatrix: summarizeCellMatrixForDebug(payloadCellValue),
      workbookSnapshotMatrix: summarizeCellMatrixForDebug(workbookSnapshotCellValue),
      worksheetMatrix: summarizeCellMatrixForDebug(worksheetCellValue),
      mergedMatrix: summarizeCellMatrixForDebug(cellValue),
      explicitPayloadMatrix: summarizeCellMatrixForDebug(explicitPayloadAbsoluteCellValue),
      plannerDiagnostics: authoritativeEnvelope.diagnostics,
      rowIdentityStructureHealthy,
      rowIdentityStructuralMismatch,
      columnIdentityStructureHealthy,
      columnIdentityStructuralMismatch,
      pendingNewRowCount: pendingNewRowsUpdate?.nextData.length
        ? Math.max(0, pendingNewRowsUpdate.nextData.length - currentData.length)
        : 0
    }
  })

  if (plannedCellsFiltered.length === 0) {
    if (
      hasPersistableMutation &&
      mutatedCellCount > 0 &&
      source !== 'selection-reconcile' &&
      source !== 'deferred-reconcile'
    ) {
      const intentJournal = deps.propsRef.current.spreadsheetIntentJournalRef?.current
      const ownershipRegistry = deps.propsRef.current.versionCausalOwnershipRef?.current
      const baseVersion = deps.propsRef.current.resolveKnownSheetVersion?.(targetSheetId) ?? 0
      const stagedCells =
        authoritativeEnvelope.plan?.cells.filter(cell => cell.valueAction === 'set' || cell.valueAction === 'clear') ??
        []
      if (intentJournal && stagedCells.length > 0) {
        for (const cell of stagedCells) {
          if (!cell.columnName) continue
          const logicalRowHandle = cell.rowId || `row@${cell.rowIndex}`
          intentJournal.captureIntent({
            sheetId: targetSheetId,
            logicalRowHandle,
            columnName: cell.columnName,
            value: cell.value,
            baseVersion
          })
          ownershipRegistry?.registerIntent({
            sheetId: targetSheetId,
            logicalRowHandle,
            columnName: cell.columnName,
            baseVersion
          })
        }
        callbacksRef.current.onDiagnosticsTraceEvent?.({
          source: 'client',
          stage: 'grid_mutation_intent_staged',
          traceId: mutationTraceId,
          payload: {
            targetSheetId,
            stagedIntentCount: stagedCells.length,
            baseVersion
          }
        })
        return { kind: 'return', value: true }
      }
    }
    if (hadPasteIntentForSheet && source === 'sheet-value-changed') {
      pendingFormattingPasteIntentRef.current = null
    }
    if (autofillApplyType != null && source === 'sheet-value-changed') {
      clearSpreadsheetAutofillIntent(pendingAutofillIntentRef, targetSheetId)
    }
    return { kind: 'return', value: false }
  }

  const unifiedSignature = buildUnifiedPlannerMutationSignature(
    plannedCellsFiltered,
    authoritativeEnvelope.plan?.styles
  )

  // Dedupe window narrowed from 1500ms to 250ms. The original 1500ms window was sized to absorb
  // Univer focus/blur churn that re-emits the same value, but it also swallows legitimate
  // repeated edits (e.g. user types "1" in two adjacent rows in a freshly-created sheet, with
  // the second edit landing within the window). Combined with the rowId inclusion in
  // buildUnifiedPlannerMutationSignature, 250ms is enough to absorb true echo without dropping
  // distinct user edits on slow networks.
  const SIGNATURE_DEDUPE_WINDOW_MS = 250
  for (const [existingSignature, at] of recentLocalMutationSignaturesRef.current.entries()) {
    if (now - at > SIGNATURE_DEDUPE_WINDOW_MS) {
      recentLocalMutationSignaturesRef.current.delete(existingSignature)
    }
  }

  const shouldDedupeLocalEmit = !isReadOnlyReconcileSource
  if (shouldDedupeLocalEmit && recentLocalMutationSignaturesRef.current.has(unifiedSignature)) {
    callbacksRef.current.onDiagnosticsTraceEvent?.({
      source: 'client',
      stage: 'grid_mutation_ignored',
      traceId: mutationTraceId,
      payload: {
        reason: 'duplicate_or_recent_local_mutation',
        source,
        commandId: commandId ?? null,
        targetSheetId,
        mutatedCellCount,
        unifiedSignatureDigest: unifiedSignature.slice(0, 120),
        plannerDiagnostics: authoritativeEnvelope.diagnostics
      }
    })
    return { kind: 'return', value: true }
  }

  if (shouldDedupeLocalEmit) {
    recentLocalMutationSignaturesRef.current.set(unifiedSignature, now)
  }

  const emittedChangedCells = plannedCellsFiltered
    .filter(cell => cell.valueAction !== 'none')
    .map(cell => ({
      rowId: cell.rowId,
      columnName: cell.columnName,
      value: cell.value,
      univerRow: cell.rowIndex,
      univerCol: cell.colIndex
    }))

  callbacksRef.current.onDiagnosticsTraceEvent?.({
    source: 'client',
    stage: 'grid_mutation_detected',
    traceId: mutationTraceId,
    payload: {
      source,
      commandId: commandId ?? null,
      targetSheetId,
      mutatedCellCount,
      changedCells: emittedChangedCells,
      styleCells: plannedCellsFiltered
        .filter(cell => cell.stylePatch != null)
        .map(cell => ({
          rowIndex: cell.rowIndex,
          colIndex: cell.colIndex,
          stylePatch: cell.stylePatch
        })),
      plannerDiagnostics: authoritativeEnvelope.diagnostics
    }
  })

  // 2c: only the planner writes the echo signature ledger when it owns the context. When the
  // host owns context (contextOwnedByHost === true), the host is the authoritative writer.
  if (!contextOwnedByHost && emittedChangedCells.length > 0) {
    for (const cell of emittedChangedCells) {
      lastSyncedGridCellSignaturesRef.current.set(
        remoteEchoKey(cell.univerRow, cell.univerCol),
        toEchoSignature(cell.value)
      )
    }
  }

  const hasValueCells = emittedChangedCells.length > 0 || createsNewRows
  if (pendingNewRowsUpdate && onDataChangeCb && hasValueCells) {
    onDataChangeCb(pendingNewRowsUpdate.nextData, targetSheetId)
    // 2c: same contract — only overwrite contextRef when the planner owns it.
    if (!contextOwnedByHost) {
      contextRef.current = pendingNewRowsUpdate.nextContext
    }
  }

  const localMutationPlan = {
    sheetId: targetSheetId,
    traceId: mutationTraceId,
    cells: plannedCellsFiltered,
    styles: authoritativeEnvelope.plan?.styles
  }

  const plannedValueSetCount = localMutationPlan.cells.filter(cell => cell.valueAction === 'set').length
  const plannedValueClearCount = localMutationPlan.cells.filter(cell => cell.valueAction === 'clear').length
  const plannedStylePatchCount = localMutationPlan.cells.filter(cell => cell.stylePatch != null).length
  debugMutationTrace('unified-plan', {
    traceId: mutationTraceId,
    sheetId: targetSheetId,
    intent: authoritativeIntent,
    plannedCellCount: localMutationPlan.cells.length,
    plannedValueSetCount,
    plannedValueClearCount,
    plannedStylePatchCount
  })
  callbacksRef.current.onDiagnosticsTraceEvent?.({
    source: 'client',
    stage: 'grid_unified_mutation_plan',
    traceId: mutationTraceId,
    payload: {
      targetSheetId,
      intent: authoritativeIntent,
      plannedCellCount: localMutationPlan.cells.length,
      plannedValueSetCount,
      plannedValueClearCount,
      plannedStylePatchCount
    }
  })

  const emit: PersistEmitInput = {
    source,
    targetSheetId,
    mutationTraceId,
    localMutationPlan,
    plannedCellsFiltered,
    emittedChangedCells,
    planStyles: authoritativeEnvelope.plan?.styles,
    hadPasteIntentForSheet,
    hadPasteFormattingIntentForSheet,
    autofillApplyType,
    commandId,
    materializeRowsBeforeEmit: Boolean(pendingNewRowsUpdate && createsNewRows)
  }

  return { kind: 'emit', emit }
}
