import { useCallback, useRef } from 'react'

import {
  SpreadsheetApiRequestError,
  getSpreadsheetBatchErrorCode,
  isSpreadsheetBatchErrorExplicitlyNonRetryable
} from '../services/SpreadsheetApiService'
import {
  areCanonicalSheetIdsEqual,
  isSheetCreationAwaitingPersistedId,
  resolveReconciledSheetId
} from '../utils/reconcileTemporarySheetId'
import { getViewerRowVisualIndex } from '../utils/spreadsheetPeerRowHydration'
import {
  buildRowIdentityDiagnostics,
  getViewerRowIdentityCandidates,
  isSpreadsheetTemporaryClientRowId,
  resolveBackendRowIdForViewerRow,
  rowMatchesRemoteId,
  type ViewerRow
} from '../utils/spreadsheetRowIdentity'
import { patchLatestUniverSnapshotRowBackendIdentities } from '../utils/spreadsheetUniverSnapshotIdentity'
import {
  buildMaterializationRowsByVisualIndexMap,
  buildOccupiedSlotRowAdoptions,
  buildRowMaterializationInFlightKey,
  buildSpreadsheetRowMaterializationPlan,
  filterMaterializationEntriesForPersistedSlots,
  getSpreadsheetRowMaterializationClientRowId,
  mergeCreatedRowsByVisualIndex,
  viewerRowMatchesPersistedRowAtSlot,
  type SpreadsheetRowMaterializationPlan
} from './spreadsheetRowMaterializationPlan'
import type {
  UseSpreadsheetUniverRowCreatePipelineParams,
  UseSpreadsheetUniverRowCreatePipelineResult
} from './useSpreadsheetUniverRowCreatePipelineTypes'

