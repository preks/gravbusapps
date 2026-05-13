import { useCallback, useRef } from 'react'

import { SpreadsheetApiRequestError } from '../services/SpreadsheetApiService'
import {
  areCanonicalSheetIdsEqual,
  isSheetCreationAwaitingPersistedId,
  resolveReconciledSheetId
} from '../utils/reconcileTemporarySheetId'
import { buildRowIdentityDiagnostics } from '../utils/spreadsheetRowIdentity'
import {
  buildSpreadsheetRowMaterializationPlan,
  mergeCreatedRowsByVisualIndex,
  type SpreadsheetRowMaterializationPlan
} from './spreadsheetRowMaterializationPlan'
import type {
  UseSpreadsheetUniverRowCreatePipelineParams,
  UseSpreadsheetUniverRowCreatePipelineResult
} from './useSpreadsheetUniverRowCreatePipelineTypes'

export function useSpreadsheetUniverRowCreatePipeline(
  params: UseSpreadsheetUniverRowCreatePipelineParams
): UseSpreadsheetUniverRowCreatePipelineResult {
  const {
    activeSheetIdRef,
    activeSheetColumns,
    getColumnsForSheet,
    isUuid,
    isOpsV2Enabled,
    onRowAdd,
    entityEnabledRef,
    canEditWithLockRef,
    latestUniverDataRef,
    pendingUniverRowsBySheetRef,
    lastProcessedLengthRef,
    operationQueueRef,
    chainOnOperationQueue,
    sheetPersist,
    markVersionAsChanged,
    markVersionAsSaved,
    onPersistRowsErrorMessage,
    getActiveSessionRows,
    buildAddRowPayloadsFromUniverRows,
    persistAddedRowsWithBatch,
    persistSingleAddedRow,
    recoverFromVersionConflict,
    summarizeRowsForDebug,
    getRowsForSheet,
    multiSheetDebugLog,
    commitRowsForSheet,
    onRowsMaterializedContextSync,
    onRowIdentityDiagnostics,
    pendingCreatedSheetSelectionRef,
    createdSheetIdAliasesRef
  } = params
  const inFlightRowMaterializationKeysRef = useRef(new Set<string>())

  const processUniverDataChange = useCallback(async () => {
    const latest = latestUniverDataRef.current
    if (!latest || entityEnabledRef.current || !canEditWithLockRef.current) return
    const targetSheetId = latest.sheetId || activeSheetIdRef.current

    if (
      isSheetCreationAwaitingPersistedId({
        pendingCreatedSheetSelection: pendingCreatedSheetSelectionRef.current,
        effectiveSheetId: targetSheetId,
        aliases: createdSheetIdAliasesRef.current
      })
    ) {
      multiSheetDebugLog('process_univer_data_change_deferred_sheet_create', () => ({
        targetSheetId,
        pendingTemporary: pendingCreatedSheetSelectionRef.current?.temporarySheetId ?? null,
        pendingPersisted: pendingCreatedSheetSelectionRef.current?.persistedSheetId ?? null
      }))
      return
    }

    const newData = latest.data
    const canonicalTargetId = resolveReconciledSheetId(targetSheetId, createdSheetIdAliasesRef.current)

    const pendingRows = pendingUniverRowsBySheetRef.current.get(targetSheetId)
    const isActiveTarget = areCanonicalSheetIdsEqual(
      targetSheetId,
      activeSheetIdRef.current,
      createdSheetIdAliasesRef.current
    )
    const persistedRows = isActiveTarget
      ? getActiveSessionRows()
      : (pendingRows?.persistedRows ?? getRowsForSheet(canonicalTargetId))
    const materializationPlan = buildSpreadsheetRowMaterializationPlan({
      sheetId: canonicalTargetId,
      univerRows: newData,
      persistedRows,
      isUuid,
      inFlightKeys: inFlightRowMaterializationKeysRef.current
    })
    const lastProcessed = isActiveTarget ? lastProcessedLengthRef.current : persistedRows.length
    const targetColumns = isActiveTarget ? activeSheetColumns : getColumnsForSheet(canonicalTargetId)
    const rowPayloads = buildAddRowPayloadsFromUniverRows(materializationPlan.rowsToMaterialize, targetColumns)
    const buildMaterializationPlanDiagnostics = (
      plan: SpreadsheetRowMaterializationPlan,
      createdSparseGridRowIndices: number[] = []
    ) => ({
      sheetId: targetSheetId,
      canonicalTargetId,
      newDataLength: newData.length,
      persistedRowsLength: persistedRows.length,
      lastProcessedLength: lastProcessed,
      missingGridRowIndices: plan.missingGridRowIndices,
      unmaterializedClientRowIds: plan.unmaterializedClientRowIds,
      rowPayloadCount: rowPayloads.length,
      inFlightMissingGridRowIndices: plan.inFlightMissingGridRowIndices,
      alreadyMaterializedGridRowIndices: plan.alreadyMaterializedGridRowIndices,
      missingButInFlightCount: plan.missingButInFlightCount,
      missingAndWillCreateCount: plan.missingAndWillCreateCount,
      gridIndexCoordinateMode: plan.gridIndexCoordinateMode,
      createdSparseGridRowIndices
    })
    multiSheetDebugLog('process_univer_data_change_start', () => ({
      sheetId: targetSheetId,
      newData: summarizeRowsForDebug(newData),
      localSheetData: summarizeRowsForDebug(persistedRows),
      lastProcessedLength: lastProcessed,
      activeSheetId: activeSheetIdRef.current
    }))
    multiSheetDebugLog('process_univer_data_change_materialization_plan', () =>
      buildMaterializationPlanDiagnostics(materializationPlan)
    )
    if (rowPayloads.length === 0) {
      if (isActiveTarget && materializationPlan.missingGridRowIndices.length === 0) {
        lastProcessedLengthRef.current = newData.length
      }
      multiSheetDebugLog('process_univer_data_change_skip_no_new_rows', () => ({
        sheetId: latest.sheetId,
        newDataLength: newData.length,
        lastProcessedLength: lastProcessed,
        visualIndexPlannerFoundMissingRows: materializationPlan.missingGridRowIndices.length > 0,
        inFlightMissingGridRowIndices: materializationPlan.inFlightMissingGridRowIndices
      }))
      return
    }

    sheetPersist.markDirty()
    markVersionAsChanged()

    const prev = persistedRows
    const inFlightKeysForRequest = materializationPlan.entries.map(entry => entry.inFlightKey)
    const releaseInFlightKeysForRequest = () => {
      inFlightKeysForRequest.forEach(key => inFlightRowMaterializationKeysRef.current.delete(key))
    }
    inFlightKeysForRequest.forEach(key => inFlightRowMaterializationKeysRef.current.add(key))

    const useBatchAddRows = isOpsV2Enabled || rowPayloads.length > 1 || !onRowAdd

    const updateLocalRowsAfterCreate = (createdRows: Array<Record<string, unknown>>) => {
      const mergedRows = mergeCreatedRowsByVisualIndex({
        previousRows: prev,
        univerRows: newData,
        createdRows,
        isUuid
      })
      const next = mergedRows.rows
      const affectedUiRowIds = mergedRows.affectedUiRowIds
      if (isActiveTarget) {
        lastProcessedLengthRef.current = newData.length
      }
      pendingUniverRowsBySheetRef.current.delete(targetSheetId)
      multiSheetDebugLog('process_univer_data_change_rows_created', () => ({
        sheetId: targetSheetId,
        previousLocalRows: summarizeRowsForDebug(prev),
        createdRows: summarizeRowsForDebug(createdRows),
        nextRows: summarizeRowsForDebug(next),
        newData: summarizeRowsForDebug(newData),
        createdSparseGridRowIndices: mergedRows.createdGridRowIndices
      }))
      multiSheetDebugLog('process_univer_data_change_materialization_plan', () =>
        buildMaterializationPlanDiagnostics(materializationPlan, mergedRows.createdGridRowIndices)
      )
      commitRowsForSheet(canonicalTargetId, next, { syncGrid: false })
      onRowsMaterializedContextSync?.(canonicalTargetId, next, {
        affectedUiRowIds,
        isActiveTarget
      })
      onRowIdentityDiagnostics?.('row_session_snapshot_reconciled', {
        targetSheetId: canonicalTargetId,
        rowIdentities: buildRowIdentityDiagnostics({
          uiRowIds: affectedUiRowIds,
          rows: next,
          isUuid
        })
      })
    }

    sheetPersist.beginPersist()
    try {
      if (useBatchAddRows) {
        await persistAddedRowsWithBatch(canonicalTargetId, rowPayloads, updateLocalRowsAfterCreate)
        sheetPersist.recordSuccess(true)
        markVersionAsSaved()
        return
      }

      await persistSingleAddedRow(canonicalTargetId, rowPayloads, updateLocalRowsAfterCreate)
      sheetPersist.recordSuccess(true)
      markVersionAsSaved()
    } catch (error) {
      console.error('[SpreadsheetAppViewer] Failed to persist added rows:', error)
      sheetPersist.recordError(onPersistRowsErrorMessage)
      if (error instanceof SpreadsheetApiRequestError && error.status === 409) {
        releaseInFlightKeysForRequest()
        const recovered = await recoverFromVersionConflict()
        const latestData = latestUniverDataRef.current
        const latestSid = latestData?.sheetId
        const freshRows = isActiveTarget ? getActiveSessionRows() : getRowsForSheet(canonicalTargetId)
        const followUpPlan =
          recovered && latestData
            ? buildSpreadsheetRowMaterializationPlan({
                sheetId: canonicalTargetId,
                univerRows: latestData.data,
                persistedRows: freshRows,
                isUuid,
                inFlightKeys: inFlightRowMaterializationKeysRef.current
              })
            : undefined
        if (
          recovered &&
          latestSid &&
          resolveReconciledSheetId(latestSid, createdSheetIdAliasesRef.current) === canonicalTargetId &&
          followUpPlan &&
          followUpPlan.rowsToMaterialize.length > 0
        ) {
          void chainOnOperationQueue(operationQueueRef, () => processUniverDataChangeRef.current())
        }
      }
    } finally {
      releaseInFlightKeysForRequest()
      sheetPersist.endPersist()
    }
  }, [
    activeSheetColumns,
    activeSheetIdRef,
    buildAddRowPayloadsFromUniverRows,
    canEditWithLockRef,
    chainOnOperationQueue,
    commitRowsForSheet,
    entityEnabledRef,
    getColumnsForSheet,
    getActiveSessionRows,
    getRowsForSheet,
    isUuid,
    isOpsV2Enabled,
    lastProcessedLengthRef,
    latestUniverDataRef,
    markVersionAsChanged,
    markVersionAsSaved,
    multiSheetDebugLog,
    onRowsMaterializedContextSync,
    onPersistRowsErrorMessage,
    onRowAdd,
    operationQueueRef,
    pendingUniverRowsBySheetRef,
    persistAddedRowsWithBatch,
    persistSingleAddedRow,
    recoverFromVersionConflict,
    sheetPersist,
    summarizeRowsForDebug,
    onRowIdentityDiagnostics,
    pendingCreatedSheetSelectionRef,
    createdSheetIdAliasesRef
  ])

  const processUniverDataChangeRef = useRef(processUniverDataChange)
  processUniverDataChangeRef.current = processUniverDataChange

  return { processUniverDataChange, processUniverDataChangeRef }
}
