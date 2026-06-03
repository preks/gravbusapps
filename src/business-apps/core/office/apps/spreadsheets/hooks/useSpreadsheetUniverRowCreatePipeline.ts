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
  protectSpreadsheetPendingLocalMutationCells,
  spreadsheetPendingLocalMutationCoordinateCellKey,
  spreadsheetPendingLocalMutationSemanticCellKey
} from '../utils/spreadsheetPendingMaterializationCells'
import {
  buildRowIdentityDiagnostics,
  getViewerRowIdentityCandidates,
  isSpreadsheetTemporaryClientRowId,
  resolveBackendRowIdForViewerRow,
  rowMatchesRemoteId,
  type ViewerRow
} from '../utils/spreadsheetRowIdentity'
import { patchLatestUniverSnapshotRowBackendIdentities } from '../utils/spreadsheetUniverSnapshotIdentity'
import { promoteSpreadsheetRowIdentities } from '../utils/spreadsheetRowIdentityPromotion'
import {
  buildNarrowAuthoritativeRegionsForPersistedRows,
  buildMaterializationRowsByVisualIndexMap,
  buildOccupiedSlotRowAdoptions,
  buildRowMaterializationInFlightKey,
  buildSpreadsheetRowMaterializationPlan,
  classifyStaleActiveSnapshotRowGaps,
  filterMaterializationEntriesForPersistedSlots,
  getPlannedMaterializationVisualIndices,
  getSpreadsheetRowMaterializationClientRowId,
  mergeCreatedRowsByVisualIndex,
  viewerRowMatchesPersistedRowAtSlot,
  isRowMaterializationInFlightForSheet,
  releaseAllRowMaterializationInFlightKeysForSheet,
  releaseRowMaterializationInFlightKeysForMissingSlots,
  resolveUniverRowsForSubmitReadinessMaterialization,
  type SpreadsheetRowMaterializationPlan
} from './spreadsheetRowMaterializationPlan'
import type {
  UseSpreadsheetUniverRowCreatePipelineParams,
  UseSpreadsheetUniverRowCreatePipelineResult
} from './useSpreadsheetUniverRowCreatePipelineTypes'

const TEMP_ROW_SKIP_MATERIALIZATION_DIAG_SAMPLE_LIMIT = 12
/**
 * Idle window used to coalesce Enter-paced row creation into a single `add_rows` batch.
 * Each new row resets this timer, so consecutive rows added within the window merge.
 */
const ROW_MATERIALIZATION_IDLE_MS = 400
/**
 * Hard cap on how long materialization can be deferred while rows keep arriving.
 * Guarantees rows are persisted periodically during continuous typing instead of
 * being held client-side indefinitely (mitigates the multi-user data-loss window).
 */
const ROW_MATERIALIZATION_MAX_WAIT_MS = 1_200

type MaterializationDebounceState = {
  timer: ReturnType<typeof setTimeout> | null
  /** Timestamp of the first pending row in the current debounce burst, for the max-wait cap. */
  firstScheduledAt: number | null
  resolvers: Array<{ resolve: () => void; reject: (error: unknown) => void }>
}

