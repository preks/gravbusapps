import { useEffect, useRef, type MutableRefObject } from 'react'

import { SpreadsheetApiService } from '../services/SpreadsheetApiService'
import { REMOTE_SHEET_CATCHUP_DEBOUNCE_MS } from '../utils/spreadsheetViewerDebug'
import { sortSpreadsheetRowsBySheetSettings } from '../utils/spreadsheetSheetRowSort'
import { resolveReconciledSheetId } from '../utils/reconcileTemporarySheetId'
import { mapSnapshotRowsToViewerRows } from '../utils/spreadsheetViewerRows'

import type { SpreadsheetSheet } from '../types'
import type { SheetDeltaCatchUpReason } from './spreadsheetRemoteSyncTypes'

export interface UseSpreadsheetRemoteSyncCollaborationEffectsParams {
  preferUniverNativeSheetTabs: boolean
  entityEnabled: boolean
  appId: string
  appIsShared: boolean | undefined
  activeSheetId: string
  activeSheetIdRef: MutableRefObject<string>
  collaborationJoined: boolean
  collaborationConnected: boolean
  requestSheetDeltaCatchUp: (sheetId: string, reason: SheetDeltaCatchUpReason) => Promise<boolean>
  rememberKnownSheetVersion: (sheetId: string, version: number) => void
  rememberSheetVersion: (sheetId: string, version: number | undefined) => void
  scheduleSheetVersionRefreshFromApi: (requestedSheetId?: string) => void
  hasPendingPersistenceForSheet: (targetSheetId: string) => boolean
  commitLocalSheetData: (
    rows: Record<string, unknown>[],
    options: { persisted?: boolean; syncGrid?: boolean; publishParent?: boolean }
  ) => void
  peerSheetDataCacheRef: MutableRefObject<Map<string, Record<string, unknown>[]>>
  authoritativePeerSheetDataCacheRef: MutableRefObject<Set<string>>
  createdSheetIdAliasesRef: MutableRefObject<Map<string, string>>
  pendingCreatedSheetSelectionRef: MutableRefObject<{
    temporarySheetId: string
    persistedSheetId: string | null
  } | null>
  appSheetsRef: MutableRefObject<SpreadsheetSheet[]>
}

/**
 * Collaboration-driven remote catch-up: join/reconnect, sheet activation, focus/visibility,
 * and debounced snapshot refresh on tab switches (depends on shared-workbook + connectivity).
 */
