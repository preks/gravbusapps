import { useCallback, useEffect, useRef, type MutableRefObject } from 'react'

import type { SpreadsheetSheet, SpreadsheetColumn } from '../types'
import { SpreadsheetApiService } from '../services/SpreadsheetApiService'
import type { SpreadsheetCollaborationManager } from '../services/SpreadsheetCollaborationManager'
import type { SpreadsheetMutationFacade } from '../core'
import {
  replayRemoteDeltaThroughCollaborationManager,
  applyRemoteFetchedSheetDelta,
  sheetDeltaRequiresFullSnapshot,
  type SpreadsheetSession
} from '../core'
import { useSpreadsheetRemoteDeltaCatchUp, type SpreadsheetLocalWorkGuard } from './useSpreadsheetRemoteDeltaCatchUp'
import { isColdStartSnapshotReload } from '../utils/spreadsheetUnresolvedLocalWork'
import { reapplyUnresolvedLocalIntentsToRows } from '../utils/spreadsheetReapplyLocalIntents'
import {
  normalizeWorkbookSnapshotToAppSheets,
  stripWorkbookSnapshotValuesPreservingFormatting
} from '../utils/univerAdapter'
import { writeUniverSnapshotCache, clearUniverSnapshotCache } from '../utils/univerSnapshotCache'
import {
  hasSheetCoverageVersion,
  mergeSnapshotCoversVersions,
  normalizeSnapshotCoversVersions,
  type SpreadsheetSnapshotCoversVersions
} from '../utils/spreadsheetSnapshotCoverage'
import { scheduleCoalescedTimeout } from '../utils/collaborationRepairScheduler'
import { sortSpreadsheetRowsBySheetSettings } from '../utils/spreadsheetSheetRowSort'
import {
  estimateAuthoritativeGridReapplyTargetCellCount,
  tryComputeAuthoritativeRegionsFromReplayDeltas,
  type AuthoritativeGridReapplyTarget
} from '../utils/spreadsheetAuthoritativeRegion'
import type { SpreadsheetSessionDiffProjectionMode } from '../core/SpreadsheetCollaborationContract'
import { countReplayDeltaChangeKinds, partitionReplayDeltaChanges } from '../utils/spreadsheetReplayDeltaPartition'
import { resolveReconciledSheetId } from '../utils/reconcileTemporarySheetId'
import { mapSnapshotRowsToViewerRows, overlaySnapshotIfRowsMismatch } from '../utils/spreadsheetViewerRows'
import {
  buildColumnVisibilityReplayOperations,
  mergeSheetColumnVisibilityFromLocal
} from '../utils/spreadsheetColumnVisibilityMetadata'

import type { SpreadsheetTraceEventInput, SpreadsheetTraceSession } from '../services/spreadsheetDiagnostics'

import type { SheetDeltaCatchUpReason, SheetDeltaCatchUpOptions } from './spreadsheetRemoteSyncTypes'

export type { SheetDeltaCatchUpReason, SheetDeltaCatchUpOptions } from './spreadsheetRemoteSyncTypes'

export interface SpreadsheetRemoteSyncConflictRecovery {
  onRecoverSuccess: () => void
  onRecoverError: (message: string) => void
  translatePersistRecoveryFailed: () => string
}

