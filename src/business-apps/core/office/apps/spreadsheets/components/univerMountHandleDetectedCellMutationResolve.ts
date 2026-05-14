import { createUniverConversionContext, overlaySparseRowIndexMappings } from '../utils/univerAdapter'
import { deriveCellMatrixFromPayloadCoordinates, deriveCellMatrixFromRanges } from '../utils/univerWorksheetCellRead'
import {
  buildAbsoluteCellMatrixForRanges,
  mergeExplicitMutationCellsIntoDerived,
  overlayExplicitMutationCellsOntoDerived
} from './cellMatrixUtils'
import type { SheetCellMatrixCoordinateMode } from './cellMatrixUtils'
import { cellMatrixHasCollabWireStylePayload } from './univerMutationPlanner'
import { debugMutationTrace } from './univerGridDebug'
import { SPREADSHEET_MAX_WORKSHEET_RANGE_READ_CELLS } from './univerGridUniverConstants'
import {
  buildNewRowsFromCellMatrix,
  countCellMatrixWritesAgainstCurrentData,
  deriveCellMatrixFromWorkbookSnapshot,
  detectCellMatrixCoordinateModeHint,
  enrichCellMatrixWithLiveFormulas,
  getNewRowIndices,
  getOrCreateClientRowId,
  isCurrentFacadeWorksheet,
  isRegionReplaceStyleCollaborationCommand,
  pruneExpiredRecentMutationEntries,
  summarizeCellMatrixForDebug,
  summarizeRangesForDebug
} from './univerGridWorkbookMutationModule'
import {
  buildShouldSuppressRemoteEcho,
  cellMatrixHasAnyNonSuppressedCell,
  selectionReconcileAllCellsRecentlyLocal,
  selectionReconcileHasAuthoritativeDiff
} from './univerMountHandleDetectedCellMutationRemoteEcho'
import { getSpreadsheetRowAtUniverGridIndex } from './univerGridAuthoritativeHelpers'
import {
  createClientRowRef,
  getClientRowIdentity,
  getViewerRowIdentityCandidates,
  isSpreadsheetBackendRowUuid,
  resolveBackendRowIdForViewerRow
} from '../utils/spreadsheetRowIdentity'
import { getViewerRowVisualIndex } from '../utils/spreadsheetPeerRowHydration'
import { rowSlotTargetMatchesRowIdentity } from '../utils/spreadsheetRowSlotIdentity'
import type {
  DetectedCellMutationReady,
  HandleDetectedCellMutationArgs,
  ResolveDetectedCellMutationResult,
  UniverMountHandleDetectedCellMutationDeps
} from './univerMountHandleDetectedCellMutation.types'

type PlannerContextSourceName = 'props' | 'resolved'

function countRowsWithBackendIdentity(rows: Record<string, unknown>[], isUuid: (value: string) => boolean): number {
  return rows.filter(row => Boolean(resolveBackendRowIdForViewerRow(row, isUuid))).length
}

function buildPlannerRowLayoutSignature(rows: Record<string, unknown>[]): string[] {
  return rows
    .map((row, index) => {
      const visualIndex = getViewerRowVisualIndex(row, index)
      const identity = getViewerRowIdentityCandidates(row)[0] ?? `row_${index}`
      return `${visualIndex}:${identity}`
    })
    .sort()
}

function buildPlannerColumnLayoutSignature(
  columns: UniverMountHandleDetectedCellMutationDeps['propsRef']['current']['columns']
): string[] {
  return [...columns]
    .sort((left, right) => left.order - right.order)
    .map((column, index) => `${index}:${column.id}:${column.name}:${column.isVisible !== false ? 'visible' : 'hidden'}`)
}

function createPlannerContext(
  columns: UniverMountHandleDetectedCellMutationDeps['propsRef']['current']['columns'],
  data: Record<string, unknown>[]
): NonNullable<UniverMountHandleDetectedCellMutationDeps['contextRef']['current']> {
  return createUniverConversionContext(columns, data)
}