export function useSpreadsheetRemoteSyncCollaborationEffects(
  params: UseSpreadsheetRemoteSyncCollaborationEffectsParams
): void {
  const prevActiveSheetIdForRemoteCatchupRef = useRef(params.activeSheetId)
  const remoteSheetCatchupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remoteSheetCatchupSequenceRef = useRef(0)

  const previousCollaborationJoinedRef = useRef(params.collaborationJoined)
  const previousCollaborationConnectedRef = useRef(params.collaborationConnected)

  useEffect(() => {
    const wasJoined = previousCollaborationJoinedRef.current
    previousCollaborationJoinedRef.current = params.collaborationJoined
    if (!params.collaborationJoined || wasJoined) return
    void params.requestSheetDeltaCatchUp(params.activeSheetId, 'collaboration_join')
  }, [params.activeSheetId, params.collaborationJoined, params.requestSheetDeltaCatchUp])

  useEffect(() => {
    const wasConnected = previousCollaborationConnectedRef.current
    previousCollaborationConnectedRef.current = params.collaborationConnected
    if (!params.collaborationConnected || wasConnected || !params.collaborationJoined) return
    void params.requestSheetDeltaCatchUp(params.activeSheetId, 'collaboration_reconnect')
  }, [params.activeSheetId, params.collaborationConnected, params.collaborationJoined, params.requestSheetDeltaCatchUp])

  useEffect(() => {
    const previousSheetId = prevActiveSheetIdForRemoteCatchupRef.current
    prevActiveSheetIdForRemoteCatchupRef.current = params.activeSheetId
    if (previousSheetId === params.activeSheetId || !params.collaborationJoined) return
    void params.requestSheetDeltaCatchUp(params.activeSheetId, 'sheet_activation')
  }, [params.activeSheetId, params.collaborationJoined, params.requestSheetDeltaCatchUp])

  useEffect(() => {
    if (!params.collaborationJoined || typeof window === 'undefined') return
    const catchUpOnFocus = () => {
      void params.requestSheetDeltaCatchUp(params.activeSheetIdRef.current, 'focus')
    }
    const catchUpOnVisibility = () => {
      if (document.visibilityState !== 'visible') return
      void params.requestSheetDeltaCatchUp(params.activeSheetIdRef.current, 'visibility')
    }
    window.addEventListener('focus', catchUpOnFocus)
    document.addEventListener('visibilitychange', catchUpOnVisibility)
    return () => {
      window.removeEventListener('focus', catchUpOnFocus)
      document.removeEventListener('visibilitychange', catchUpOnVisibility)
    }
  }, [params.collaborationJoined, params.requestSheetDeltaCatchUp])

  useEffect(() => {
    const prev = prevActiveSheetIdForRemoteCatchupRef.current
    prevActiveSheetIdForRemoteCatchupRef.current = params.activeSheetId
    if (!params.preferUniverNativeSheetTabs || params.entityEnabled) return
    if (prev === params.activeSheetId) return
    if (!params.collaborationConnected && params.appIsShared !== true) return

    remoteSheetCatchupSequenceRef.current += 1
    const catchupSequence = remoteSheetCatchupSequenceRef.current
    if (remoteSheetCatchupTimeoutRef.current) {
      globalThis.clearTimeout(remoteSheetCatchupTimeoutRef.current)
      remoteSheetCatchupTimeoutRef.current = null
    }

    remoteSheetCatchupTimeoutRef.current = globalThis.setTimeout(() => {
      remoteSheetCatchupTimeoutRef.current = null
      const requestedActiveSheetId = params.activeSheetIdRef.current
      const pendingCreatedSheetSelection = params.pendingCreatedSheetSelectionRef.current
      if (
        pendingCreatedSheetSelection?.temporarySheetId === requestedActiveSheetId &&
        !pendingCreatedSheetSelection.persistedSheetId
      ) {
        return
      }
      const targetSheetId =
        pendingCreatedSheetSelection?.temporarySheetId === requestedActiveSheetId &&
        pendingCreatedSheetSelection.persistedSheetId
          ? pendingCreatedSheetSelection.persistedSheetId
          : resolveReconciledSheetId(requestedActiveSheetId, params.createdSheetIdAliasesRef.current)

      void (async () => {
        try {
          const snapshot = await SpreadsheetApiService.getSheetSnapshot(params.appId, targetSheetId)
          if (remoteSheetCatchupSequenceRef.current !== catchupSequence) return
          const canonicalActiveSheetId = resolveReconciledSheetId(
            params.activeSheetIdRef.current,
            params.createdSheetIdAliasesRef.current
          )
          if (targetSheetId !== canonicalActiveSheetId) return

          const currentSheets = params.appSheetsRef.current
          const refreshedSheetMeta =
            (snapshot.sheet as unknown as SpreadsheetSheet | undefined) ??
            currentSheets.find(sheet => sheet.id === targetSheetId) ??
            currentSheets.find(sheet => sheet.id === canonicalActiveSheetId)
          const refreshedRows = sortSpreadsheetRowsBySheetSettings(
            mapSnapshotRowsToViewerRows(snapshot.rows || []),
            refreshedSheetMeta
          )
          const refreshedVersion = Number(snapshot.version ?? 0)
          if (Number.isFinite(refreshedVersion) && refreshedVersion >= 0) {
            params.rememberKnownSheetVersion(targetSheetId, refreshedVersion)
            params.rememberSheetVersion(targetSheetId, refreshedVersion)
          }
          if (params.hasPendingPersistenceForSheet(targetSheetId)) {
            return
          }
          const rowsToCommit = refreshedRows
          params.peerSheetDataCacheRef.current.set(targetSheetId, rowsToCommit)
          params.authoritativePeerSheetDataCacheRef.current.add(targetSheetId)
          params.commitLocalSheetData(rowsToCommit, {
            persisted: rowsToCommit === refreshedRows,
            syncGrid: !params.preferUniverNativeSheetTabs
          })
        } catch {
          if (remoteSheetCatchupSequenceRef.current !== catchupSequence) return
          const canonicalActiveSheetId = resolveReconciledSheetId(
            params.activeSheetIdRef.current,
            params.createdSheetIdAliasesRef.current
          )
          if (targetSheetId === canonicalActiveSheetId) {
            params.scheduleSheetVersionRefreshFromApi(targetSheetId)
          }
        }
      })()
    }, REMOTE_SHEET_CATCHUP_DEBOUNCE_MS)

    return () => {
      remoteSheetCatchupSequenceRef.current += 1
      if (remoteSheetCatchupTimeoutRef.current) {
        globalThis.clearTimeout(remoteSheetCatchupTimeoutRef.current)
        remoteSheetCatchupTimeoutRef.current = null
      }
    }
  }, [
    params.activeSheetId,
    params.appId,
    params.appIsShared,
    params.collaborationConnected,
    params.commitLocalSheetData,
    params.entityEnabled,
    params.hasPendingPersistenceForSheet,
    params.preferUniverNativeSheetTabs,
    params.rememberKnownSheetVersion,
    params.rememberSheetVersion,
    params.scheduleSheetVersionRefreshFromApi
  ])
}
