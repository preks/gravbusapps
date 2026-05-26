import { createSpreadsheetTraceId } from '../services/spreadsheetDiagnostics'
import {
  buildAuthoritativeMutationEnvelope,
  resolveSpreadsheetLocalMutationIntent,
  applyAutofillMutationCellPolicy,
  type SpreadsheetLocalMutationIntent
} from './univerMutationPlanner'
import { autofillApplyTypeKeepsValueWrites, clearSpreadsheetAutofillIntent } from './univerAutofillIntent'
import { debugMutationTrace } from './univerGridDebug'
import { remoteEchoKey, toEchoSignature } from './univerGridAuthoritativeHelpers'
import { SELECTION_RECONCILE_LOCAL_EDIT_SUPPRESSION_MS } from './univerGridUniverConstants'
import {
  buildUnifiedPlannerMutationSignature,
  countCellMatrixEntries,
  isPersistableCellDataMutationValue,
  isRegionReplaceStyleCollaborationCommand,
  summarizeCellMatrixForDebug
} from './univerGridWorkbookMutationModule'
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
    recentLocallyMutatedGridCellsRef,
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
    rowOffset,
    colOffset,
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
  const allowValueCarryingStylePayloads = !disableMixedValueStylePayloads && mutatedCellCount > 1
  const hasPersistableMutation = Object.values(cellValue).some(rowCells => {
    if (!rowCells || typeof rowCells !== 'object') return false
    return Object.values(rowCells).some(cell => isPersistableCellDataMutationValue(cell))
  })
  const replaceRangeStyleIntent =
    hadPasteFormattingIntentForSheet || isRegionReplaceStyleCollaborationCommand(commandId)
  const pasteIntoNewRows = createsNewRows && hasPersistableMutation && source === 'sheet-value-changed'
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

  const wasRecentlyLocallyMutated = (globalRowIndex: number, globalColIndex: number): boolean => {
    const expiresAt = recentLocallyMutatedGridCellsRef.current.get(remoteEchoKey(globalRowIndex, globalColIndex)) ?? 0
    return expiresAt > now
  }

  const getAuthoritativeSignatureForCell = (globalRowIndex: number, globalColIndex: number): string | undefined => {
    return lastSyncedGridCellSignaturesRef.current.get(remoteEchoKey(globalRowIndex, globalColIndex))
  }

  const isReadOnlyReconcileSource = source === 'selection-reconcile' || source === 'deferred-reconcile'
  // Read-only reconcile confirms grid vs session; it never persists. Skipping
  // `getWorkbookSnapshot()` avoids Univer `save()` + structured-clone of the
  // entire workbook per deferred cell (the dominant CPU cost under collab).
  const workbookSnapshotForPlanner = isReadOnlyReconcileSource ? null : (getWorkbookSnapshotRef.current?.() ?? null)

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
    ranges,
    explicitPayloadAbsoluteCellValue,
    worksheetCellValue,
    mergedCellValue: cellValue,
    workbookSnapshot: workbookSnapshotForPlanner,
    allowValueCarryingStylePayloads,
    replaceRangeStyleIntent: replaceRangeStyleIntent || pasteIntoNewRows || autofillIntoNewRows,
    shouldSuppress,
    mutationCommandId: commandId ?? '',
    liveMergeRanges: liveMergeRanges ?? undefined
  })

  const plannedCellsFiltered = applyAutofillMutationCellPolicy({
    cells:
      authoritativeEnvelope.plan?.cells.filter(cell => cell.valueAction !== 'none' || cell.stylePatch != null) ?? [],
    intent: authoritativeIntent,
    replaceRangeStyleIntent: replaceRangeStyleIntent || pasteIntoNewRows || autofillIntoNewRows,
    source,
    mutatedCellCount,
    createsNewRows,
    autofillApplyType
  })

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

  if (!isReadOnlyReconcileSource) {
    for (const rowKey of Object.keys(cellValue)) {
      const rowIndex = Number(rowKey)
      if (Number.isNaN(rowIndex)) continue
      const rowCells = cellValue[rowIndex]
      if (!rowCells || typeof rowCells !== 'object') continue
      for (const colKey of Object.keys(rowCells)) {
        const colIndex = Number(colKey)
        if (Number.isNaN(colIndex)) continue
        recentLocallyMutatedGridCellsRef.current.set(
          remoteEchoKey(rowIndex + rowOffset, colIndex + colOffset),
          now + SELECTION_RECONCILE_LOCAL_EDIT_SUPPRESSION_MS
        )
      }
    }
  }

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
