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
import { useSpreadsheetRemoteDeltaCatchUp } from './useSpreadsheetRemoteDeltaCatchUp'
import {
  normalizeWorkbookSnapshotToAppSheets,
  stripWorkbookSnapshotValuesPreservingFormatting
} from '../utils/univerAdapter'
import { writeUniverSnapshotCache, clearUniverSnapshotCache } from '../utils/univerSnapshotCache'
import { scheduleCoalescedTimeout } from '../utils/collaborationRepairScheduler'
import { sortSpreadsheetRowsBySheetSettings } from '../utils/spreadsheetSheetRowSort'
import {
  tryComputeAuthoritativeRegionFromReplayDeltas,
  type AuthoritativeGridRegion
} from '../utils/spreadsheetAuthoritativeRegion'
import { countReplayDeltaChangeKinds, partitionReplayDeltaChanges } from '../utils/spreadsheetReplayDeltaPartition'
import { resolveReconciledSheetId } from '../utils/reconcileTemporarySheetId'
import { mapSnapshotRowsToViewerRows, overlaySnapshotIfRowsMismatch } from '../utils/spreadsheetViewerRows'
import {
  buildColumnVisibilityReplayOperations,
  mergeSheetColumnVisibilityFromLocal
} from '../utils/spreadsheetColumnVisibilityMetadata'

import type { SpreadsheetTraceEventInput, SpreadsheetTraceSession } from '../services/spreadsheetDiagnostics'

import type { SheetDeltaCatchUpReason } from './spreadsheetRemoteSyncTypes'

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
      version?: number
      recoveredSheetMeta?: SpreadsheetSheet
      authoritativeGridRegion?: AuthoritativeGridRegion | null
    }
  ) => void
  setBootstrapSnapshot: (snapshot: Record<string, unknown> | null) => void
  requestGridRefresh: (snapshot?: Record<string, unknown> | null, seedOverride?: string) => void
  getKnownRowsForSheet: (sheetId: string) => Record<string, unknown>[]
  hasPendingCellPersistence: () => boolean
  hasPendingPersistenceForSheet: (targetSheetId: string) => boolean
  getActiveSessionVersion: () => number
  /** When true, reload pushes fetched columns through the mutation facade (matches viewer `onSheetUpdate` guard). */
  sheetMetadataReloadEnabled: boolean
  scheduleSheetVersionRefreshFromApiRef: MutableRefObject<() => void>
  conflictRecovery: SpreadsheetRemoteSyncConflictRecovery
  reapplyColumnVisibilityOnGrid?: (
    sheetId: string,
    operations: Array<{ type: 'visibility_update'; data: Record<string, unknown> }>
  ) => void
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
        })()
      })
    },
    [params.appId, params.rememberKnownSheetVersion, params.updateActiveSheetVersion]
  )

  const reloadSheetFromCanonicalSnapshot = useCallback(
    async (seedPrefix: string, targetSheetId = params.activeSheetIdRef.current): Promise<boolean> => {
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
          serverColumns.length > 0 ? mergeSheetColumnVisibilityFromLocal(serverColumns, localColumns) : localColumns
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
          if (Number.isFinite(appSnapshotVersion) && appSnapshotVersion >= 0) {
            params.workbookSnapshotVersionRef.current = Math.max(
              params.workbookSnapshotVersionRef.current,
              appSnapshotVersion
            )
          }
          if (univerData?.snapshot && typeof univerData.snapshot === 'object') {
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
            writeUniverSnapshotCache(
              params.appId,
              univerData.version,
              stripWorkbookSnapshotValuesPreservingFormatting(snap)
            )
          }
        } catch (e) {
          console.warn('[SpreadsheetAppViewer] Could not fetch Univer snapshot during sheet reload:', e)
        }

        const nextVersion = Number(snapshot.version || 0)
        params.rememberKnownSheetVersion(targetSheetId, nextVersion)
        params.syncSheetRowsIntoLocalState(targetSheetId, rows, {
          persisted: true,
          syncGrid: isTargetActiveSheet,
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
      }
    },
    [
      params.appId,
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

  const scheduleRemoteStructuralResync = useCallback(
    (targetSheetId?: string, options?: { immediate?: boolean }) => {
      const resolvedSheetId = targetSheetId || params.activeSheetIdRef.current
      const existingTimeout = remoteStructuralResyncTimeoutsRef.current.get(resolvedSheetId)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
        remoteStructuralResyncTimeoutsRef.current.delete(resolvedSheetId)
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
        void reloadSheetFromCanonicalSnapshot('remote-structural-resync', resolvedSheetId)
        return
      }
      const timeoutId = globalThis.setTimeout(() => {
        remoteStructuralResyncTimeoutsRef.current.delete(resolvedSheetId)
        void reloadSheetFromCanonicalSnapshot('remote-structural-resync', resolvedSheetId)
      }, 500)
      remoteStructuralResyncTimeoutsRef.current.set(resolvedSheetId, timeoutId)
    },
    [params.preferUniverNativeSheetTabs, reloadSheetFromCanonicalSnapshot]
  )

  const { requestSheetDeltaCatchUp } = useSpreadsheetRemoteDeltaCatchUp({
    entityEnabled: params.entityEnabled,
    spreadsheetSession: params.spreadsheetSession,
    enqueueDiagnosticsTraceEvent: params.enqueueDiagnosticsTraceEvent,
    activeTraceSessionRef: params.activeTraceSessionRef,
    rememberKnownSheetVersion: params.rememberKnownSheetVersion,
    resolveKnownSheetVersion: params.resolveKnownSheetVersion,
    syncSheetRowsIntoLocalState: params.syncSheetRowsIntoLocalState,
    getKnownRowsForSheet: params.getKnownRowsForSheet,
    hasPendingCellPersistence: params.hasPendingCellPersistence,
    activeSheetIdRef: params.activeSheetIdRef,
    appSheetsRef: params.appSheetsRef,
    collaborationManagerRef: params.collaborationManagerRef,
    mutationFacadeRef: params.mutationFacadeRef,
    pendingCreatedSheetSelectionRef: params.pendingCreatedSheetSelectionRef,
    reloadSheetFromCanonicalSnapshot,
    scheduleSheetVersionRefreshFromApi
  })

  useEffect(() => {
    if (!params.preferUniverNativeSheetTabs) return
    if (!deferredInactiveSheetResyncsRef.current.has(params.activeSheetId)) return
    deferredInactiveSheetResyncsRef.current.delete(params.activeSheetId)
    void reloadSheetFromCanonicalSnapshot('deferred-remote-structural-resync', params.activeSheetId)
  }, [params.activeSheetId, params.preferUniverNativeSheetTabs, reloadSheetFromCanonicalSnapshot])

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
        const authoritativeGridRegion = tryComputeAuthoritativeRegionFromReplayDeltas({
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
        const skipSyncGridReason = skipSyncGrid
          ? 'structural_replay_painted'
          : authoritativeGridRegion
            ? 'region_sync'
            : 'full_token'
        const authoritativeRegionCellEstimate = authoritativeGridRegion
          ? (authoritativeGridRegion.maxRow - authoritativeGridRegion.minRow + 1) *
            (authoritativeGridRegion.maxCol - authoritativeGridRegion.minCol + 1)
          : 0
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
          version: resolvedVersion,
          authoritativeGridRegion
        })
        params.conflictRecovery.onRecoverSuccess()
        return true
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
    scheduleSheetVersionRefreshFromApi
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