export function useSpreadsheetUniverRowCreatePipeline(
  params: UseSpreadsheetUniverRowCreatePipelineParams
): UseSpreadsheetUniverRowCreatePipelineResult {
  const {
    activeSheetIdRef,
    activeSheetColumns,
    pendingLocalMutationCellsRef,
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
    requestBoundedAuthoritativeReapply,
    onRowIdentityDiagnostics,
    pendingCreatedSheetSelectionRef,
    createdSheetIdAliasesRef,
    rowMaterializationReadiness,
    rowSlotIdentityRegistry,
    spreadsheetIntentJournalRef,
    versionCausalOwnershipRef
  } = params
  const inFlightRowMaterializationKeysRef = useRef(new Set<string>())
  const materializationDebounceRef = useRef<MaterializationDebounceState>({
    timer: null,
    firstScheduledAt: null,
    resolvers: []
  })

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
      const targetColumns = isActiveTarget ? activeSheetColumns : getColumnsForSheet(canonicalTargetId)
      const staleGapAnalysis =
        reason === 'univer_data_change' && isActiveTarget
          ? classifyStaleActiveSnapshotRowGaps({
              sourceRows,
              persistedRows,
              isUuid
            })
          : {
              staleCandidateRowIndices: [],
              backendLagRowIndices: [],
              unclassifiedGapRowIndices: []
            }
      const staleActiveSnapshotForRowMaterialization =
        reason === 'univer_data_change' && isActiveTarget && staleGapAnalysis.staleCandidateRowIndices.length > 0

      const univerRowsForMaterialization =
        reason === 'submit_readiness' || staleActiveSnapshotForRowMaterialization
          ? resolveUniverRowsForSubmitReadinessMaterialization({
              sessionRows: persistedRows,
              latestUniverRows: sourceRows,
              isUuid
            })
          : sourceRows

      let materializationPlan = buildSpreadsheetRowMaterializationPlan({
        sheetId: canonicalTargetId,
        univerRows: univerRowsForMaterialization,
        persistedRows,
        isUuid,
        inFlightKeys: inFlightRowMaterializationKeysRef.current,
        rowMaterializationReadiness
      })
      if (
        reason === 'submit_readiness' &&
        materializationPlan.missingAndWillCreateCount === 0 &&
        materializationPlan.missingGridRowIndices.length > 0
      ) {
        releaseRowMaterializationInFlightKeysForMissingSlots(
          inFlightRowMaterializationKeysRef.current,
          canonicalTargetId,
          materializationPlan.missingGridRowIndices
        )
        materializationPlan = buildSpreadsheetRowMaterializationPlan({
          sheetId: canonicalTargetId,
          univerRows: univerRowsForMaterialization,
          persistedRows,
          isUuid,
          inFlightKeys: inFlightRowMaterializationKeysRef.current,
          rowMaterializationReadiness
        })
      }
      const materializationFilterRows = staleActiveSnapshotForRowMaterialization ? sourceRows : persistedRows
      const filteredMaterializationPlan = filterMaterializationEntriesForPersistedSlots(
        materializationPlan,
        materializationFilterRows,
        isUuid
      )
      const lastProcessed = isActiveTarget ? lastProcessedLengthRef.current : persistedRows.length
      const rowPayloads = buildAddRowPayloadsFromUniverRows(
        filteredMaterializationPlan.rowsToMaterialize,
        targetColumns
      ).sort((left, right) => Number(left._gridRowIndex) - Number(right._gridRowIndex))
      const staleGapRowIndices = staleActiveSnapshotForRowMaterialization
        ? staleGapAnalysis.staleCandidateRowIndices
        : []
      const futureCoveredStaleRowIndices = staleActiveSnapshotForRowMaterialization
        ? Array.from(
            new Set([
              ...getPlannedMaterializationVisualIndices(filteredMaterializationPlan),
              ...filteredMaterializationPlan.inFlightMissingGridRowIndices
            ])
          ).filter(rowIndex => staleGapRowIndices.includes(rowIndex))
        : []
      const staleRepairRowIndices = staleGapRowIndices.filter(
        rowIndex => !futureCoveredStaleRowIndices.includes(rowIndex)
      )
      const staleRepairRegions =
        staleRepairRowIndices.length > 0
          ? buildNarrowAuthoritativeRegionsForPersistedRows({
              rowIndices: staleRepairRowIndices,
              rows: persistedRows,
              columns: targetColumns
            })
          : []
      const staleRepairTarget =
        staleRepairRegions.length === 0
          ? null
          : staleRepairRegions.length === 1
            ? staleRepairRegions[0]
            : staleRepairRegions
      const scheduleStaleRepairRemainder = (): void => {
        if (!staleActiveSnapshotForRowMaterialization || !staleRepairTarget) return
        requestBoundedAuthoritativeReapply?.(canonicalTargetId, staleRepairTarget, {
          clearAllSignatures: false,
          preferBulk: true,
          reason: 'stale_active_snapshot_row_materialization',
          pendingLocalFilterPolicy: 'protect_in_flight_local_edits'
        })
      }
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
        createdSparseGridRowIndices,
        staleActiveSnapshotForRowMaterialization,
        backendLagStaleRowIndices: staleGapAnalysis.backendLagRowIndices,
        unclassifiedStaleGapRowIndices: staleGapAnalysis.unclassifiedGapRowIndices,
        staleGapRowIndices,
        futureCoveredStaleRowIndices,
        staleRepairRowIndices,
        staleRepairRegions
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
      if (staleActiveSnapshotForRowMaterialization) {
        multiSheetDebugLog('process_univer_data_change_stale_active_snapshot_decision', () => ({
          sheetId: targetSheetId,
          canonicalTargetId,
          reason,
          sourceRowsLength: sourceRows.length,
          persistedRowsLength: persistedRows.length,
          backendLagStaleRowIndices: staleGapAnalysis.backendLagRowIndices,
          unclassifiedStaleGapRowIndices: staleGapAnalysis.unclassifiedGapRowIndices,
          staleGapRowIndices,
          futureCoveredStaleRowIndices,
          staleRepairRowIndices,
          staleRepairRegions,
          rowPayloadCount: rowPayloads.length,
          inFlightMissingGridRowIndices: filteredMaterializationPlan.inFlightMissingGridRowIndices
        }))
        if (staleRepairRegions.length === 0) {
          multiSheetDebugLog('process_univer_data_change_stale_active_snapshot_fully_covered', () => ({
            sheetId: targetSheetId,
            canonicalTargetId,
            futureCoveredStaleRowIndices,
            rowPayloadCount: rowPayloads.length
          }))
        } else if (futureCoveredStaleRowIndices.length > 0) {
          multiSheetDebugLog('process_univer_data_change_stale_active_snapshot_partially_covered', () => ({
            sheetId: targetSheetId,
            canonicalTargetId,
            staleRepairRegions,
            staleRepairRowIndices
          }))
        }
      }

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
          createdGridRowIndices: mergedRows.createdGridRowIndices,
          isActiveTarget,
          createdRows,
          sourceUniverRows: sourceRows
        })
        scheduleStaleRepairRemainder()
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
          syncLocalRowsWithBackendIdentities({
            createdRows: occupiedSlotAdoptions.adoptedRows,
            persistedIdByClientRowId: occupiedSlotAdoptions.persistedIdByClientRowId
          })
          return
        }

        const authoritativeRows = await resolvePersistedRowsForAdoption(canonicalTargetId, isActiveTarget)
        const authoritativeAdoptions = buildOccupiedSlotRowAdoptions({
          univerRows: sourceRows,
          persistedRows: authoritativeRows,
          isUuid
        })
        if (authoritativeAdoptions.persistedIdByClientRowId.size > 0) {
          syncLocalRowsWithBackendIdentities({
            createdRows: authoritativeAdoptions.adoptedRows,
            persistedIdByClientRowId: authoritativeAdoptions.persistedIdByClientRowId
          })
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
        scheduleStaleRepairRemainder()
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
        if (persistedIdByClientRowId.size === 0) return
        promoteSpreadsheetRowIdentities({
          sheetId: canonicalTargetId,
          persistedIdByClientRowId,
          deps: {
            rowMaterializationReadiness,
            rowSlotIdentityRegistry,
            intentJournal: spreadsheetIntentJournalRef?.current,
            versionCausalOwnership: versionCausalOwnershipRef?.current,
            pendingLocalMutationCellsRef
          }
        })
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

      const shouldPreferBatchAddRowsForIdentityAdoption = rowPayloads.some(rowPayload => {
        const clientRowId = typeof rowPayload._clientRowId === 'string' ? rowPayload._clientRowId.trim() : ''
        const gridRowIndex = Number(rowPayload._gridRowIndex)
        return clientRowId.length > 0 || (Number.isFinite(gridRowIndex) && gridRowIndex >= 0)
      })
      const useBatchAddRows =
        isOpsV2Enabled || rowPayloads.length > 1 || !onRowAdd || shouldPreferBatchAddRowsForIdentityAdoption

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

      const protectPendingMaterializationCells = (): (() => void) => {
        if (!pendingLocalMutationCellsRef) return () => undefined
        const protectedEntries: Array<{
          key: string
          ownerId: string
          kind: 'materialization_adoption'
        }> = []
        const visibleColumns = targetColumns.filter(column => column.isVisible !== false)
        for (const rowPayload of rowPayloads) {
          const rowIndex = Number(rowPayload._gridRowIndex)
          if (!Number.isInteger(rowIndex) || rowIndex < 0) continue
          const clientRowId = typeof rowPayload._clientRowId === 'string' ? rowPayload._clientRowId.trim() : ''
          visibleColumns.forEach((column, colIndex) => {
            const hasColumnValue =
              Object.prototype.hasOwnProperty.call(rowPayload, column.name) ||
              Object.prototype.hasOwnProperty.call(rowPayload, column.id)
            if (!hasColumnValue) return
            const key = spreadsheetPendingLocalMutationCoordinateCellKey(canonicalTargetId, rowIndex, colIndex)
            const ownerBase = `materialization:${canonicalTargetId}:${rowIndex}:${colIndex}:${column.name}`
            protectedEntries.push({ key, ownerId: `${ownerBase}:${key}`, kind: 'materialization_adoption' })
            if (clientRowId) {
              const semanticKey = spreadsheetPendingLocalMutationSemanticCellKey(
                canonicalTargetId,
                clientRowId,
                column.name
              )
              protectedEntries.push({
                key: semanticKey,
                ownerId: `${ownerBase}:${semanticKey}`,
                kind: 'materialization_adoption'
              })
            }
          })
        }
        return protectSpreadsheetPendingLocalMutationCells(pendingLocalMutationCellsRef, protectedEntries, {
          ttlMs: 60_000
        })
      }

      const releaseProtectedMaterializationCells = protectPendingMaterializationCells()
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
                updateLocalRowsAfterCreate({
                  createdRows: occupiedSlotAdoptions.adoptedRows,
                  persistedIdByClientRowId: occupiedSlotAdoptions.persistedIdByClientRowId
                })
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
        releaseProtectedMaterializationCells()
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
      pendingLocalMutationCellsRef,
      rowMaterializationReadiness,
      rowSlotIdentityRegistry,
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
      createdSheetIdAliasesRef,
      spreadsheetIntentJournalRef,
      versionCausalOwnershipRef
    ]
  )

  const processUniverDataChange = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      const debounce = materializationDebounceRef.current
      debounce.resolvers.push({ resolve, reject })

      const now = Date.now()
      if (debounce.firstScheduledAt == null) {
        debounce.firstScheduledAt = now
      }
      if (debounce.timer != null) {
        clearTimeout(debounce.timer)
      }

      const flush = () => {
        debounce.timer = null
        debounce.firstScheduledAt = null
        const resolvers = debounce.resolvers
        debounce.resolvers = []
        const latest = latestUniverDataRef.current
        if (!latest) {
          resolvers.forEach(entry => entry.resolve())
          return
        }
        const targetSheetId = latest.sheetId || activeSheetIdRef.current
        void materializeRows({
          targetSheetId,
          sourceRows: latest.data,
          reason: 'univer_data_change'
        }).then(
          () => resolvers.forEach(entry => entry.resolve()),
          error => resolvers.forEach(entry => entry.reject(error))
        )
      }

      // Cap the total deferral so continuous typing still flushes periodically.
      const elapsed = now - debounce.firstScheduledAt
      const remainingMaxWait = Math.max(0, ROW_MATERIALIZATION_MAX_WAIT_MS - elapsed)
      const delay = Math.min(ROW_MATERIALIZATION_IDLE_MS, remainingMaxWait)
      debounce.timer = setTimeout(flush, delay)
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

  const isRowMaterializationInFlightForSheetCallback = useCallback(
    (targetSheetId: string) => {
      const canonicalTargetId = resolveReconciledSheetId(targetSheetId, createdSheetIdAliasesRef.current)
      return isRowMaterializationInFlightForSheet(inFlightRowMaterializationKeysRef.current, canonicalTargetId)
    },
    [createdSheetIdAliasesRef]
  )

  const releaseRowMaterializationInFlightForSheet = useCallback(
    (targetSheetId: string) => {
      const canonicalTargetId = resolveReconciledSheetId(targetSheetId, createdSheetIdAliasesRef.current)
      releaseAllRowMaterializationInFlightKeysForSheet(inFlightRowMaterializationKeysRef.current, canonicalTargetId)
    },
    [createdSheetIdAliasesRef]
  )

  return {
    processUniverDataChange,
    processUniverDataChangeRef,
    materializeTemporaryRowsForSubmit,
    isRowMaterializationInFlightForSheet: isRowMaterializationInFlightForSheetCallback,
    releaseRowMaterializationInFlightForSheet
  }
}