export interface UseSpreadsheetRemoteSyncControllerParams {
  appId: string
  activeSheetId: string
  activeSheet: SpreadsheetSheet
  preferUniverNativeSheetTabs: boolean
  entityEnabled: boolean
  activeSheetIdRef: MutableRefObject<string>
  appSheetsRef: MutableRefObject<SpreadsheetSheet[]>
  workbookSnapshotVersionRef: MutableRefObject<number>
  workbookSnapshotCoversVersionsRef: MutableRefObject<SpreadsheetSnapshotCoversVersions>
  pendingCreatedSheetSelectionRef: MutableRefObject<{
    temporarySheetId: string
    persistedSheetId: string | null
  } | null>
  createdSheetIdAliasesRef: MutableRefObject<Map<string, string>>
  collaborationManagerRef: MutableRefObject<SpreadsheetCollaborationManager | null>
  mutationFacadeRef: MutableRefObject<SpreadsheetMutationFacade | null>
  sheetsNeedingGridMaterializationRef: MutableRefObject<Map<string, string>>
  snapshotSaveMetricsRef: MutableRefObject<{ fallbackLoads: number }>
  spreadsheetSession: SpreadsheetSession
  enqueueDiagnosticsTraceEvent: (event: SpreadsheetTraceEventInput) => void
  activeTraceSessionRef: MutableRefObject<SpreadsheetTraceSession | null>
  debugLog: (message: string, payload?: Record<string, unknown>) => void
  rememberKnownSheetVersion: (sheetId: string, version: number) => void
  updateActiveSheetVersion: (version: number | undefined, strategy?: 'set' | 'max') => void
  resolveKnownSheetVersion: (sheetId: string) => number
  syncSheetRowsIntoLocalState: (
    sheetId: string,
    rows: Record<string, unknown>[],
    options?: {
      persisted?: boolean
      syncGrid?: boolean
      sessionDiffProjectionMode?: SpreadsheetSessionDiffProjectionMode
      version?: number
      recoveredSheetMeta?: SpreadsheetSheet
      authoritativeGridRegion?: AuthoritativeGridReapplyTarget
    }
  ) => void
  setBootstrapSnapshot: (snapshot: Record<string, unknown> | null) => void
  requestGridRefresh: (snapshot?: Record<string, unknown> | null, seedOverride?: string) => void
  getKnownRowsForSheet: (sheetId: string) => Record<string, unknown>[]
  hasPendingCellPersistence: () => boolean
  hasPendingPersistenceForSheet: (targetSheetId: string) => boolean
  hasTransientLocalGridStateForSheet?: (targetSheetId: string) => boolean
  getActiveSessionVersion: () => number
  /** When true, reload pushes fetched columns through the mutation facade (matches viewer `onSheetUpdate` guard). */
  sheetMetadataReloadEnabled: boolean
  /**
   * Flushes Univer deferred dirty cells (and pending HTTP cell journal) before grid remount
   * on canonical reload.
   */
  flushDeferredDirtyCellsRef?: MutableRefObject<(() => Promise<void>) | null>
  scheduleSheetVersionRefreshFromApiRef: MutableRefObject<() => void>
  conflictRecovery: SpreadsheetRemoteSyncConflictRecovery
  reapplyColumnVisibilityOnGrid?: (
    sheetId: string,
    operations: Array<{ type: 'visibility_update'; data: Record<string, unknown> }>
  ) => void
  localWorkGuard?: SpreadsheetLocalWorkGuard
}

export interface UseSpreadsheetRemoteSyncControllerResult {
  scheduleSheetVersionRefreshFromApi: (requestedSheetId?: string) => void
  reloadSheetFromCanonicalSnapshot: (seedPrefix: string, targetSheetId?: string) => Promise<boolean>
  scheduleRemoteStructuralResync: (targetSheetId?: string, options?: { immediate?: boolean }) => void
  requestSheetDeltaCatchUp: (
    targetSheetId: string,
    reason: SheetDeltaCatchUpReason,
    options?: SheetDeltaCatchUpOptions
  ) => Promise<boolean>
  recoverFromVersionConflict: () => Promise<boolean>
}

