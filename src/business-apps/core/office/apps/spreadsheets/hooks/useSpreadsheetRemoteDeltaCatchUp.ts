import { useCallback, useEffect, useRef, type MutableRefObject } from 'react'

import type { SpreadsheetSheet } from '../types'
import type { SpreadsheetCollaborationManager } from '../services/SpreadsheetCollaborationManager'
import type { SpreadsheetMutationFacade } from '../core'
import {
  replayRemoteDeltaThroughCollaborationManager,
  applyRemoteFetchedSheetDelta,
  sheetDeltaRequiresFullSnapshot,
  type SpreadsheetSession
} from '../core'
import type { SpreadsheetTraceEventInput, SpreadsheetTraceSession } from '../services/spreadsheetDiagnostics'

import type { SheetDeltaCatchUpReason, SheetDeltaCatchUpOptions } from './spreadsheetRemoteSyncTypes'
import {
  tryComputeAuthoritativeRegionFromReplayDeltas,
  type AuthoritativeGridRegion
} from '../utils/spreadsheetAuthoritativeRegion'

export interface UseSpreadsheetRemoteDeltaCatchUpParams {
  entityEnabled: boolean
  spreadsheetSession: SpreadsheetSession
  enqueueDiagnosticsTraceEvent: (event: SpreadsheetTraceEventInput) => void
  activeTraceSessionRef: MutableRefObject<SpreadsheetTraceSession | null>
  rememberKnownSheetVersion: (sheetId: string, version: number) => void
  resolveKnownSheetVersion: (sheetId: string) => number
  syncSheetRowsIntoLocalState: (
    sheetId: string,
    rows: Record<string, unknown>[],
    options?: {
      persisted?: boolean
      syncGrid?: boolean
      version?: number
      authoritativeGridRegion?: AuthoritativeGridRegion | null
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
}

export function useSpreadsheetRemoteDeltaCatchUp(params: UseSpreadsheetRemoteDeltaCatchUpParams): {
  requestSheetDeltaCatchUp: (
    targetSheetId: string,
    reason: SheetDeltaCatchUpReason,
    options?: SheetDeltaCatchUpOptions
  ) => Promise<boolean>
} {
  const catchUpInFlightBySheetRef = useRef(new Map<string, Promise<boolean>>())
  const deferredSheetDeltaCatchUpsRef = useRef<
    Map<string, { reason: SheetDeltaCatchUpReason; options?: SheetDeltaCatchUpOptions }>
  >(new Map())
  const deferredSheetDeltaCatchUpTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const requireMutationFacade = (): SpreadsheetMutationFacade => {
    const facade = params.mutationFacadeRef.current
    if (!facade) {
      throw new Error('Spreadsheet mutation facade is not initialized yet')
    }
    return facade
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
      if (params.hasPendingCellPersistence()) {
        deferredSheetDeltaCatchUpsRef.current.set(targetSheetId, { reason, options })
        const existingTimer = deferredSheetDeltaCatchUpTimersRef.current.get(targetSheetId)
        if (existingTimer) {
          clearTimeout(existingTimer)
        }
        const timer = globalThis.setTimeout(() => {
          deferredSheetDeltaCatchUpTimersRef.current.delete(targetSheetId)
          const deferred = deferredSheetDeltaCatchUpsRef.current.get(targetSheetId)
          if (!deferred) return
          if (params.hasPendingCellPersistence()) {
            void requestSheetDeltaCatchUp(targetSheetId, deferred.reason, deferred.options)
            return
          }
          deferredSheetDeltaCatchUpsRef.current.delete(targetSheetId)
          void requestSheetDeltaCatchUp(targetSheetId, deferred.reason, deferred.options)
        }, 250)
        deferredSheetDeltaCatchUpTimersRef.current.set(targetSheetId, timer)
        params.enqueueDiagnosticsTraceEvent({
          source: 'client',
          stage: 'client_delta_catchup_skipped',
          severity: 'warning',
          traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
          version: options?.incomingVersion ?? null,
          payload: { reason, targetSheetId, skippedBecause: 'pending_cell_persistence' }
        })
        return false
      }

      const existing = catchUpInFlightBySheetRef.current.get(targetSheetId)
      if (existing) return existing

      const task = (async () => {
        const sinceVersion =
          typeof options?.sinceVersion === 'number' && Number.isFinite(options.sinceVersion)
            ? Math.max(0, Math.trunc(options.sinceVersion))
            : Math.max(0, params.resolveKnownSheetVersion(targetSheetId))
        params.enqueueDiagnosticsTraceEvent({
          source: 'client',
          stage: 'client_delta_catchup_started',
          traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
          version: options?.incomingVersion ?? null,
          payload: { reason, targetSheetId, sinceVersion, incomingVersion: options?.incomingVersion ?? null }
        })

        try {
          const delta = await requireMutationFacade().fetchSheetChangesSince(targetSheetId, sinceVersion)
          const currentVersion = Number(delta.currentVersion || sinceVersion)
          if (currentVersion <= sinceVersion) {
            params.enqueueDiagnosticsTraceEvent({
              source: 'client',
              stage: 'client_delta_catchup_noop',
              traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
              version: currentVersion,
              payload: { reason, targetSheetId, sinceVersion }
            })
            return true
          }

          if (sheetDeltaRequiresFullSnapshot(sinceVersion, delta)) {
            params.enqueueDiagnosticsTraceEvent({
              source: 'client',
              stage: 'client_delta_catchup_requires_snapshot',
              severity: 'warning',
              traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
              version: currentVersion,
              payload: {
                reason,
                targetSheetId,
                sinceVersion,
                changeCount: delta.changes?.length ?? 0,
                requiresSnapshot: Boolean(delta.requiresSnapshot)
              }
            })
            return params.reloadSheetFromCanonicalSnapshot(`delta-catchup-${reason}`, targetSheetId)
          }

          const targetSheet = params.appSheetsRef.current.find(sheet => sheet.id === targetSheetId)
          const baseRows = params.getKnownRowsForSheet(targetSheetId)
          const replayThroughManager = replayRemoteDeltaThroughCollaborationManager({
            collaborationManager: params.collaborationManagerRef.current,
            changes: delta.changes,
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
          const isActiveTarget = targetSheetId === params.activeSheetIdRef.current
          const authoritativeGridRegion =
            isActiveTarget && targetSheet
              ? tryComputeAuthoritativeRegionFromReplayDeltas({
                  changes: delta.changes,
                  columns: targetSheet.columns,
                  rows: baseRows
                })
              : undefined
          params.syncSheetRowsIntoLocalState(targetSheetId, nextRows, {
            persisted: true,
            syncGrid: isActiveTarget,
            version: currentVersion,
            ...(authoritativeGridRegion ? { authoritativeGridRegion } : {})
          })
          params.enqueueDiagnosticsTraceEvent({
            source: 'client',
            stage: 'client_delta_catchup_applied',
            traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
            version: currentVersion,
            payload: {
              reason,
              targetSheetId,
              sinceVersion,
              currentVersion,
              changeCount: delta.changes?.length ?? 0,
              rowCount: nextRows.length,
              activeSheet: targetSheetId === params.activeSheetIdRef.current,
              replayedThroughManager: replayThroughManager
            }
          })
          return true
        } catch (error) {
          params.enqueueDiagnosticsTraceEvent({
            source: 'client',
            stage: 'client_delta_catchup_failed',
            severity: 'error',
            traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
            version: options?.incomingVersion ?? null,
            payload: {
              reason,
              targetSheetId,
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
      params.hasPendingCellPersistence,
      params.resolveKnownSheetVersion,
      params.rememberKnownSheetVersion,
      params.spreadsheetSession,
      params.syncSheetRowsIntoLocalState,
      params.reloadSheetFromCanonicalSnapshot,
      params.scheduleSheetVersionRefreshFromApi
    ]
  )

  useEffect(() => {
    return () => {
      for (const timeoutId of deferredSheetDeltaCatchUpTimersRef.current.values()) {
        clearTimeout(timeoutId)
      }
      deferredSheetDeltaCatchUpTimersRef.current.clear()
      deferredSheetDeltaCatchUpsRef.current.clear()
    }
  }, [])

  return { requestSheetDeltaCatchUp }
}
