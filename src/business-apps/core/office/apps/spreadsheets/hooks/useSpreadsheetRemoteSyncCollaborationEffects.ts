import { useEffect, useRef, type MutableRefObject } from 'react'

import { REMOTE_SHEET_CATCHUP_DEBOUNCE_MS } from '../utils/spreadsheetViewerDebug'
import { resolveReconciledSheetId } from '../utils/reconcileTemporarySheetId'

import type { SpreadsheetSheet } from '../types'
import type { SheetDeltaCatchUpReason } from './spreadsheetRemoteSyncTypes'

const FOREGROUND_SHEET_READY_DEDUPE_MS = 400

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
  ensureSheetReady: (
    sheetId: string,
    reason: 'sheet_switch' | 'focus' | 'visibility' | 'reconnect' | 'prefetch',
    options?: { prefetchOnly?: boolean; allowManifestRefresh?: boolean }
  ) => Promise<'ready' | 'blocked' | 'failed'>
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
  const prevActiveSheetIdForImmediateCatchupRef = useRef(params.activeSheetId)
  const prevActiveSheetIdForRemoteCatchupRef = useRef(params.activeSheetId)
  const remoteSheetCatchupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remoteSheetCatchupSequenceRef = useRef(0)
  const lastForegroundSheetReadyRef = useRef<{
    sheetId: string
    at: number
  } | null>(null)

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
    void params.ensureSheetReady(params.activeSheetId, 'reconnect', { allowManifestRefresh: true })
  }, [params.activeSheetId, params.collaborationConnected, params.collaborationJoined, params.ensureSheetReady])

  useEffect(() => {
    const previousSheetId = prevActiveSheetIdForImmediateCatchupRef.current
    prevActiveSheetIdForImmediateCatchupRef.current = params.activeSheetId
    if (previousSheetId === params.activeSheetId || !params.collaborationJoined) return
    if (params.preferUniverNativeSheetTabs) return
    void params.ensureSheetReady(params.activeSheetId, 'sheet_switch', { allowManifestRefresh: true })
  }, [params.activeSheetId, params.collaborationJoined, params.ensureSheetReady, params.preferUniverNativeSheetTabs])

  useEffect(() => {
    if (!params.collaborationJoined || typeof window === 'undefined') return
    const shouldSkipForegroundCatchUp = (sheetId: string): boolean => {
      const now = Date.now()
      const previous = lastForegroundSheetReadyRef.current
      if (previous && previous.sheetId === sheetId && now - previous.at < FOREGROUND_SHEET_READY_DEDUPE_MS) {
        return true
      }
      lastForegroundSheetReadyRef.current = { sheetId, at: now }
      return false
    }
    const catchUpOnFocus = () => {
      const targetSheetId = params.activeSheetIdRef.current
      if (!targetSheetId || shouldSkipForegroundCatchUp(targetSheetId)) return
      void params.ensureSheetReady(targetSheetId, 'focus', { allowManifestRefresh: true })
    }
    const catchUpOnVisibility = () => {
      if (document.visibilityState !== 'visible') return
      const targetSheetId = params.activeSheetIdRef.current
      if (!targetSheetId || shouldSkipForegroundCatchUp(targetSheetId)) return
      void params.ensureSheetReady(targetSheetId, 'visibility', { allowManifestRefresh: true })
    }
    window.addEventListener('focus', catchUpOnFocus)
    document.addEventListener('visibilitychange', catchUpOnVisibility)
    return () => {
      window.removeEventListener('focus', catchUpOnFocus)
      document.removeEventListener('visibilitychange', catchUpOnVisibility)
    }
  }, [params.collaborationJoined, params.ensureSheetReady])

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
          const readiness = await params.ensureSheetReady(targetSheetId, 'sheet_switch', {
            allowManifestRefresh: true
          })
          if (remoteSheetCatchupSequenceRef.current !== catchupSequence) return
          const canonicalActiveSheetId = resolveReconciledSheetId(
            params.activeSheetIdRef.current,
            params.createdSheetIdAliasesRef.current
          )
          if (targetSheetId !== canonicalActiveSheetId) return
          if (readiness === 'ready') return
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
    params.entityEnabled,
    params.ensureSheetReady,
    params.hasPendingPersistenceForSheet,
    params.preferUniverNativeSheetTabs,
    params.rememberKnownSheetVersion,
    params.rememberSheetVersion,
    params.scheduleSheetVersionRefreshFromApi
  ])
}
