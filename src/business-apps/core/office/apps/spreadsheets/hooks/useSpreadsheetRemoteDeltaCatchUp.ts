import { useCallback, useRef, type MutableRefObject } from 'react'

import type { SpreadsheetSheet } from '../types'
import type { SpreadsheetCollaborationManager } from '../services/SpreadsheetCollaborationManager'
import type { SpreadsheetMutationFacade } from '../core'
import type { SpreadsheetSessionDiffProjectionMode } from '../core/SpreadsheetCollaborationContract'
import {
  replayRemoteDeltaThroughCollaborationManager,
  applyRemoteFetchedSheetDelta,
  SpreadsheetSnapshotFallbackController,
  sheetDeltaRequiresFullSnapshot,
  type SpreadsheetSnapshotFallbackReason,
  type SpreadsheetSession
} from '../core'
import type { SpreadsheetTraceEventInput, SpreadsheetTraceSession } from '../services/spreadsheetDiagnostics'

import type { SheetDeltaCatchUpReason, SheetDeltaCatchUpOptions } from './spreadsheetRemoteSyncTypes'
import {
  estimateAuthoritativeGridReapplyTargetCellCount,
  tryComputeAuthoritativeRegionsFromReplayDeltas,
  type AuthoritativeGridReapplyTarget
} from '../utils/spreadsheetAuthoritativeRegion'
import { countReplayDeltaChangeKinds, partitionReplayDeltaChanges } from '../utils/spreadsheetReplayDeltaPartition'
import {
  getSheetCoverageVersion,
  hasSheetCoverageVersion,
  type SpreadsheetSnapshotCoversVersions
} from '../utils/spreadsheetSnapshotCoverage'

import type { SpreadsheetCellIntentRecord } from '../core/spreadsheetIntentJournal'

export interface SpreadsheetLocalWorkGuard {
  hasUnresolvedLocalWorkForSheet: (sheetId: string) => boolean
  listLocalIntentsForSheet: (sheetId: string) => SpreadsheetCellIntentRecord[]
  markLocalIntentsFailedForSheet: (sheetId: string) => void
}

export interface UseSpreadsheetRemoteDeltaCatchUpParams {
  entityEnabled: boolean
  spreadsheetSession: SpreadsheetSession
  enqueueDiagnosticsTraceEvent: (event: SpreadsheetTraceEventInput) => void
  activeTraceSessionRef: MutableRefObject<SpreadsheetTraceSession | null>
  rememberKnownSheetVersion: (sheetId: string, version: number) => void
  resolveKnownSheetVersion: (sheetId: string) => number
  workbookSnapshotCoversVersionsRef: MutableRefObject<SpreadsheetSnapshotCoversVersions>
  syncSheetRowsIntoLocalState: (
    sheetId: string,
    rows: Record<string, unknown>[],
    options?: {
      persisted?: boolean
      syncGrid?: boolean
      sessionDiffProjectionMode?: SpreadsheetSessionDiffProjectionMode
      version?: number
      authoritativeGridRegion?: AuthoritativeGridReapplyTarget
    }
  ) => void
  getKnownRowsForSheet: (sheetId: string) => Record<string, unknown>[]
  hasPendingCellPersistence: () => boolean
  activeSheetIdRef: MutableRefObject<string>
  appSheetsRef: MutableRefObject<SpreadsheetSheet[]>
  collaborationManagerRef: MutableRefObject<SpreadsheetCollaborationManager | null>
  mutationFacadeRef: MutableRefObject<SpreadsheetMutationFacade | null>
  pendingCreatedSheetSelectionRef: MutableRefObject<{
    temporarySheetId: string
    persistedSheetId: string | null
  } | null>
  reloadSheetFromCanonicalSnapshot: (seedPrefix: string, targetSheetId?: string) => Promise<boolean>
  scheduleSheetVersionRefreshFromApi: (requestedSheetId?: string) => void
  localWorkGuard?: SpreadsheetLocalWorkGuard
}