const TEMP_ROW_SKIP_MATERIALIZATION_DIAG_SAMPLE_LIMIT = 12

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
    fetchAuthoritativeRowsForSheet,
    summarizeRowsForDebug,
    getRowsForSheet,
    multiSheetDebugLog,
    commitRowsForSheet,
    onRowsMaterializedContextSync,
    onRowIdentityDiagnostics,
    pendingCreatedSheetSelectionRef,
    createdSheetIdAliasesRef,
    rowMaterializationReadiness
  } = params
  const inFlightRowMaterializationKeysRef = useRef(new Set<string>())

  const resolvePersistedRowsForAdoption = useCallback(
    async (targetSheetId: string, preferActiveSession: boolean): Promise<Array<Record<string, unknown>>> => {
      const authoritativeRows = await fetchAuthoritativeRowsForSheet?.(targetSheetId)
      if (authoritativeRows && authoritativeRows.length > 0) {
        return authoritativeRows
      }
      if (preferActiveSession) {
        return getActiveSessionRows()
      }
      return getRowsForSheet(targetSheetId)
    },
    [fetchAuthoritativeRowsForSheet, getActiveSessionRows, getRowsForSheet]
  )

  const materializeRows = useCallback(
    async ({
      targetSheetId,
      sourceRows,
      reason
    }: {
      targetSheetId: string
      sourceRows: Array<Record<string, unknown>>
      reason: 'univer_data_change' | 'submit_readiness'
    }) => {
      if (entityEnabledRef.current || !canEditWithLockRef.current) {
        return
      }
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
      const staleActiveSnapshotForRowMaterialization =
        reason === 'univer_data_change' && isActiveTarget && sourceRows.length < persistedRows.length

      if (staleActiveSnapshotForRowMaterialization) {
        multiSheetDebugLog('process_univer_data_change_skip_stale_active_snapshot', () => ({
          sheetId: targetSheetId,
          canonicalTargetId,
          reason,
          sourceRowsLength: sourceRows.length,
          persistedRowsLength: persistedRows.length,
          sourceRows: summarizeRowsForDebug(sourceRows),
          persistedRows: summarizeRowsForDebug(persistedRows)
        }))
        return
      }

      const materializationPlan = buildSpreadsheetRowMaterializationPlan({
        sheetId: canonicalTargetId,
        univerRows: sourceRows,
        persistedRows,
        isUuid,
        inFlightKeys: inFlightRowMaterializationKeysRef.current,
        rowMaterializationReadiness
      })
      const filteredMaterializationPlan = filterMaterializationEntriesForPersistedSlots(
        materializationPlan,
        persistedRows,
        isUuid
      )
      const lastProcessed = isActiveTarget ? lastProcessedLengthRef.current : persistedRows.length
      const targetColumns = isActiveTarget ? activeSheetColumns : getColumnsForSheet(canonicalTargetId)
      const rowPayloads = buildAddRowPayloadsFromUniverRows(
        filteredMaterializationPlan.rowsToMaterialize,
        targetColumns
      )
      const buildMaterializationPlanDiagnostics = (
        plan: SpreadsheetRowMaterializationPlan,
        createdSparseGridRowIndices: number[] = []
      ) => ({
        sheetId: targetSheetId,
        canonicalTargetId,
        reason,
        newDataLength: sourceRows.length,
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
        reason,
        newData: summarizeRowsForDebug(sourceRows),
        localSheetData: summarizeRowsForDebug(persistedRows),
        lastProcessedLength: lastProcessed,
        activeSheetId: activeSheetIdRef.current
      }))
      multiSheetDebugLog('process_univer_data_change_materialization_plan', () =>
        buildMaterializationPlanDiagnostics(materializationPlan)
      )

      const syncLocalRowsWithBackendIdentities = ({
        createdRows,
        persistedIdByClientRowId
      }: {
        createdRows: Array<Record<string, unknown>>
        persistedIdByClientRowId: Map<string, string>
      }) => {
        const mergedRows = mergeCreatedRowsByVisualIndex({
          previousRows: persistedRows,
          univerRows: sourceRows,
          createdRows,
          isUuid
        })
        const next = mergedRows.rows
        const affectedUiRowIds = mergedRows.affectedUiRowIds
        if (reason === 'univer_data_change' && isActiveTarget) {
          lastProcessedLengthRef.current = sourceRows.length
        }
        pendingUniverRowsBySheetRef.current.delete(targetSheetId)
        multiSheetDebugLog('process_univer_data_change_rows_created', () => ({
          sheetId: targetSheetId,
          reason,
          previousLocalRows: summarizeRowsForDebug(persistedRows),
          createdRows: summarizeRowsForDebug(createdRows),
          nextRows: summarizeRowsForDebug(next),
          newData: summarizeRowsForDebug(sourceRows),
          createdSparseGridRowIndices: mergedRows.createdGridRowIndices
        }))
        multiSheetDebugLog('process_univer_data_change_materialization_plan', () =>
          buildMaterializationPlanDiagnostics(materializationPlan, mergedRows.createdGridRowIndices)
        )
        commitRowsForSheet(canonicalTargetId, next, { syncGrid: false })
        const latestSnapshot = latestUniverDataRef.current
        if (
          latestSnapshot &&
          areCanonicalSheetIdsEqual(latestSnapshot.sheetId, canonicalTargetId, createdSheetIdAliasesRef.current)
        ) {
          latestUniverDataRef.current = {
            ...latestSnapshot,
            data: patchLatestUniverSnapshotRowBackendIdentities({
              latestRows: latestSnapshot.data as ViewerRow[],
              authoritativeRows: next as ViewerRow[],
              persistedIdByClientRowId,
              isUuid
            })
          }
        }
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

      if (rowPayloads.length === 0) {
        const occupiedSlotAdoptions = buildOccupiedSlotRowAdoptions({
          univerRows: sourceRows,
          persistedRows,
          isUuid
        })
        if (occupiedSlotAdoptions.persistedIdByClientRowId.size > 0) {
          syncLocalRowsWithBackendIdentities(occupiedSlotAdoptions)
          return
        }

        const authoritativeRows = await resolvePersistedRowsForAdoption(canonicalTargetId, isActiveTarget)
        const authoritativeAdoptions = buildOccupiedSlotRowAdoptions({
          univerRows: sourceRows,
          persistedRows: authoritativeRows,
          isUuid
        })
        if (authoritativeAdoptions.persistedIdByClientRowId.size > 0) {
          syncLocalRowsWithBackendIdentities(authoritativeAdoptions)
          return
        }

        const rowsToMaterializeCount = filteredMaterializationPlan.rowsToMaterialize.length
        let firstUnpersistedTempRowVisualIndex: number | null = null
        const hasTempUniverRowWithoutBackend = sourceRows.some((row, index) => {
          const record = row as Record<string, unknown>
          const id = typeof record._id === 'string' ? record._id : ''
          const cid = typeof record._clientRowId === 'string' ? record._clientRowId : ''
          const hasTemp = isSpreadsheetTemporaryClientRowId(id) || isSpreadsheetTemporaryClientRowId(cid)
          if (!hasTemp || resolveBackendRowIdForViewerRow(record, isUuid)) {
            return false
          }
          if (firstUnpersistedTempRowVisualIndex === null) {
            firstUnpersistedTempRowVisualIndex = getViewerRowVisualIndex(record, index)
          }
          return true
        })
        const allMissingRowSlotsInFlight =
          materializationPlan.missingGridRowIndices.length > 0 && materializationPlan.missingAndWillCreateCount === 0

        if (rowsToMaterializeCount === 0 && (hasTempUniverRowWithoutBackend || allMissingRowSlotsInFlight)) {
          const skipDiagnostics = hasTempUniverRowWithoutBackend
            ? (() => {
                const persistedByVisual = buildMaterializationRowsByVisualIndexMap(persistedRows, isUuid)
                const tempUnpersistedSlotSamples: Array<{
                  sourceRowArrayIndex: number
                  visualIndex: number
                  viewer_id?: string
                  viewer_clientRowId?: string
                  viewerResolvedBackend?: string
                  identityCandidates: string[]
                  persistedPresentAtSlot: boolean
                  persistedBackendAtSlot?: string
                  persisted_id?: string
                  persisted_clientRowId?: string
                  rowMatchesRemoteIdWithPersistedBackend: boolean
                  viewerRowMatchesPersistedSlot: boolean
                  inFlightKey: string
                  inFlightKeyPresent: boolean
                }> = []
                sourceRows.forEach((row, sourceRowArrayIndex) => {
                  const record = row as Record<string, unknown>
                  const id = typeof record._id === 'string' ? record._id : ''
                  const cid = typeof record._clientRowId === 'string' ? record._clientRowId : ''
                  const hasTemp = isSpreadsheetTemporaryClientRowId(id) || isSpreadsheetTemporaryClientRowId(cid)
                  if (!hasTemp || resolveBackendRowIdForViewerRow(record, isUuid)) {
                    return
                  }
                  if (tempUnpersistedSlotSamples.length >= TEMP_ROW_SKIP_MATERIALIZATION_DIAG_SAMPLE_LIMIT) {
                    return
                  }
                  const visualIndex = getViewerRowVisualIndex(record, sourceRowArrayIndex)
                  const persistedRow = persistedByVisual.get(visualIndex) as ViewerRow | undefined
                  const persistedBackend = persistedRow
                    ? resolveBackendRowIdForViewerRow(persistedRow, isUuid)
                    : undefined
                  const viewerResolved = resolveBackendRowIdForViewerRow(record, isUuid)
                  const slotMatch = Boolean(
                    persistedRow && persistedBackend && viewerRowMatchesPersistedRowAtSlot(record, persistedRow, isUuid)
                  )
                  const remoteMatch = persistedBackend ? rowMatchesRemoteId(record, persistedBackend) : false
                  const matClientId = getSpreadsheetRowMaterializationClientRowId(record)
                  const inFlightKey = buildRowMaterializationInFlightKey(canonicalTargetId, visualIndex, matClientId)
                  tempUnpersistedSlotSamples.push({
                    sourceRowArrayIndex,
                    visualIndex,
                    viewer_id: id || undefined,
                    viewer_clientRowId: cid || undefined,
                    viewerResolvedBackend: viewerResolved || undefined,
                    identityCandidates: getViewerRowIdentityCandidates(record).slice(0, 8),
                    persistedPresentAtSlot: Boolean(persistedRow),
                    persistedBackendAtSlot: persistedBackend || undefined,
                    persisted_id: persistedRow && typeof persistedRow._id === 'string' ? persistedRow._id : undefined,
                    persisted_clientRowId:
                      persistedRow && typeof persistedRow._clientRowId === 'string'
                        ? persistedRow._clientRowId
                        : undefined,
                    rowMatchesRemoteIdWithPersistedBackend: remoteMatch,
                    viewerRowMatchesPersistedSlot: slotMatch,
                    inFlightKey,
                    inFlightKeyPresent: inFlightRowMaterializationKeysRef.current.has(inFlightKey)
                  })
                })
                return {
                  persistedVsUniverLengthDelta: persistedRows.length - sourceRows.length,
                  persistedVisualSlotCount: persistedByVisual.size,
                  tempUnpersistedSlotSamples,
                  tempUnpersistedSlotSampleLimit: TEMP_ROW_SKIP_MATERIALIZATION_DIAG_SAMPLE_LIMIT,
                  ...(tempUnpersistedSlotSamples.length >= TEMP_ROW_SKIP_MATERIALIZATION_DIAG_SAMPLE_LIMIT
                    ? { tempUnpersistedSlotSamplesTruncated: true as const }
                    : {})
                }
              })()
            : {
                persistedVsUniverLengthDelta: persistedRows.length - sourceRows.length,
                persistedVisualSlotCount: buildMaterializationRowsByVisualIndexMap(persistedRows, isUuid).size,
                inFlightMaterializationKeySample: Array.from(inFlightRowMaterializationKeysRef.current).slice(0, 12),
                inFlightMaterializationKeyCount: inFlightRowMaterializationKeysRef.current.size
              }

          console.warn('[SpreadsheetRowCreate] skipped add_rows: empty rowsToMaterialize', {
            reason: hasTempUniverRowWithoutBackend
              ? 'temporary_client_rows_in_univer_data_but_planner_queued_none'
              : 'missing_visual_row_slots_but_all_in_flight',
            targetReason: reason,
            sheetId: canonicalTargetId,
            newDataLength: sourceRows.length,
            persistedRowsLength: persistedRows.length,
            lastProcessedLength: lastProcessed,
            missingGridRowIndices: materializationPlan.missingGridRowIndices,
            alreadyMaterializedVisualIndices: materializationPlan.alreadyMaterializedGridRowIndices,
            missingAndWillCreateCount: materializationPlan.missingAndWillCreateCount,
            inFlightMissingGridRowIndices: materializationPlan.inFlightMissingGridRowIndices,
            unmaterializedClientRowIdCount: materializationPlan.unmaterializedClientRowIds.length,
            ...(firstUnpersistedTempRowVisualIndex !== null ? { firstUnpersistedTempRowVisualIndex } : {}),
            ...skipDiagnostics
          })
          multiSheetDebugLog('process_univer_data_change_skip_materialization_diagnostics', () => ({
            skipKind: hasTempUniverRowWithoutBackend
              ? 'temporary_client_rows_in_univer_data_but_planner_queued_none'
              : 'missing_visual_row_slots_but_all_in_flight',
            targetReason: reason,
            sheetId: canonicalTargetId,
            ...skipDiagnostics
          }))
          if ('tempUnpersistedSlotSamples' in skipDiagnostics) {
            console.warn(
              `[SpreadsheetRowCreate] tempUnpersistedSlotSamples_json sheetId=${canonicalTargetId} targetReason=${reason}\n` +
                JSON.stringify(skipDiagnostics.tempUnpersistedSlotSamples, null, 2)
            )
          } else if ('inFlightMaterializationKeySample' in skipDiagnostics) {
            console.warn(
              `[SpreadsheetRowCreate] inFlightMaterializationKeys_json sheetId=${canonicalTargetId} targetReason=${reason}\n` +
                JSON.stringify(
                  {
                    inFlightMaterializationKeyCount: skipDiagnostics.inFlightMaterializationKeyCount,
                    inFlightMaterializationKeySample: skipDiagnostics.inFlightMaterializationKeySample
                  },
                  null,
                  2
                )
            )
          }
        }

        if (
          reason === 'univer_data_change' &&
          isActiveTarget &&
          materializationPlan.missingGridRowIndices.length === 0
        ) {
          lastProcessedLengthRef.current = sourceRows.length
        }
        multiSheetDebugLog('process_univer_data_change_skip_no_new_rows', () => ({
          sheetId: targetSheetId,
          reason,
          newDataLength: sourceRows.length,
          lastProcessedLength: lastProcessed,
          visualIndexPlannerFoundMissingRows: materializationPlan.missingGridRowIndices.length > 0,
          inFlightMissingGridRowIndices: materializationPlan.inFlightMissingGridRowIndices
        }))
        return
      }

      sheetPersist.markDirty()
      markVersionAsChanged()

      const inFlightKeysForRequest = filteredMaterializationPlan.entries.map(entry => entry.inFlightKey)
      const releaseInFlightKeysForRequest = () => {
        inFlightKeysForRequest.forEach(key => inFlightRowMaterializationKeysRef.current.delete(key))
      }
      inFlightKeysForRequest.forEach(key => inFlightRowMaterializationKeysRef.current.add(key))

      const readinessPendingResolvers = new Map<
        string,
        { resolve: (backendRowId: string) => void; reject: (error: unknown) => void }
      >()
      filteredMaterializationPlan.entries.forEach(entry => {
        if (!entry.clientRowId || !rowMaterializationReadiness) return
        const promise = new Promise<string>((resolvePromise, rejectPromise) => {
          readinessPendingResolvers.set(entry.clientRowId, {
            resolve: resolvePromise,
            reject: rejectPromise
          })
        })
        rowMaterializationReadiness.registerPending(canonicalTargetId, entry.clientRowId, promise)
      })

      const resolveReadinessEntries = (persistedIdByClientRowId: Map<string, string>) => {
        if (!rowMaterializationReadiness) return
        rowMaterializationReadiness.resolveMany(canonicalTargetId, persistedIdByClientRowId)
        persistedIdByClientRowId.forEach((backendRowId, clientRowId) => {
          const resolver = readinessPendingResolvers.get(clientRowId)
          if (!resolver) return
          resolver.resolve(backendRowId)
          readinessPendingResolvers.delete(clientRowId)
        })
      }

      const rejectReadinessEntries = (error: unknown) => {
        if (!rowMaterializationReadiness) return
        filteredMaterializationPlan.entries.forEach(entry => {
          if (!entry.clientRowId) return
          rowMaterializationReadiness.reject(canonicalTargetId, entry.clientRowId, error)
          const resolver = readinessPendingResolvers.get(entry.clientRowId)
          if (!resolver) return
          resolver.reject(error)
          readinessPendingResolvers.delete(entry.clientRowId)
        })
      }

      const useBatchAddRows = isOpsV2Enabled || rowPayloads.length > 1 || !onRowAdd

      const updateLocalRowsAfterCreate = ({
        createdRows,
        persistedIdByClientRowId
      }: {
        createdRows: Array<Record<string, unknown>>
        persistedIdByClientRowId: Map<string, string>
      }) => {
        resolveReadinessEntries(persistedIdByClientRowId)
        syncLocalRowsWithBackendIdentities({ createdRows, persistedIdByClientRowId })
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
        rejectReadinessEntries(error)
        console.error('[SpreadsheetAppViewer] Failed to persist added rows:', error)
        sheetPersist.recordError(onPersistRowsErrorMessage)
        if (error instanceof SpreadsheetApiRequestError && error.status === 409) {
          releaseInFlightKeysForRequest()
          const batchErrorCode = getSpreadsheetBatchErrorCode(error.details)
          if (isSpreadsheetBatchErrorExplicitlyNonRetryable(error.details)) {
            if (batchErrorCode === 'row_position_conflict') {
              await recoverFromVersionConflict()
              const freshRows = await resolvePersistedRowsForAdoption(canonicalTargetId, isActiveTarget)
              const occupiedSlotAdoptions = buildOccupiedSlotRowAdoptions({
                univerRows: sourceRows,
                persistedRows: freshRows,
                isUuid
              })
              if (occupiedSlotAdoptions.persistedIdByClientRowId.size > 0) {
                updateLocalRowsAfterCreate(occupiedSlotAdoptions)
                sheetPersist.recordSuccess(true)
                markVersionAsSaved()
                return
              }
            }
            return
          }
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
                  inFlightKeys: inFlightRowMaterializationKeysRef.current,
                  rowMaterializationReadiness
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
        if (readinessPendingResolvers.size > 0) {
          const unresolvedError = new Error('Row materialization completed without publishing readiness mappings')
          rejectReadinessEntries(unresolvedError)
        }
        releaseInFlightKeysForRequest()
        sheetPersist.endPersist()
      }
    },
    [
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
      rowMaterializationReadiness,
      operationQueueRef,
      pendingUniverRowsBySheetRef,
      persistAddedRowsWithBatch,
      persistSingleAddedRow,
      recoverFromVersionConflict,
      fetchAuthoritativeRowsForSheet,
      resolvePersistedRowsForAdoption,
      sheetPersist,
      summarizeRowsForDebug,
      onRowIdentityDiagnostics,
      pendingCreatedSheetSelectionRef,
      createdSheetIdAliasesRef
    ]
  )

  const processUniverDataChange = useCallback(async () => {
    const latest = latestUniverDataRef.current
    if (!latest) return
    const targetSheetId = latest.sheetId || activeSheetIdRef.current
    await materializeRows({
      targetSheetId,
      sourceRows: latest.data,
      reason: 'univer_data_change'
    })
  }, [activeSheetIdRef, latestUniverDataRef, materializeRows])

  const materializeTemporaryRowsForSubmit = useCallback(
    async (targetSheetId: string, rows: Array<Record<string, unknown>>) => {
      await materializeRows({
        targetSheetId,
        sourceRows: rows.map((row, index) => ({
          ...row,
          _gridRowIndex: getViewerRowVisualIndex(row, index)
        })),
        reason: 'submit_readiness'
      })
    },
    [materializeRows]
  )

  const processUniverDataChangeRef = useRef(processUniverDataChange)
  processUniverDataChangeRef.current = processUniverDataChange

  return { processUniverDataChange, processUniverDataChangeRef, materializeTemporaryRowsForSubmit }
}
