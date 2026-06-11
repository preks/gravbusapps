import { useEffect, useRef, type MutableRefObject } from 'react'

import type { UniverSheetGridHandle } from '../components/UniverSheetGrid.types'
import type { SpreadsheetSheet } from '../types'
import { hydrateCachedRowsWithServerIdentities } from '../utils/spreadsheetPeerRowHydration'
import { sortSpreadsheetRowsBySheetSettings } from '../utils/spreadsheetSheetRowSort'
import { multiSheetDebugLog, summarizeRowsForDebug } from '../utils/spreadsheetViewerDebug'

import type { AuthoritativeGridReapplyTarget } from '../core/SpreadsheetCollaborationContract'

export interface UseSpreadsheetActiveSheetPeerRestoreParams {
  activeSheet: SpreadsheetSheet
  activeSheetId: string
  preferUniverNativeSheetTabs: boolean
  spreadsheetGridRef: MutableRefObject<UniverSheetGridHandle | null>
  peerSheetDataCacheRef: MutableRefObject<Map<string, Record<string, unknown>[]>>
  authoritativePeerSheetDataCacheRef: MutableRefObject<Set<string>>
  resolveKnownSheetVersion: (sheetId: string) => number
  resolveKnownSheetSnapshotVersion: (sheetId: string) => number
  resolveLiveAppliedSheetVersion: (sheetId: string) => number
  resolveLiveAppliedSheetSnapshotVersion: (sheetId: string) => number
  rememberLiveAppliedSheetVersion?: (sheetId: string, version: number | undefined) => void
  resolveCanonicalSheetId: (sheetId: string) => string
  buildFullAuthoritativeGridRegion: (
    rows: readonly Record<string, unknown>[],
    columns: readonly SpreadsheetSheet['columns']
  ) => AuthoritativeGridReapplyTarget
  getGridMaterializationReason?: (sheetId: string) => string | null | undefined
  requestCanonicalGridMaterialization?: (
    sheetId: string,
    reason: 'sheet_switch' | 'focus' | 'visibility' | 'reconnect' | 'prefetch'
  ) => void
  requestSheetSnapshotStyleRepair?: (params: {
    sheet: SpreadsheetSheet
    sheetId: string
    rows: Record<string, unknown>[]
    knownSheetVersion: number
    knownSheetSnapshotVersion: number
    reason: 'sheet_switch'
    allowBackendHydrationFallback?: boolean
  }) => Promise<boolean> | boolean
  restoreSwitchedSheetRows: (sheetId: string, rows: Record<string, unknown>[], options?: { version?: number }) => void
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
    const sourceRows = cachedOrServerRows
    const sortedSourceRows = sortSpreadsheetRowsBySheetSettings(sourceRows, params.activeSheet)
    const knownSheetVersion = params.resolveKnownSheetVersion(params.activeSheetId)
    const knownSheetSnapshotVersion = params.resolveKnownSheetSnapshotVersion(params.activeSheetId)
    const materializationReason = params.getGridMaterializationReason?.(params.activeSheetId)
    multiSheetDebugLog('active_sheet_peer_restore', () => ({
      previousSheetId: prev,
      activeSheetId: params.activeSheetId,
      usedCache: Boolean(cached),
      cachedRows: summarizeRowsForDebug(cached),
      activeSheetData: summarizeRowsForDebug(params.activeSheet.data ?? []),
      sourceRows: summarizeRowsForDebug(sourceRows),
      knownSheetVersion,
      knownSheetSnapshotVersion,
      materializationReason
    }))
    multiSheetDebugLog('active_sheet_peer_restore_switch_decision', () => ({
      activeSheetId: params.activeSheetId,
      decision: 'canonical_materialization_dispatch',
      snapshotValidationUsed: false,
      canonicalMaterializationUsed: true,
      knownSheetVersion,
      knownSheetSnapshotVersion,
      materializationReason
    }))

    params.restoreSwitchedSheetRows(params.activeSheetId, sortedSourceRows, {
      version: knownSheetVersion
    })
    if (params.requestCanonicalGridMaterialization) {
      params.requestCanonicalGridMaterialization(
        params.activeSheetId,
        typeof materializationReason === 'string' && materializationReason.length > 0
          ? (materializationReason as 'sheet_switch' | 'focus' | 'visibility' | 'reconnect' | 'prefetch')
          : 'sheet_switch'
      )
      return
    }
    void params.requestSheetSnapshotStyleRepair?.({
      sheet: params.activeSheet,
      sheetId: params.activeSheetId,
      rows: sortedSourceRows,
      knownSheetVersion,
      knownSheetSnapshotVersion,
      reason: 'sheet_switch',
      allowBackendHydrationFallback: true
    })
  }, [
    params.activeSheet,
    params.activeSheetId,
    params.getGridMaterializationReason,
    params.preferUniverNativeSheetTabs,
    params.requestCanonicalGridMaterialization,
    params.requestSheetSnapshotStyleRepair,
    params.restoreSwitchedSheetRows,
    params.resolveCanonicalSheetId,
    params.resolveKnownSheetSnapshotVersion,
    params.resolveKnownSheetVersion,
    params.spreadsheetGridRef
  ])
}