export function useSpreadsheetRemoteDeltaCatchUp(params: UseSpreadsheetRemoteDeltaCatchUpParams): {
  requestSheetDeltaCatchUp: (
    targetSheetId: string,
    reason: SheetDeltaCatchUpReason,
    options?: SheetDeltaCatchUpOptions
  ) => Promise<boolean>
} {
  const OPERATION_VERSION_STREAM = 'sheet_operations' as const
  const catchUpInFlightBySheetRef = useRef(new Map<string, Promise<boolean>>())
  const fallbackReloadsByKeyRef = useRef(new Map<string, Promise<boolean>>())
  const snapshotFallbackControllerRef = useRef<SpreadsheetSnapshotFallbackController | null>(null)
  const reportStaleRecoveryLifecycle = useCallback(
    (payload: { sheetId: string; stage: string; version?: number | null }) => {
      const manager = params.collaborationManagerRef.current as {
        reportStaleRecoveryLifecycle?: (args: typeof payload) => void
      } | null
      if (typeof manager?.reportStaleRecoveryLifecycle !== 'function') {
        return
      }
      manager.reportStaleRecoveryLifecycle(payload)
    },
    [params.collaborationManagerRef]
  )

  if (!snapshotFallbackControllerRef.current) {
    snapshotFallbackControllerRef.current = new SpreadsheetSnapshotFallbackController(request => {
      const key = `${request.sheetId ?? 'active'}:${request.reason}:${request.immediate === true}`
      const task = params.reloadSheetFromCanonicalSnapshot(`delta-catchup-${request.reason}`, request.sheetId)
      fallbackReloadsByKeyRef.current.set(key, task)
      void task.finally(() => {
        fallbackReloadsByKeyRef.current.delete(key)
      })
    })
  }

  const requireMutationFacade = (): SpreadsheetMutationFacade => {
    const facade = params.mutationFacadeRef.current
    if (!facade) {
      throw new Error('Spreadsheet mutation facade is not initialized yet')
    }
    return facade
  }

  const resolveCatchUpFallbackReason = (
    sinceVersion: number,
    delta: { currentVersion: number; changes?: unknown[]; requiresSnapshot?: boolean }
  ): SpreadsheetSnapshotFallbackReason => {
    if (delta.requiresSnapshot) return 'requires_snapshot'
    if (delta.currentVersion > sinceVersion && (!delta.changes || delta.changes.length === 0)) return 'missing_version'
    const applied = (delta.changes ?? [])
      .map(change => Number((change as Record<string, unknown>).appliedVersion))
      .filter(value => Number.isFinite(value) && value > 0)
    if (applied.length === 0) return 'missing_version'
    return Math.min(...applied) > sinceVersion + 1 ? 'version_gap' : 'planning_failure'
  }

  const requestCatchUpSnapshotFallback = async (paramsForFallback: {
    targetSheetId: string
    reason: SheetDeltaCatchUpReason
    fallbackReason: SpreadsheetSnapshotFallbackReason
    sinceVersion: number
    currentVersion: number
    changeCount: number
    requiresSnapshot: boolean
  }): Promise<boolean> => {
    if (!paramsForFallback.requiresSnapshot) {
      const failedIntentCount =
        params.localWorkGuard?.markLocalIntentsFailedForSheet(paramsForFallback.targetSheetId) ?? 0
      params.enqueueDiagnosticsTraceEvent({
        source: 'client',
        stage: 'client_delta_catchup_snapshot_skipped',
        severity: 'warning',
        traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
        version: paramsForFallback.currentVersion,
        payload: {
          source: 'delta_catchup',
          recoveryPath: 'ops_gap_unrecoverable',
          reason: paramsForFallback.fallbackReason,
          catchUpReason: paramsForFallback.reason,
          versionStream: OPERATION_VERSION_STREAM,
          targetSheetId: paramsForFallback.targetSheetId,
          sinceVersion: paramsForFallback.sinceVersion,
          changeCount: paramsForFallback.changeCount,
          requiresSnapshot: false,
          failedIntentCount
        }
      })
      return false
    }

    const scheduled = snapshotFallbackControllerRef.current?.requestFallback({
      sheetId: paramsForFallback.targetSheetId,
      reason: paramsForFallback.fallbackReason,
      immediate: paramsForFallback.targetSheetId === params.activeSheetIdRef.current,
      detail: paramsForFallback.reason
    })
    params.enqueueDiagnosticsTraceEvent({
      source: 'client',
      stage: scheduled ? 'client_snapshot_fallback_scheduled' : 'client_snapshot_fallback_deduplicated',
      severity: scheduled ? 'warning' : 'info',
      traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
      version: paramsForFallback.currentVersion,
      payload: {
        source: 'delta_catchup',
        recoveryPath: paramsForFallback.requiresSnapshot ? 'explicit_snapshot_required' : 'ops_gap_unrecoverable',
        reason: paramsForFallback.fallbackReason,
        catchUpReason: paramsForFallback.reason,
        versionStream: OPERATION_VERSION_STREAM,
        targetSheetId: paramsForFallback.targetSheetId,
        sinceVersion: paramsForFallback.sinceVersion,
        changeCount: paramsForFallback.changeCount,
        requiresSnapshot: paramsForFallback.requiresSnapshot
      }
    })
    const key = `${paramsForFallback.targetSheetId}:${paramsForFallback.fallbackReason}:${
      paramsForFallback.targetSheetId === params.activeSheetIdRef.current
    }`
    const task = fallbackReloadsByKeyRef.current.get(key)
    return task ? task : Boolean(scheduled)
  }

  const requestSheetDeltaCatchUp = useCallback(
    async (
      targetSheetId: string,
      reason: SheetDeltaCatchUpReason,
      options?: SheetDeltaCatchUpOptions
    ): Promise<boolean> => {
      if (!targetSheetId || params.entityEnabled) return false
      const pendingCreated = params.pendingCreatedSheetSelectionRef.current
      if (
        pendingCreated &&
        pendingCreated.persistedSheetId === null &&
        pendingCreated.temporarySheetId === targetSheetId
      ) {
        return false
      }
      // Note: prior versions of this hook deferred catch-up whenever
      // `hasPendingCellPersistence()` was true to avoid clobbering local
      // typing. That deferral is no longer needed — the sheet work queue
      // tracks per-cell ownership and the collab callbacks
      // (`applyRemoteCellUpdate` / `applyRemoteCellUpdatesBulk`) skip the
      // visible grid paint for any cell with an unresolved local intent.
      // Catch-up therefore runs immediately; the backend response (Tier 1
      // `results[]`) is the source of truth for resolving each pending edit.

      const existing = catchUpInFlightBySheetRef.current.get(targetSheetId)
      if (existing) return existing

      const task = (async () => {
        const checkpointCoverageVersion = hasSheetCoverageVersion(
          params.workbookSnapshotCoversVersionsRef.current,
          targetSheetId
        )
          ? getSheetCoverageVersion(params.workbookSnapshotCoversVersionsRef.current, targetSheetId)
          : null
        const sinceVersion =
          typeof options?.sinceVersion === 'number' && Number.isFinite(options.sinceVersion)
            ? Math.max(0, Math.trunc(options.sinceVersion))
            : checkpointCoverageVersion != null
              ? checkpointCoverageVersion
              : Math.max(0, params.resolveKnownSheetVersion(targetSheetId))
        reportStaleRecoveryLifecycle({
          sheetId: targetSheetId,
          stage: 'catchup_started',
          version: options?.incomingVersion ?? sinceVersion
        })
        params.enqueueDiagnosticsTraceEvent({
          source: 'client',
          stage: 'client_delta_catchup_started',
          traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
          version: options?.incomingVersion ?? null,
          payload: {
            reason,
            targetSheetId,
            sinceVersion,
            checkpointCoverageVersion,
            incomingVersion: options?.incomingVersion ?? null,
            versionStream: OPERATION_VERSION_STREAM
          }
        })

        const applyFetchedDeltaCatchUp = async (
          delta: Awaited<ReturnType<SpreadsheetMutationFacade['fetchSheetChangesSince']>>,
          appliedSinceVersion: number,
          catchUpReason: SheetDeltaCatchUpReason
        ): Promise<boolean> => {
          const currentVersion = Number(delta.currentVersion || appliedSinceVersion)
          if (currentVersion <= appliedSinceVersion) {
            reportStaleRecoveryLifecycle({
              sheetId: targetSheetId,
              stage: 'catchup_noop',
              version: currentVersion
            })
            params.workbookSnapshotCoversVersionsRef.current = {
              ...params.workbookSnapshotCoversVersionsRef.current,
              [targetSheetId]: Math.max(appliedSinceVersion, currentVersion)
            }
            params.enqueueDiagnosticsTraceEvent({
              source: 'client',
              stage: 'client_delta_catchup_noop',
              traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
              version: currentVersion,
              payload: {
                reason: catchUpReason,
                targetSheetId,
                sinceVersion: appliedSinceVersion,
                versionStream: OPERATION_VERSION_STREAM
              }
            })
            return true
          }

          const targetSheet = params.appSheetsRef.current.find(sheet => sheet.id === targetSheetId)
          const baseRows = params.getKnownRowsForSheet(targetSheetId)
          // Only structural ops (rows, columns, styles, moves, merges, etc.) need to be replayed
          // through the collaboration manager onto the live Univer grid. Pure cell-value ops
          // (`set_cell` / `set_range` / `clear_cell` / `cells_changed`) are intentionally
          // excluded: the session row state below + the authoritative-region Univer re-sync
          // triggered by `syncSheetRowsIntoLocalState({ syncGrid: true, authoritativeGridRegion })`
          // paint those values once. Replaying them here would trigger thousands of per-cell
          // Univer `setValue` commands that dominate CPU during catch-up.
          const { structuralChanges } = partitionReplayDeltaChanges(delta.changes)
          const replayThroughManager = replayRemoteDeltaThroughCollaborationManager({
            collaborationManager: params.collaborationManagerRef.current,
            changes: structuralChanges,
            currentVersion,
            sheetId: targetSheetId,
            traceSessionId: params.activeTraceSessionRef.current?.id
          })
          const nextRows = applyRemoteFetchedSheetDelta({
            spreadsheetSession: params.spreadsheetSession,
            sheetId: targetSheetId,
            changes: delta.changes,
            columns: targetSheet?.columns ?? [],
            version: currentVersion,
            baseRows,
            targetSheet
          })
          params.rememberKnownSheetVersion(targetSheetId, currentVersion)
          params.workbookSnapshotCoversVersionsRef.current = {
            ...params.workbookSnapshotCoversVersionsRef.current,
            [targetSheetId]: currentVersion
          }
          const isActiveTarget = targetSheetId === params.activeSheetIdRef.current
          // Region is resolved against the **post-replay** row set so add_rows / insert_rows_at
          // contribute correct visual indices for their newly inserted rows.
          const authoritativeGridRegion =
            isActiveTarget && targetSheet
              ? tryComputeAuthoritativeRegionsFromReplayDeltas({
                  changes: delta.changes,
                  columns: targetSheet.columns,
                  rows: nextRows
                })
              : undefined
          const changeKinds = countReplayDeltaChangeKinds(delta.changes)
          const hasAddRowsStructural = structuralChanges.some(change => {
            const opType = typeof change.operationType === 'string' ? change.operationType : ''
            return opType === 'add_rows' || opType === 'insert_rows_at'
          })
          // Phase 3: when the structural replay already painted add_rows onto the active grid
          // (Phase 1's `add_rows_replay` bulk), the full authoritative token bump from
          // `syncSheetRowsIntoLocalState` becomes a redundant third pass. Skip the grid sync in
          // pure-structural add_rows deltas; for mixed deltas keep the sync but rely on the
          // merged `authoritativeGridRegion` (now including add_rows rows) instead of a full diff.
          const replayPaintedAddRows = replayThroughManager && isActiveTarget && hasAddRowsStructural
          const skipSyncGrid = replayPaintedAddRows && changeKinds.cellChangeCount === 0
          const syncGrid = isActiveTarget && !skipSyncGrid
          const sessionDiffProjectionMode: SpreadsheetSessionDiffProjectionMode | undefined =
            syncGrid && !authoritativeGridRegion ? 'skip' : undefined
          const skipSyncGridReason = !isActiveTarget
            ? 'inactive_target'
            : skipSyncGrid
              ? 'structural_replay_painted'
              : authoritativeGridRegion
                ? 'region_sync'
                : 'full_token'
          const authoritativeRegionCellEstimate =
            estimateAuthoritativeGridReapplyTargetCellCount(authoritativeGridRegion)
          params.enqueueDiagnosticsTraceEvent({
            source: 'client',
            stage: 'client_catchup_paint_strategy',
            traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
            version: currentVersion,
            payload: {
              reason: catchUpReason,
              targetSheetId,
              versionStream: OPERATION_VERSION_STREAM,
              replayRan: replayThroughManager,
              syncGrid,
              skipSyncGridReason,
              changeCount: changeKinds.changeCount,
              cellChangeCount: changeKinds.cellChangeCount,
              structuralChangeCount: changeKinds.structuralChangeCount,
              hasAddRowsStructural,
              authoritativeRegionCellEstimate
            }
          })
          params.syncSheetRowsIntoLocalState(targetSheetId, nextRows, {
            persisted: true,
            syncGrid,
            sessionDiffProjectionMode,
            version: currentVersion,
            ...(authoritativeGridRegion ? { authoritativeGridRegion } : {})
          })
          params.enqueueDiagnosticsTraceEvent({
            source: 'client',
            stage: 'client_delta_catchup_applied',
            traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
            version: currentVersion,
            payload: {
              reason: catchUpReason,
              targetSheetId,
              sinceVersion: appliedSinceVersion,
              currentVersion,
              versionStream: OPERATION_VERSION_STREAM,
              changeCount: delta.changes?.length ?? 0,
              rowCount: nextRows.length,
              activeSheet: targetSheetId === params.activeSheetIdRef.current,
              replayedThroughManager: replayThroughManager
            }
          })
          reportStaleRecoveryLifecycle({
            sheetId: targetSheetId,
            stage: 'catchup_applied',
            version: currentVersion
          })
          return true
        }

        try {
          let delta = await requireMutationFacade().fetchSheetChangesSince(targetSheetId, sinceVersion)
          if (sheetDeltaRequiresFullSnapshot(sinceVersion, delta) && !delta.requiresSnapshot) {
            const refreshedSince = Math.max(sinceVersion, params.resolveKnownSheetVersion(targetSheetId))
            params.enqueueDiagnosticsTraceEvent({
              source: 'client',
              stage: 'client_delta_catchup_gap_retry',
              traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
              version: Number(delta.currentVersion || refreshedSince),
              payload: {
                reason,
                targetSheetId,
                sinceVersion,
                refreshedSince,
                changeCount: delta.changes?.length ?? 0,
                recoveryPath: 'ops_catchup',
                versionStream: OPERATION_VERSION_STREAM
              }
            })
            if (refreshedSince > sinceVersion) {
              const retryDelta = await requireMutationFacade().fetchSheetChangesSince(targetSheetId, refreshedSince)
              if (!sheetDeltaRequiresFullSnapshot(refreshedSince, retryDelta)) {
                return applyFetchedDeltaCatchUp(retryDelta, refreshedSince, reason)
              }
              delta = retryDelta
            }
          }

          if (sheetDeltaRequiresFullSnapshot(sinceVersion, delta)) {
            const fallbackReason = resolveCatchUpFallbackReason(sinceVersion, delta)
            reportStaleRecoveryLifecycle({
              sheetId: targetSheetId,
              stage: 'snapshot_fallback_scheduled',
              version: Number(delta.currentVersion || sinceVersion)
            })
            params.enqueueDiagnosticsTraceEvent({
              source: 'client',
              stage: 'client_delta_catchup_requires_snapshot',
              severity: 'warning',
              traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
              version: Number(delta.currentVersion || sinceVersion),
              payload: {
                reason,
                fallbackReason,
                targetSheetId,
                sinceVersion,
                recoveryPath: Boolean(delta.requiresSnapshot) ? 'explicit_snapshot_required' : 'ops_gap_unrecoverable',
                versionStream: OPERATION_VERSION_STREAM,
                changeCount: delta.changes?.length ?? 0,
                requiresSnapshot: Boolean(delta.requiresSnapshot)
              }
            })
            return requestCatchUpSnapshotFallback({
              targetSheetId,
              reason,
              fallbackReason,
              sinceVersion,
              currentVersion: Number(delta.currentVersion || sinceVersion),
              changeCount: delta.changes?.length ?? 0,
              requiresSnapshot: Boolean(delta.requiresSnapshot)
            })
          }

          return applyFetchedDeltaCatchUp(delta, sinceVersion, reason)
        } catch (error) {
          reportStaleRecoveryLifecycle({
            sheetId: targetSheetId,
            stage: 'catchup_failed',
            version: options?.incomingVersion ?? null
          })
          params.enqueueDiagnosticsTraceEvent({
            source: 'client',
            stage: 'client_delta_catchup_failed',
            severity: 'error',
            traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
            version: options?.incomingVersion ?? null,
            payload: {
              reason,
              targetSheetId,
              versionStream: OPERATION_VERSION_STREAM,
              message: error instanceof Error ? error.message : String(error)
            }
          })
          params.scheduleSheetVersionRefreshFromApi()
          return false
        }
      })()

      catchUpInFlightBySheetRef.current.set(targetSheetId, task)
      try {
        return await task
      } finally {
        if (catchUpInFlightBySheetRef.current.get(targetSheetId) === task) {
          catchUpInFlightBySheetRef.current.delete(targetSheetId)
        }
      }
    },
    [
      params.entityEnabled,
      params.enqueueDiagnosticsTraceEvent,
      params.getKnownRowsForSheet,
      params.resolveKnownSheetVersion,
      params.rememberKnownSheetVersion,
      reportStaleRecoveryLifecycle,
      params.spreadsheetSession,
      params.syncSheetRowsIntoLocalState,
      params.reloadSheetFromCanonicalSnapshot,
      params.scheduleSheetVersionRefreshFromApi
    ]
  )

  return { requestSheetDeltaCatchUp }
}
