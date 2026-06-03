import { useEffect, useRef, type MutableRefObject } from 'react'

import { countLiveWorksheetSnapshotValues, getKnownCellValueCount } from '../core'
import type { UniverSheetGridHandle } from '../components/UniverSheetGrid.types'
import type { SpreadsheetSheet } from '../types'
import { workbookSnapshotMismatchesViewerRows } from '../utils/univerAdapter'
import { hydrateCachedRowsWithServerIdentities } from '../utils/spreadsheetPeerRowHydration'
import { sortSpreadsheetRowsBySheetSettings } from '../utils/spreadsheetSheetRowSort'
import {
  multiSheetDebugLog,
  summarizeLiveWorksheetSnapshotForDebug,
  summarizeRowsForDebug
} from '../utils/spreadsheetViewerDebug'

import type { CommitLocalSheetDataOptions } from './spreadsheetViewerSessionTypes'

export interface UseSpreadsheetActiveSheetPeerRestoreParams {
  activeSheet: SpreadsheetSheet
  activeSheetId: string
  preferUniverNativeSheetTabs: boolean
  spreadsheetGridRef: MutableRefObject<UniverSheetGridHandle | null>
  peerSheetDataCacheRef: MutableRefObject<Map<string, Record<string, unknown>[]>>
  authoritativePeerSheetDataCacheRef: MutableRefObject<Set<string>>
  resolveKnownSheetVersion: (sheetId: string) => number
  resolveCanonicalSheetId: (sheetId: string) => string
  buildFullAuthoritativeGridRegion: (
    rows: readonly Record<string, unknown>[],
    columns: readonly SpreadsheetSheet['columns']
  ) => CommitLocalSheetDataOptions['authoritativeGridRegion']
  commitLocalSheetData: (next: Record<string, unknown>[], options?: CommitLocalSheetDataOptions) => void
}

/**
 * When switching native worksheet tabs, restore rows from the peer cache (or server fallback)
 * and bump the authoritative sync token when the live Univer worksheet looks stale vs rows.
 */
export function useSpreadsheetActiveSheetPeerRestore(params: UseSpreadsheetActiveSheetPeerRestoreParams) {
  const prevActiveSheetIdForPeerRestoreRef = useRef(params.activeSheetId)

  useEffect(() => {
    const prev = prevActiveSheetIdForPeerRestoreRef.current
    prevActiveSheetIdForPeerRestoreRef.current = params.activeSheetId
    if (!params.preferUniverNativeSheetTabs) return
    if (params.resolveCanonicalSheetId(prev) === params.resolveCanonicalSheetId(params.activeSheetId)) return

    const cached = params.authoritativePeerSheetDataCacheRef.current.has(params.activeSheetId)
      ? params.peerSheetDataCacheRef.current.get(params.activeSheetId)
      : undefined
    const cachedOrServerRows = cached
      ? hydrateCachedRowsWithServerIdentities(cached, params.activeSheet.data)
      : (params.activeSheet.data ?? [])
    const liveSnapshot = params.spreadsheetGridRef.current?.getWorkbookSnapshot?.()
    const sourceRows = cachedOrServerRows
    const sortedSourceRows = sortSpreadsheetRowsBySheetSettings(sourceRows, params.activeSheet)
    multiSheetDebugLog('active_sheet_peer_restore', () => ({
      previousSheetId: prev,
      activeSheetId: params.activeSheetId,
      usedCache: Boolean(cached),
      cachedRows: summarizeRowsForDebug(cached),
      activeSheetData: summarizeRowsForDebug(params.activeSheet.data ?? []),
      sourceRows: summarizeRowsForDebug(sourceRows)
    }))
    const sourceValueCount = sourceRows.reduce((total, row) => total + getKnownCellValueCount(row), 0)
    const liveSnapshotValueCount =
      liveSnapshot && typeof liveSnapshot === 'object'
        ? countLiveWorksheetSnapshotValues(liveSnapshot as Record<string, unknown>, params.activeSheetId)
        : 0
    const authoritativeCacheHasLiveMismatch =
      params.authoritativePeerSheetDataCacheRef.current.has(params.activeSheetId) &&
      liveSnapshot &&
      typeof liveSnapshot === 'object' &&
      workbookSnapshotMismatchesViewerRows(
        liveSnapshot as Record<string, unknown>,
        params.activeSheetId,
        sortedSourceRows,
        params.activeSheet.columns
      )
    const needsReapplyBecauseWorkbookSheetIsStale =
      (sourceValueCount > 0 && liveSnapshotValueCount < sourceValueCount) || Boolean(authoritativeCacheHasLiveMismatch)
    const authoritativeGridRegion = needsReapplyBecauseWorkbookSheetIsStale
      ? params.buildFullAuthoritativeGridRegion(sortedSourceRows, params.activeSheet.columns)
      : null
    params.commitLocalSheetData(sortedSourceRows, {
      persisted: false,
      syncGrid: needsReapplyBecauseWorkbookSheetIsStale,
      publishParent: false,
      peerAuthoritative: true,
      replaceSheetVersion: params.resolveKnownSheetVersion(params.activeSheetId),
      authoritativeGridRegion
    })
    if (needsReapplyBecauseWorkbookSheetIsStale) {
      multiSheetDebugLog('active_sheet_token_reapply_after_restore', () => ({
        activeSheetId: params.activeSheetId,
        needsReapplyBecauseWorkbookSheetIsStale,
        authoritativeCacheHasLiveMismatch: Boolean(authoritativeCacheHasLiveMismatch),
        sourceValueCount,
        liveSnapshotValueCount,
        liveSnapshot: summarizeLiveWorksheetSnapshotForDebug(
          liveSnapshot as Record<string, unknown> | null,
          params.activeSheetId
        ),
        authoritativeGridRegion
      }))
    }
  }, [
    params.activeSheet,
    params.activeSheetId,
    params.buildFullAuthoritativeGridRegion,
    params.commitLocalSheetData,
    params.preferUniverNativeSheetTabs,
    params.resolveCanonicalSheetId,
    params.resolveKnownSheetVersion,
    params.spreadsheetGridRef
  ])
}