function resolvePlannerContextSource({
  deps,
  targetSheetId,
  propsData,
  propsColumns,
  isUuid
}: {
  deps: UniverMountHandleDetectedCellMutationDeps
  targetSheetId: string
  propsData: Record<string, unknown>[]
  propsColumns: UniverMountHandleDetectedCellMutationDeps['propsRef']['current']['columns']
  isUuid: (value: string) => boolean
}): {
  source: PlannerContextSourceName
  columns: typeof propsColumns
  data: Record<string, unknown>[]
  context: NonNullable<UniverMountHandleDetectedCellMutationDeps['contextRef']['current']>
  resolvedDataLength: number | null
  propsBackendRowCount: number
  resolvedBackendRowCount: number | null
  columnStructuralMismatch: boolean
} {
  const propsBackendRowCount = countRowsWithBackendIdentity(propsData, isUuid)
  const resolved = deps.propsRef.current.getSheetContext?.(targetSheetId) ?? null
  if (!resolved) {
    return {
      source: 'props',
      columns: propsColumns,
      data: propsData,
      context: createPlannerContext(propsColumns, propsData),
      resolvedDataLength: null,
      propsBackendRowCount,
      resolvedBackendRowCount: null,
      columnStructuralMismatch: false
    }
  }

  const resolvedBackendRowCount = countRowsWithBackendIdentity(resolved.data, isUuid)
  const propsLayoutSignature = buildPlannerRowLayoutSignature(propsData)
  const resolvedLayoutSignature = buildPlannerRowLayoutSignature(resolved.data)
  const propsColumnSignature = buildPlannerColumnLayoutSignature(propsColumns)
  const resolvedColumnSignature = buildPlannerColumnLayoutSignature(resolved.columns)
  const hasPropsRows = propsData.length > 0
  const hasResolvedRows = resolved.data.length > 0
  const hasStructuralMismatch =
    hasPropsRows &&
    hasResolvedRows &&
    (propsLayoutSignature.length !== resolvedLayoutSignature.length ||
      propsLayoutSignature.some((entry, index) => entry !== resolvedLayoutSignature[index]))
  const hasColumnStructuralMismatch =
    propsColumnSignature.length !== resolvedColumnSignature.length ||
    propsColumnSignature.some((entry, index) => entry !== resolvedColumnSignature[index])
  const shouldUseResolved =
    !hasStructuralMismatch &&
    !hasColumnStructuralMismatch &&
    (resolvedBackendRowCount > 0 || (!hasPropsRows && hasResolvedRows) || resolved.data.length >= propsData.length)

  if (!shouldUseResolved) {
    return {
      source: 'props',
      columns: propsColumns,
      data: propsData,
      context: createPlannerContext(propsColumns, propsData),
      resolvedDataLength: resolved.data.length,
      propsBackendRowCount,
      resolvedBackendRowCount,
      columnStructuralMismatch: hasColumnStructuralMismatch
    }
  }

  return {
    source: 'resolved',
    columns: resolved.columns,
    data: resolved.data,
    context: createPlannerContext(resolved.columns, resolved.data),
    resolvedDataLength: resolved.data.length,
    propsBackendRowCount,
    resolvedBackendRowCount,
    columnStructuralMismatch: false
  }
}

function clearMaterializedClientRowIndexMappings({
  rowIndices,
  rowOffset,
  data,
  context,
  idMap,
  isUuid
}: {
  rowIndices: number[]
  rowOffset: number
  data: Record<string, unknown>[]
  context: NonNullable<UniverMountHandleDetectedCellMutationDeps['contextRef']['current']>
  idMap: Map<number, string>
  isUuid: (value: string) => boolean
}): Array<{ rowIndex: number; clientRowId: string; backendRowUuid: string }> {
  const cleared: Array<{ rowIndex: number; clientRowId: string; backendRowUuid: string }> = []
  for (const rowIndex of rowIndices) {
    const globalRowIndex = rowIndex + rowOffset
    const clientRowId = idMap.get(globalRowIndex)
    if (!clientRowId) continue

    const row = getSpreadsheetRowAtUniverGridIndex(data, globalRowIndex)
    const backendRowUuid = row ? resolveBackendRowIdForViewerRow(row, isUuid) : undefined
    const contextRowId = context.rowIndexToId.get(globalRowIndex)
    const identityCandidates = row ? getViewerRowIdentityCandidates(row) : []
    const sameLogicalRow =
      identityCandidates.includes(clientRowId) || (typeof contextRowId === 'string' && contextRowId === clientRowId)

    if (!backendRowUuid || !sameLogicalRow) continue

    idMap.delete(globalRowIndex)
    cleared.push({ rowIndex: globalRowIndex, clientRowId, backendRowUuid })
  }
  return cleared
}

