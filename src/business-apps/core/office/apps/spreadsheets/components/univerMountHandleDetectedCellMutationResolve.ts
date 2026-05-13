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
  getViewerRowIdentityCandidates,
  isSpreadsheetBackendRowUuid,
  resolveBackendRowIdForViewerRow
} from '../utils/spreadsheetRowIdentity'
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

function resolvePlannerContextSource({
  deps,
  targetSheetId,
  propsData,
  propsColumns,
  propsContext,
  isUuid
}: {
  deps: UniverMountHandleDetectedCellMutationDeps
  targetSheetId: string
  propsData: Record<string, unknown>[]
  propsColumns: UniverMountHandleDetectedCellMutationDeps['propsRef']['current']['columns']
  propsContext: UniverMountHandleDetectedCellMutationDeps['contextRef']['current']
  isUuid: (value: string) => boolean
}): {
  source: PlannerContextSourceName
  columns: typeof propsColumns
  data: Record<string, unknown>[]
  context: typeof propsContext
  resolvedDataLength: number | null
  propsBackendRowCount: number
  resolvedBackendRowCount: number | null
} {
  const propsBackendRowCount = countRowsWithBackendIdentity(propsData, isUuid)
  const resolved = deps.propsRef.current.getSheetContext?.(targetSheetId) ?? null
  if (!resolved) {
    return {
      source: 'props',
      columns: propsColumns,
      data: propsData,
      context: propsContext,
      resolvedDataLength: null,
      propsBackendRowCount,
      resolvedBackendRowCount: null
    }
  }

  const resolvedBackendRowCount = countRowsWithBackendIdentity(resolved.data, isUuid)
  const shouldUseResolved = resolvedBackendRowCount > 0 || resolved.data.length >= propsData.length

  if (!shouldUseResolved) {
    return {
      source: 'props',
      columns: propsColumns,
      data: propsData,
      context: propsContext,
      resolvedDataLength: resolved.data.length,
      propsBackendRowCount,
      resolvedBackendRowCount
    }
  }

  return {
    source: 'resolved',
    columns: resolved.columns,
    data: resolved.data,
    context: createUniverConversionContext(resolved.columns, resolved.data),
    resolvedDataLength: resolved.data.length,
    propsBackendRowCount,
    resolvedBackendRowCount
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
    contextRef,
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
        propsContext: contextRef.current,
        isUuid: isUuidForRowIdentity
      })
    : {
        source: 'props' as const,
        columns: propsRef.current.columns,
        data: propsRef.current.data,
        context: contextRef.current,
        resolvedDataLength: null,
        propsBackendRowCount: countRowsWithBackendIdentity(propsRef.current.data, isUuidForRowIdentity),
        resolvedBackendRowCount: null
      }
  const ctxBefore = plannerContext.context
  const contextColumns = plannerContext.columns
  const currentData = plannerContext.data
  const useResolvedContext = plannerContext.source === 'resolved'
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
      candidateNewRowIndices,
      newRowIndices,
      clearedClientRowIndexMappings
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