export function useSpreadsheetRemoteSyncController(
  params: UseSpreadsheetRemoteSyncControllerParams
): UseSpreadsheetRemoteSyncControllerResult {
  const remoteStructuralResyncTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const remoteVersionRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deferredInactiveSheetResyncsRef = useRef<Set<string>>(new Set())
  const canonicalReloadInFlightBySheetRef = useRef<Map<string, Promise<boolean>>>(new Map())

  const requireMutationFacade = (): SpreadsheetMutationFacade => {
    const facade = params.mutationFacadeRef.current
    if (!facade) {
      throw new Error('Spreadsheet mutation facade is not initialized yet')
    }
    return facade
  }

  const scheduleSheetVersionRefreshFromApi = useCallback(
    (requestedSheetId?: string) => {
      scheduleCoalescedTimeout(remoteVersionRefreshTimeoutRef, 250, () => {
        remoteVersionRefreshTimeoutRef.current = null
        void (async () => {
          const pendingCreatedSheetSelection = params.pendingCreatedSheetSelectionRef.current
          const rawTargetSheetId = requestedSheetId ?? params.activeSheetIdRef.current
          if (
            pendingCreatedSheetSelection?.temporarySheetId === rawTargetSheetId &&
            !pendingCreatedSheetSelection.persistedSheetId
          ) {
            return
          }
          const targetSheetId =
            pendingCreatedSheetSelection?.temporarySheetId === rawTargetSheetId &&
            pendingCreatedSheetSelection.persistedSheetId
              ? pendingCreatedSheetSelection.persistedSheetId
              : resolveReconciledSheetId(rawTargetSheetId, params.createdSheetIdAliasesRef.current)
          try {
            const sheet = await SpreadsheetApiService.getSheet(params.appId, targetSheetId)
            if (sheet?.version != null) {
              const nextVersion = Number(sheet.version)
              params.rememberKnownSheetVersion(targetSheetId, nextVersion)
              if (targetSheetId === params.activeSheetIdRef.current) {
                params.updateActiveSheetVersion(nextVersion, 'max')
              }
            }
          } catch {
            /* ignore */
          }
          try {
            const workbookSnapshot = await SpreadsheetApiService.getUniverSnapshot(params.appId)
            const workbookVersion = Number(workbookSnapshot.version ?? 0)
            if (Number.isFinite(workbookVersion) && workbookVersion >= 0) {
              params.workbookSnapshotVersionRef.current = Math.max(
                params.workbookSnapshotVersionRef.current,
                workbookVersion
              )
            }
            params.workbookSnapshotCoversVersionsRef.current = mergeSnapshotCoversVersions(
              params.workbookSnapshotCoversVersionsRef.current,
              normalizeSnapshotCoversVersions(workbookSnapshot.coversVersions)
            )
          } catch {
            /* ignore */
          }
        })()
      })
    },
    [
      params.appId,
      params.rememberKnownSheetVersion,
      params.updateActiveSheetVersion,
      params.workbookSnapshotVersionRef,
      params.workbookSnapshotCoversVersionsRef
    ]
  )

  const cancelPendingRemoteStructuralResync = useCallback((sheetId: string): void => {
    const existingTimeout = remoteStructuralResyncTimeoutsRef.current.get(sheetId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
      remoteStructuralResyncTimeoutsRef.current.delete(sheetId)
    }
    deferredInactiveSheetResyncsRef.current.delete(sheetId)
  }, [])

  const reloadSheetFromCanonicalSnapshot = useCallback(
    async (seedPrefix: string, targetSheetId = params.activeSheetIdRef.current): Promise<boolean> => {
      const inFlightReload = canonicalReloadInFlightBySheetRef.current.get(targetSheetId)
      if (inFlightReload) {
        params.enqueueDiagnosticsTraceEvent({
          source: 'client',
          stage: 'client_snapshot_reload_deduplicated',
          severity: 'info',
          traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
          payload: {
            reason: seedPrefix,
            targetSheetId
          }
        })
        return inFlightReload
      }

      cancelPendingRemoteStructuralResync(targetSheetId)
      const reloadTask = (async (): Promise<boolean> => {
        params.enqueueDiagnosticsTraceEvent({
          source: 'client',
          stage: 'client_snapshot_reload_started',
          traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
          payload: {
            reason: seedPrefix,
            targetSheetId
          }
        })
        try {
          const targetSheet = params.appSheetsRef.current.find(sheet => sheet.id === targetSheetId)
          if (!targetSheet) return false

          // Snapshot reload must never clobber in-flight local work. Two
          // distinct signals can hold pending cell values that are not yet on
          // the server: (1) the intent journal / version-causal ownership
          // (registered logical intents), and (2) the sheet work queue's
          // queued cell batches (`hasPendingPersistenceForSheet`). A reload
          // that reads only the journal would still overwrite values that are
          // queued-but-not-yet-journaled. Cold-start reloads have no local work
          // to protect, so they remain exempt.
          const isColdStart = isColdStartSnapshotReload(seedPrefix)
          const hasUnresolvedIntents = params.localWorkGuard?.hasUnresolvedLocalWorkForSheet(targetSheetId) ?? false
          const hasPendingQueuedPersist = params.hasPendingPersistenceForSheet(targetSheetId)
          const hasTransientLocalGridState = params.hasTransientLocalGridStateForSheet?.(targetSheetId) ?? false
          if (!isColdStart && (hasUnresolvedIntents || hasPendingQueuedPersist || hasTransientLocalGridState)) {
            params.collaborationManagerRef.current?.reportStaleRecoveryLifecycle({
              sheetId: targetSheetId,
              stage: 'snapshot_reload_skipped',
              version: params.resolveKnownSheetVersion(targetSheetId)
            })
            params.enqueueDiagnosticsTraceEvent({
              source: 'client',
              stage: 'client_snapshot_reload_skipped',
              severity: 'warning',
              traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
              payload: {
                reason: hasUnresolvedIntents
                  ? 'unresolved-local-intents'
                  : hasPendingQueuedPersist
                    ? 'pending-local-persist'
                    : 'transient-local-grid-state',
                hasUnresolvedIntents,
                hasPendingQueuedPersist,
                hasTransientLocalGridState,
                targetSheetId,
                seedPrefix
              }
            })
            return false
          }

          const snapshot = await SpreadsheetApiService.getSheetSnapshot(params.appId, targetSheetId)
          const recoveredSheetMeta = (snapshot.sheet as unknown as SpreadsheetSheet | undefined) ?? targetSheet
          const appSheetsWithRecoveredMeta = params.appSheetsRef.current.map(sheet =>
            sheet.id === targetSheetId ? { ...sheet, ...recoveredSheetMeta } : sheet
          )
          const rows = sortSpreadsheetRowsBySheetSettings(
            mapSnapshotRowsToViewerRows(snapshot.rows || []),
            recoveredSheetMeta
          )
          const sheetMeta = snapshot.sheet as unknown as Record<string, unknown> | undefined
          const localColumns =
            targetSheet.columns.length > 0
              ? targetSheet.columns
              : (appSheetsWithRecoveredMeta.find(sheet => sheet.id === targetSheetId)?.columns ?? [])
          const serverColumns = Array.isArray(sheetMeta?.columns) ? (sheetMeta.columns as SpreadsheetColumn[]) : []
          const mergedColumns =
            serverColumns.length > 0
              ? mergeSheetColumnVisibilityFromLocal(serverColumns, localColumns, {
                  preserveLocalVisibility: params.hasPendingPersistenceForSheet(targetSheetId)
                })
              : localColumns
          const recoveredSheetMetaWithVisibility =
            recoveredSheetMeta && mergedColumns.length > 0
              ? { ...recoveredSheetMeta, columns: mergedColumns }
              : recoveredSheetMeta
          const isTargetActiveSheet = targetSheetId === params.activeSheetIdRef.current

          clearUniverSnapshotCache(params.appId)
          let restoredUniverSnapshot: Record<string, unknown> | null = null
          try {
            const univerData = await SpreadsheetApiService.getUniverSnapshot(params.appId)
            const appSnapshotVersion = Number(univerData.version ?? 0)
            const remoteCoversVersions = normalizeSnapshotCoversVersions(univerData.coversVersions)
            if (Number.isFinite(appSnapshotVersion) && appSnapshotVersion >= 0) {
              params.workbookSnapshotVersionRef.current = Math.max(
                params.workbookSnapshotVersionRef.current,
                appSnapshotVersion
              )
            }
            if (
              univerData?.snapshot &&
              typeof univerData.snapshot === 'object' &&
              hasSheetCoverageVersion(remoteCoversVersions, targetSheetId)
            ) {
              let snap = normalizeWorkbookSnapshotToAppSheets(
                univerData.snapshot as Record<string, unknown>,
                appSheetsWithRecoveredMeta
              )
              snap = stripWorkbookSnapshotValuesPreservingFormatting(snap)
              const columnsForMerge =
                mergedColumns.length > 0
                  ? mergedColumns
                  : (appSheetsWithRecoveredMeta.find(s => s.id === targetSheetId)?.columns ?? [])
              if (columnsForMerge.length > 0) {
                const merged = overlaySnapshotIfRowsMismatch(snap, targetSheetId, rows, columnsForMerge)
                if (merged && merged !== snap) {
                  params.debugLog('snapshot reload: merged Univer snapshot with row-authoritative overlay', {
                    appId: params.appId,
                    sheetId: targetSheetId,
                    seedPrefix
                  })
                  snap = merged
                }
              }
              restoredUniverSnapshot = snap
              params.workbookSnapshotCoversVersionsRef.current = mergeSnapshotCoversVersions(
                params.workbookSnapshotCoversVersionsRef.current,
                remoteCoversVersions
              )
              writeUniverSnapshotCache(
                params.appId,
                univerData.version,
                stripWorkbookSnapshotValuesPreservingFormatting(snap)
              )
            } else {
              const nextCoversVersions = { ...params.workbookSnapshotCoversVersionsRef.current }
              delete nextCoversVersions[targetSheetId]
              params.workbookSnapshotCoversVersionsRef.current = nextCoversVersions
            }
          } catch (e) {
            console.warn('[SpreadsheetAppViewer] Could not fetch Univer snapshot during sheet reload:', e)
          }

          const nextVersion = Number(snapshot.version || 0)
          params.collaborationManagerRef.current?.reportStaleRecoveryLifecycle({
            sheetId: targetSheetId,
            stage: 'snapshot_reload_started',
            version: nextVersion
          })
          const localIntents = params.localWorkGuard?.listLocalIntentsForSheet(targetSheetId) ?? []
          const rowsWithLocalIntents =
            localIntents.length > 0
              ? reapplyUnresolvedLocalIntentsToRows(rows, localIntents, {
                  sheetId: targetSheetId,
                  reloadedVersion: nextVersion
                })
              : rows
          await params.flushDeferredDirtyCellsRef?.current?.()
          params.rememberKnownSheetVersion(targetSheetId, nextVersion)
          const syncGridFromReload = false
          params.syncSheetRowsIntoLocalState(targetSheetId, rowsWithLocalIntents, {
            persisted: true,
            syncGrid: isTargetActiveSheet ? syncGridFromReload : false,
            version: nextVersion,
            recoveredSheetMeta: recoveredSheetMetaWithVisibility
          })
          if (params.sheetMetadataReloadEnabled && mergedColumns.length > 0) {
            void requireMutationFacade().updateSheetMetadata(targetSheetId, {
              columns: mergedColumns
            })
          }
          if (restoredUniverSnapshot && isTargetActiveSheet) {
            params.requestGridRefresh(restoredUniverSnapshot, `${seedPrefix}-${targetSheetId}-${Date.now()}`)
            const visibilityReplayOperations = buildColumnVisibilityReplayOperations(targetSheetId, mergedColumns)
            if (visibilityReplayOperations.length > 0) {
              queueMicrotask(() => {
                params.reapplyColumnVisibilityOnGrid?.(targetSheetId, visibilityReplayOperations)
              })
            }
          } else if (restoredUniverSnapshot && params.preferUniverNativeSheetTabs) {
            params.sheetsNeedingGridMaterializationRef.current.set(targetSheetId, seedPrefix)
          } else if (isTargetActiveSheet) {
            params.requestGridRefresh(null, `${seedPrefix}-${targetSheetId}-${Date.now()}`)
          }
          params.collaborationManagerRef.current?.reportStaleRecoveryLifecycle({
            sheetId: targetSheetId,
            stage: 'snapshot_reload_succeeded',
            version: nextVersion
          })
          params.enqueueDiagnosticsTraceEvent({
            source: 'client',
            stage: 'client_snapshot_reload_succeeded',
            traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
            version: nextVersion,
            payload: {
              reason: seedPrefix,
              targetSheetId,
              restoredUniverSnapshot: Boolean(restoredUniverSnapshot),
              isTargetActiveSheet
            }
          })
          return true
        } catch (error) {
          console.error('[SpreadsheetAppViewer] Failed to reload sheet snapshot:', error)
          params.collaborationManagerRef.current?.reportStaleRecoveryLifecycle({
            sheetId: targetSheetId,
            stage: 'snapshot_reload_failed',
            version: params.resolveKnownSheetVersion(targetSheetId)
          })
          params.enqueueDiagnosticsTraceEvent({
            source: 'client',
            stage: 'client_snapshot_reload_failed',
            severity: 'error',
            traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
            payload: {
              reason: seedPrefix,
              targetSheetId,
              message: error instanceof Error ? error.message : 'unknown'
            }
          })
          if (targetSheetId === params.activeSheetIdRef.current) {
            scheduleSheetVersionRefreshFromApi()
          }
          return false
        } finally {
          canonicalReloadInFlightBySheetRef.current.delete(targetSheetId)
        }
      })()

      canonicalReloadInFlightBySheetRef.current.set(targetSheetId, reloadTask)
      return reloadTask
    },
    [
      params.appId,
      cancelPendingRemoteStructuralResync,
      params.enqueueDiagnosticsTraceEvent,
      params.preferUniverNativeSheetTabs,
      params.sheetMetadataReloadEnabled,
      params.rememberKnownSheetVersion,
      params.requestGridRefresh,
      params.debugLog,
      scheduleSheetVersionRefreshFromApi,
      params.syncSheetRowsIntoLocalState
    ]
  )

  const { requestSheetDeltaCatchUp } = useSpreadsheetRemoteDeltaCatchUp({
    entityEnabled: params.entityEnabled,
    spreadsheetSession: params.spreadsheetSession,
    enqueueDiagnosticsTraceEvent: params.enqueueDiagnosticsTraceEvent,
    activeTraceSessionRef: params.activeTraceSessionRef,
    rememberKnownSheetVersion: params.rememberKnownSheetVersion,
    resolveKnownSheetVersion: params.resolveKnownSheetVersion,
    workbookSnapshotCoversVersionsRef: params.workbookSnapshotCoversVersionsRef,
    syncSheetRowsIntoLocalState: params.syncSheetRowsIntoLocalState,
    getKnownRowsForSheet: params.getKnownRowsForSheet,
    hasPendingCellPersistence: params.hasPendingCellPersistence,
    activeSheetIdRef: params.activeSheetIdRef,
    appSheetsRef: params.appSheetsRef,
    collaborationManagerRef: params.collaborationManagerRef,
    mutationFacadeRef: params.mutationFacadeRef,
    pendingCreatedSheetSelectionRef: params.pendingCreatedSheetSelectionRef,
    reloadSheetFromCanonicalSnapshot,
    scheduleSheetVersionRefreshFromApi,
    localWorkGuard: params.localWorkGuard
  })

  const scheduleRemoteStructuralResync = useCallback(
    (targetSheetId?: string, options?: { immediate?: boolean }) => {
      const resolvedSheetId = targetSheetId || params.activeSheetIdRef.current
      if (canonicalReloadInFlightBySheetRef.current.has(resolvedSheetId)) {
        return
      }
      const existingTimeout = remoteStructuralResyncTimeoutsRef.current.get(resolvedSheetId)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
        remoteStructuralResyncTimeoutsRef.current.delete(resolvedSheetId)
      }
      const runCatchUp = () => {
        void requestSheetDeltaCatchUp(resolvedSheetId, 'remote_structural')
      }
      if (
        params.preferUniverNativeSheetTabs &&
        !options?.immediate &&
        resolvedSheetId !== params.activeSheetIdRef.current
      ) {
        deferredInactiveSheetResyncsRef.current.add(resolvedSheetId)
        return
      }
      if (options?.immediate) {
        runCatchUp()
        return
      }
      const timeoutId = globalThis.setTimeout(() => {
        remoteStructuralResyncTimeoutsRef.current.delete(resolvedSheetId)
        runCatchUp()
      }, 500)
      remoteStructuralResyncTimeoutsRef.current.set(resolvedSheetId, timeoutId)
    },
    [params.activeSheetIdRef, params.preferUniverNativeSheetTabs, requestSheetDeltaCatchUp]
  )

  useEffect(() => {
    if (!params.preferUniverNativeSheetTabs) return
    if (!deferredInactiveSheetResyncsRef.current.has(params.activeSheetId)) return
    deferredInactiveSheetResyncsRef.current.delete(params.activeSheetId)
    void requestSheetDeltaCatchUp(params.activeSheetId, 'remote_structural')
  }, [params.activeSheetId, params.preferUniverNativeSheetTabs, requestSheetDeltaCatchUp])

  useEffect(() => {
    params.scheduleSheetVersionRefreshFromApiRef.current = scheduleSheetVersionRefreshFromApi
  }, [params.scheduleSheetVersionRefreshFromApiRef, scheduleSheetVersionRefreshFromApi])

  const recoverFromVersionConflict = useCallback(async (): Promise<boolean> => {
    try {
      const sinceVersion = params.getActiveSessionVersion()
      const delta = await requireMutationFacade().fetchSheetChangesSince(params.activeSheetId, sinceVersion)
      if (!sheetDeltaRequiresFullSnapshot(sinceVersion, delta)) {
        const resolvedVersion = Number(delta.currentVersion || sinceVersion)
        // See `useSpreadsheetRemoteDeltaCatchUp` for the rationale: structural ops only are
        // replayed through the collab manager onto Univer; pure cell-value ops are painted
        // by the authoritative-region Univer re-sync triggered below.
        const { structuralChanges } = partitionReplayDeltaChanges(delta.changes)
        const replayRan = replayRemoteDeltaThroughCollaborationManager({
          collaborationManager: params.collaborationManagerRef.current,
          changes: structuralChanges,
          currentVersion: resolvedVersion,
          sheetId: params.activeSheetId,
          traceSessionId: params.activeTraceSessionRef.current?.id
        })
        const nextRows = applyRemoteFetchedSheetDelta({
          spreadsheetSession: params.spreadsheetSession,
          sheetId: params.activeSheetId,
          changes: delta.changes,
          columns: params.activeSheet.columns,
          version: resolvedVersion,
          baseRows: params.getKnownRowsForSheet(params.activeSheetId),
          targetSheet: params.activeSheet
        })
        const authoritativeGridRegion = tryComputeAuthoritativeRegionsFromReplayDeltas({
          changes: delta.changes,
          columns: params.activeSheet.columns,
          rows: nextRows
        })
        const changeKinds = countReplayDeltaChangeKinds(delta.changes)
        const hasAddRowsStructural = structuralChanges.some(change => {
          const opType = typeof change.operationType === 'string' ? change.operationType : ''
          return opType === 'add_rows' || opType === 'insert_rows_at'
        })
        // Phase 3: skip the redundant full-grid token bump when the structural replay already
        // painted add_rows onto the active sheet and there are no pure cell-value changes left
        // that would need an authoritative region paint.
        const skipSyncGrid = replayRan && hasAddRowsStructural && changeKinds.cellChangeCount === 0
        const syncGrid = !skipSyncGrid
        const sessionDiffProjectionMode: SpreadsheetSessionDiffProjectionMode | undefined =
          syncGrid && !authoritativeGridRegion ? 'skip' : undefined
        const skipSyncGridReason = skipSyncGrid
          ? 'structural_replay_painted'
          : authoritativeGridRegion
            ? 'region_sync'
            : 'full_token'
        const authoritativeRegionCellEstimate = estimateAuthoritativeGridReapplyTargetCellCount(authoritativeGridRegion)
        params.enqueueDiagnosticsTraceEvent({
          source: 'client',
          stage: 'client_catchup_paint_strategy',
          traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
          version: resolvedVersion,
          payload: {
            reason: 'conflict_recovery',
            targetSheetId: params.activeSheetId,
            replayRan,
            syncGrid,
            skipSyncGridReason,
            changeCount: changeKinds.changeCount,
            cellChangeCount: changeKinds.cellChangeCount,
            structuralChangeCount: changeKinds.structuralChangeCount,
            hasAddRowsStructural,
            authoritativeRegionCellEstimate
          }
        })
        params.syncSheetRowsIntoLocalState(params.activeSheetId, nextRows, {
          persisted: true,
          // Skip the full-grid token bump after add_rows replay so we do not re-paint the rows
          // the manager just bulk-applied. Mixed deltas still sync via the merged region.
          syncGrid,
          sessionDiffProjectionMode,
          version: resolvedVersion,
          authoritativeGridRegion
        })
        params.conflictRecovery.onRecoverSuccess()
        return true
      }

      if (!delta.requiresSnapshot) {
        return requestSheetDeltaCatchUp(params.activeSheetId, 'version_conflict', { sinceVersion })
      }

      params.snapshotSaveMetricsRef.current.fallbackLoads += 1
      if (params.hasPendingPersistenceForSheet(params.activeSheetId)) {
        params.enqueueDiagnosticsTraceEvent({
          source: 'client',
          stage: 'client_snapshot_reload_skipped',
          severity: 'warning',
          traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
          payload: {
            reason: 'conflict-recovery-pending-local-persistence',
            targetSheetId: params.activeSheetId,
            sinceVersion
          }
        })
        return false
      }
      const reloaded = await reloadSheetFromCanonicalSnapshot('conflict-recovery')
      if (!reloaded) return false

      params.debugLog('version conflict fallback snapshot loaded', {
        appId: params.appId,
        sheetId: params.activeSheetId,
        fallbackLoads: params.snapshotSaveMetricsRef.current.fallbackLoads
      })
      params.conflictRecovery.onRecoverSuccess()
      return true
    } catch (error) {
      console.error('[SpreadsheetAppViewer] Failed to recover from version conflict:', error)
      params.conflictRecovery.onRecoverError(params.conflictRecovery.translatePersistRecoveryFailed())
      scheduleSheetVersionRefreshFromApi()
      return false
    }
  }, [
    params.activeSheet,
    params.activeSheetId,
    params.appId,
    params.enqueueDiagnosticsTraceEvent,
    params.getActiveSessionVersion,
    params.getKnownRowsForSheet,
    params.hasPendingPersistenceForSheet,
    params.conflictRecovery,
    params.debugLog,
    params.spreadsheetSession,
    params.syncSheetRowsIntoLocalState,
    reloadSheetFromCanonicalSnapshot,
    scheduleSheetVersionRefreshFromApi,
    requestSheetDeltaCatchUp
  ])

  useEffect(() => {
    return () => {
      for (const timeoutId of remoteStructuralResyncTimeoutsRef.current.values()) {
        clearTimeout(timeoutId)
      }
      remoteStructuralResyncTimeoutsRef.current.clear()
      if (remoteVersionRefreshTimeoutRef.current) clearTimeout(remoteVersionRefreshTimeoutRef.current)
    }
  }, [])

  return {
    scheduleSheetVersionRefreshFromApi,
    reloadSheetFromCanonicalSnapshot,
    scheduleRemoteStructuralResync,
    requestSheetDeltaCatchUp,
    recoverFromVersionConflict
  }
}