export function resolveDetectedCellMutation(
  deps: UniverMountHandleDetectedCellMutationDeps,
  mutationArgs: HandleDetectedCellMutationArgs
): ResolveDetectedCellMutationResult {
  const {
    univerAPIRef,
    propsRef,
    callbacksRef,
    recentlyDuplicatedWorksheetIdsRef,
    remoteEchoSuppressionRef,
    recentLocallyMutatedGridCellsRef,
    lastSyncedGridCellSignaturesRef,
    newRowClientIdByIndexRef,
    getWorkbookSnapshotRef,
    peekPasteFormattingReplaceIntent
  } = deps

  const { source, commandId, payloadCellValue, ranges, worksheetId, preserveUndefinedAsNull = false } = mutationArgs
  const workbook = univerAPIRef.current?.getActiveWorkbook()
  const activeWorksheet = workbook?.getActiveSheet()
  const explicitWorksheetId = typeof worksheetId === 'string' && worksheetId.length > 0 ? worksheetId : null
  const worksheet =
    explicitWorksheetId && typeof workbook?.getSheetBySheetId === 'function'
      ? (workbook.getSheetBySheetId(explicitWorksheetId) ?? activeWorksheet)
      : activeWorksheet
  const currentWorksheet =
    isCurrentFacadeWorksheet(activeWorksheet, worksheet, explicitWorksheetId) &&
    worksheet &&
    typeof (worksheet as { getRange?: unknown }).getRange === 'function'
      ? worksheet
      : undefined
  const disableMixedValueStylePayloads = preserveUndefinedAsNull
  const univerActiveSheetId = explicitWorksheetId ?? worksheet?.getSheetId?.() ?? null
  const propSheetId = propsRef.current.sheet.id
  const targetSheetId =
    propsRef.current.multiSheetWorkbookMode && univerActiveSheetId ? univerActiveSheetId : propSheetId
  const canResolveContext =
    propsRef.current.multiSheetWorkbookMode && typeof propsRef.current.getSheetContext === 'function'
  const duplicateInsertedAt = recentlyDuplicatedWorksheetIdsRef.current.get(targetSheetId)
  if (duplicateInsertedAt != null) {
    if (Date.now() - duplicateInsertedAt < 3000) {
      return { status: 'return', value: false }
    }
    recentlyDuplicatedWorksheetIdsRef.current.delete(targetSheetId)
  }

  const hasPasteFormattingIntentForSheet = peekPasteFormattingReplaceIntent(targetSheetId)
  const commandHasReplaceRangeStyleIntent = isRegionReplaceStyleCollaborationCommand(commandId)
  const shouldReadPostPasteCells = hasPasteFormattingIntentForSheet || commandHasReplaceRangeStyleIntent

  const isUuidForRowIdentity = deps.isUuidForRowRemap ?? isSpreadsheetBackendRowUuid
  const plannerContext = canResolveContext
    ? resolvePlannerContextSource({
        deps,
        targetSheetId,
        propsData: propsRef.current.data,
        propsColumns: propsRef.current.columns,
        isUuid: isUuidForRowIdentity
      })
    : {
        source: 'props' as const,
        columns: propsRef.current.columns,
        data: propsRef.current.data,
        context: createPlannerContext(propsRef.current.columns, propsRef.current.data),
        resolvedDataLength: null,
        propsBackendRowCount: countRowsWithBackendIdentity(propsRef.current.data, isUuidForRowIdentity),
        resolvedBackendRowCount: null
      }
  const ctxBefore = plannerContext.context
  const contextColumns = plannerContext.columns
  const currentData = plannerContext.data
  const useResolvedContext = plannerContext.source === 'resolved'
  const rowSlotIdentityRegistry = propsRef.current.rowSlotIdentityRegistryRef?.current ?? null
  const columnStructureState = propsRef.current.columnStructureStateRef?.current ?? null
  const rowIdentityStructuralMismatch =
    rowSlotIdentityRegistry?.hasStructuralMismatch(targetSheetId, currentData, isUuidForRowIdentity) ?? false
  const rowIdentityStructureHealthy =
    (rowSlotIdentityRegistry?.getState(targetSheetId)?.healthy ?? true) && !rowIdentityStructuralMismatch
  const columnIdentityStructuralMismatch =
    !plannerContext.columnStructuralMismatch && !columnStructureState?.pendingInsertedRange
      ? false
      : plannerContext.columnStructuralMismatch || columnStructureState?.healthy === false
  const resolveStableRowTarget = (rowIndex: number) => {
    const registryTarget = rowSlotIdentityRegistry?.resolveRowTarget(targetSheetId, rowIndex)
    const row = getSpreadsheetRowAtUniverGridIndex(currentData, rowIndex)
    if (row) {
      const backendRowId = resolveBackendRowIdForViewerRow(row, isUuidForRowIdentity)
      const clientRowId = getClientRowIdentity(row)
      const registryMatchesCurrentRow = rowSlotTargetMatchesRowIdentity(registryTarget, row, isUuidForRowIdentity)

      if (registryTarget && !registryMatchesCurrentRow && rowIdentityStructureHealthy) {
        callbacksRef.current.onDiagnosticsTraceEvent?.({
          source: 'client',
          stage: 'grid_mutation_row_registry_override_rejected',
          payload: {
            targetSheetId,
            rowIndex,
            registryRowId: registryTarget.rowId,
            registryBackendRowId: registryTarget.backendRowId ?? null,
            registryClientRowId: registryTarget.clientRowId ?? null,
            currentBackendRowId: backendRowId ?? null,
            currentClientRowId: clientRowId || null
          }
        })
      }

      if (backendRowId) {
        if (registryTarget && registryMatchesCurrentRow) return registryTarget
        return {
          rowId: backendRowId,
          backendRowId,
          clientRowId: clientRowId || undefined,
          rowIndex
        }
      }

      if (clientRowId) {
        if (registryTarget && registryMatchesCurrentRow) return registryTarget
        return {
          rowId: clientRowId,
          rowRef: createClientRowRef(clientRowId),
          clientRowId,
          rowIndex
        }
      }
    }

    if (registryTarget) return registryTarget
    if (!row) {
      const fallbackRowId = ctxBefore?.rowIndexToId.get(rowIndex)
      return fallbackRowId && rowIdentityStructureHealthy ? { rowId: fallbackRowId, rowIndex } : null
    }
    const fallbackRowId = ctxBefore?.rowIndexToId.get(rowIndex)
    return fallbackRowId && rowIdentityStructureHealthy ? { rowId: fallbackRowId, rowIndex } : null
  }
  const resolveStableColumnName = (columnIndex: number) => {
    const visibleColumns = [...contextColumns]
      .sort((left, right) => left.order - right.order)
      .filter(column => column.isVisible !== false)
    const structuralColumn = visibleColumns[columnIndex]
    if (structuralColumn) {
      return structuralColumn.name
    }
    const fallbackColumnName =
      ctxBefore?.columnIndexToName.get(columnIndex) ?? ctxBefore?.columnIndexToId.get(columnIndex)
    return fallbackColumnName && !(columnIdentityStructuralMismatch && columnStructureState?.healthy === false)
      ? fallbackColumnName
      : null
  }
  const columnIdentityStructureHealthy =
    (columnStructureState?.healthy ?? true) && !plannerContext.columnStructuralMismatch
  if (!ctxBefore) return { status: 'return', value: false }
  const payloadCellValueForValueMerge = preserveUndefinedAsNull ? undefined : payloadCellValue
  const payloadCoordinateModeHint = detectCellMatrixCoordinateModeHint(ranges, payloadCellValueForValueMerge)
  const workbookSnapshotCellValue =
    source === 'sheet-value-changed' &&
    !preserveUndefinedAsNull &&
    !disableMixedValueStylePayloads &&
    !shouldReadPostPasteCells
      ? deriveCellMatrixFromWorkbookSnapshot(getWorkbookSnapshotRef.current?.() ?? null, targetSheetId, ranges)
      : undefined
  const postPasteCoordinateCellValue =
    shouldReadPostPasteCells && payloadCellValue
      ? deriveCellMatrixFromPayloadCoordinates(
          currentWorksheet,
          payloadCellValue,
          ranges,
          payloadCoordinateModeHint,
          true,
          preserveUndefinedAsNull
        )
      : undefined
  let worksheetCellValue =
    workbookSnapshotCellValue ??
    postPasteCoordinateCellValue ??
    deriveCellMatrixFromRanges(
      currentWorksheet,
      ranges,
      SPREADSHEET_MAX_WORKSHEET_RANGE_READ_CELLS,
      preserveUndefinedAsNull,
      shouldReadPostPasteCells
    )
  if (shouldReadPostPasteCells && payloadCellValue && typeof payloadCellValue === 'object') {
    worksheetCellValue = mergeExplicitMutationCellsIntoDerived(
      worksheetCellValue,
      payloadCellValue,
      ranges,
      payloadCoordinateModeHint
    )
  } else if (preserveUndefinedAsNull && payloadCellValue && typeof payloadCellValue === 'object') {
    worksheetCellValue = overlayExplicitMutationCellsOntoDerived(worksheetCellValue, payloadCellValue)
  }
  const relativeCellValue = buildAbsoluteCellMatrixForRanges(
    ranges,
    worksheetCellValue,
    payloadCellValueForValueMerge,
    'relative'
  )
  const absoluteCellValue = buildAbsoluteCellMatrixForRanges(
    ranges,
    worksheetCellValue,
    payloadCellValueForValueMerge,
    'absolute'
  )
  let selectedPayloadCoordinateMode: SheetCellMatrixCoordinateMode =
    payloadCoordinateModeHint === 'absolute' || payloadCoordinateModeHint === 'relative'
      ? payloadCoordinateModeHint
      : 'relative'
  let relativeStatsDebug: { changed: number; destructiveBlankWrites: number } | null = null
  let absoluteStatsDebug: { changed: number; destructiveBlankWrites: number } | null = null
  let baseCellValue =
    selectedPayloadCoordinateMode === 'absolute'
      ? (absoluteCellValue ?? relativeCellValue)
      : (relativeCellValue ?? absoluteCellValue)
  if (payloadCoordinateModeHint === 'auto' && relativeCellValue && absoluteCellValue) {
    const relativeStats = countCellMatrixWritesAgainstCurrentData({
      cellValue: relativeCellValue,
      currentData,
      contextColumns
    })
    const absoluteStats = countCellMatrixWritesAgainstCurrentData({
      cellValue: absoluteCellValue,
      currentData,
      contextColumns
    })
    relativeStatsDebug = relativeStats
    absoluteStatsDebug = absoluteStats
    if (
      absoluteStats.destructiveBlankWrites < relativeStats.destructiveBlankWrites ||
      (absoluteStats.destructiveBlankWrites === relativeStats.destructiveBlankWrites &&
        absoluteStats.changed < relativeStats.changed)
    ) {
      selectedPayloadCoordinateMode = 'absolute'
      baseCellValue = absoluteCellValue
    }
  }
  const explicitPayloadAbsoluteCellValue = payloadCellValueForValueMerge
    ? buildAbsoluteCellMatrixForRanges(ranges, undefined, payloadCellValueForValueMerge, selectedPayloadCoordinateMode)
    : undefined
  if (!baseCellValue) {
    return { status: 'return', value: false }
  }
  const cellValue = enrichCellMatrixWithLiveFormulas(
    currentWorksheet,
    baseCellValue,
    explicitPayloadAbsoluteCellValue ?? payloadCellValueForValueMerge
  )
  const hadPasteFormattingIntentForSheet =
    commandHasReplaceRangeStyleIntent ||
    (hasPasteFormattingIntentForSheet && cellMatrixHasCollabWireStylePayload(cellValue))
  debugMutationTrace('detected', {
    source,
    commandId: commandId ?? '',
    sheetId: targetSheetId,
    ranges: summarizeRangesForDebug(ranges),
    payloadCoordinateModeHint,
    selectedPayloadCoordinateMode,
    payload: summarizeCellMatrixForDebug(payloadCellValueForValueMerge),
    workbookSnapshot: summarizeCellMatrixForDebug(workbookSnapshotCellValue),
    worksheet: summarizeCellMatrixForDebug(worksheetCellValue),
    merged: summarizeCellMatrixForDebug(cellValue),
    relativeStatsChanged: relativeStatsDebug?.changed,
    relativeStatsDestructiveBlankWrites: relativeStatsDebug?.destructiveBlankWrites,
    absoluteStatsChanged: absoluteStatsDebug?.changed,
    absoluteStatsDestructiveBlankWrites: absoluteStatsDebug?.destructiveBlankWrites
  })

  const rowOffset = 0
  const colOffset = 0
  const touchedRowIndices = Array.from(
    new Set(
      Object.keys(cellValue)
        .map(key => Number(key))
        .filter(rowIndex => !Number.isNaN(rowIndex))
    )
  )
  const unresolvedStableRowIndices = touchedRowIndices.filter(
    rowIndex => resolveStableRowTarget(rowIndex + rowOffset) == null
  )
  const touchedColumnIndices = Array.from(
    new Set(
      Object.values(cellValue).flatMap(rowCells =>
        rowCells && typeof rowCells === 'object'
          ? Object.keys(rowCells)
              .map(key => Number(key))
              .filter(columnIndex => !Number.isNaN(columnIndex))
          : []
      )
    )
  )
  const unresolvedStableColumnIndices = touchedColumnIndices.filter(
    columnIndex => resolveStableColumnName(columnIndex + colOffset) == null
  )
  if (!rowIdentityStructureHealthy && unresolvedStableRowIndices.length > 0) {
    callbacksRef.current.onDiagnosticsTraceEvent?.({
      source: 'client',
      stage: 'grid_mutation_deferred_unhealthy_row_identity',
      payload: {
        targetSheetId,
        unresolvedStableRowIndices,
        rowIdentityStructureHealthy,
        rowIdentityStructuralMismatch
      }
    })
    return { status: 'return', value: false }
  }
  if (!columnIdentityStructureHealthy && unresolvedStableColumnIndices.length > 0) {
    callbacksRef.current.onDiagnosticsTraceEvent?.({
      source: 'client',
      stage: 'grid_mutation_deferred_unhealthy_column_identity',
      payload: {
        targetSheetId,
        unresolvedStableColumnIndices,
        columnIdentityStructureHealthy,
        columnIdentityStructuralMismatch,
        pendingInsertedRange: columnStructureState?.pendingInsertedRange ?? null
      }
    })
    return { status: 'return', value: false }
  }
  const now = Date.now()
  pruneExpiredRecentMutationEntries(recentLocallyMutatedGridCellsRef.current, now)
  const shouldSuppress = buildShouldSuppressRemoteEcho({ remoteEchoSuppressionRef }, now)
  const hasNonSuppressedCell = cellMatrixHasAnyNonSuppressedCell(cellValue, shouldSuppress, rowOffset, colOffset)

  if (!hasNonSuppressedCell) {
    return { status: 'return', value: false }
  }

  if (source === 'command-executed') {
    return { status: 'return', value: false }
  }

  if (source === 'selection-reconcile') {
    if (
      selectionReconcileAllCellsRecentlyLocal(
        { recentLocallyMutatedGridCellsRef },
        cellValue,
        now,
        rowOffset,
        colOffset
      )
    ) {
      return { status: 'return', value: false }
    }
  }

  if (source === 'selection-reconcile') {
    if (!selectionReconcileHasAuthoritativeDiff({ lastSyncedGridCellSignaturesRef }, cellValue)) {
      return { status: 'return', value: false }
    }
  }

  const existingMappedRowIndices = Array.from(newRowClientIdByIndexRef.current.keys())
    .map(globalRowIndex => globalRowIndex - rowOffset)
    .filter(rowIndex => rowIndex >= 0)
  const candidateNewRowIndices = getNewRowIndices(cellValue, ctxBefore, rowOffset)
  const clearedClientRowIndexMappings = clearMaterializedClientRowIndexMappings({
    rowIndices: Array.from(new Set([...existingMappedRowIndices, ...candidateNewRowIndices])),
    rowOffset,
    data: currentData,
    context: ctxBefore,
    idMap: newRowClientIdByIndexRef.current,
    isUuid: isUuidForRowIdentity
  })
  const newRowIndices = candidateNewRowIndices.filter(rowIndex => {
    const globalRowIndex = rowIndex + rowOffset
    const row = getSpreadsheetRowAtUniverGridIndex(currentData, globalRowIndex)
    return !row || !resolveBackendRowIdForViewerRow(row, isUuidForRowIdentity)
  })
  callbacksRef.current.onDiagnosticsTraceEvent?.({
    source: 'client',
    stage: 'grid_planner_context_source_used',
    payload: {
      targetSheetId,
      contextSource: plannerContext.source,
      propSheetId,
      propsDataLength: propsRef.current.data.length,
      currentDataLength: currentData.length,
      contextRowCount: ctxBefore.rowIndexToId.size,
      resolvedDataLength: plannerContext.resolvedDataLength,
      propsBackendRowCount: plannerContext.propsBackendRowCount,
      resolvedBackendRowCount: plannerContext.resolvedBackendRowCount,
      rowIdentityStructureHealthy,
      rowIdentityStructuralMismatch,
      columnIdentityStructureHealthy,
      columnIdentityStructuralMismatch,
      candidateNewRowIndices,
      newRowIndices,
      clearedClientRowIndexMappings,
      pendingInsertedColumnRange: columnStructureState?.pendingInsertedRange ?? null
    }
  })
  const pendingNewRowsUpdate =
    newRowIndices.length > 0
      ? (() => {
          const newRows = buildNewRowsFromCellMatrix({
            newRowIndices,
            cellValue,
            ctx: ctxBefore,
            colOffset,
            rowOffset,
            getClientRowId: (globalRowIndex: number) =>
              getOrCreateClientRowId(globalRowIndex, newRowClientIdByIndexRef.current)
          })
          const nextData = [...currentData, ...newRows]
          const nextContext = overlaySparseRowIndexMappings(
            createUniverConversionContext(contextColumns, nextData),
            newRowIndices.map(rowIndex => {
              const globalRowIndex = rowIndex + rowOffset
              return {
                rowIndex: globalRowIndex,
                rowId: getOrCreateClientRowId(globalRowIndex, newRowClientIdByIndexRef.current)
              }
            })
          )
          return { nextData, nextContext }
        })()
      : null

  const ready: DetectedCellMutationReady = {
    now,
    source,
    commandId,
    targetSheetId,
    useResolvedContext,
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
    hadPasteIntentForSheet: hasPasteFormattingIntentForSheet,
    hadPasteFormattingIntentForSheet,
    disableMixedValueStylePayloads,
    preserveUndefinedAsNull,
    explicitPayloadAbsoluteCellValue,
    worksheetCellValue,
    workbookSnapshotCellValue,
    payloadCellValue,
    ranges,
    shouldSuppress,
    pendingNewRowsUpdate
  }

  return { status: 'ready', ready }
}
