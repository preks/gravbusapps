import type React from 'react'
import { toast } from 'sonner'

import type { SpreadsheetCollaborationCallbacks, SpreadsheetReplayResponse } from './SpreadsheetCollaborationContract'
import type { SpreadsheetMutationFacade } from './SpreadsheetMutationFacade'
import type { SpreadsheetSession } from './SpreadsheetSession'
import type { SpreadsheetTraceEventInput } from '../services/spreadsheetDiagnostics'
import type { SpreadsheetApp, SpreadsheetSheet } from '../types'
import { hydrateCachedRowsWithServerIdentities } from '../utils/spreadsheetPeerRowHydration'
import { resolveReconciledSheetId } from '../utils/reconcileTemporarySheetId'
import type { StructuralWsDedupToken } from '../utils/spreadsheetStructuralWsDedup'
import { sortSpreadsheetRowsBySheetSettings } from '../utils/spreadsheetSheetRowSort'
import { createCollaborationApplyRemoteDimensions } from '../hooks/collaborationApplyRemoteDimensions'
import { createCollaborationWorkbookStructureHandler } from '../hooks/collaborationWorkbookStructureBridge'
import type { UniverSheetGridCollaborationBridgeHandle } from '../components/UniverSheetGrid.types'

type ViewerRow = Record<string, unknown>

export interface BuildSpreadsheetCollaborationCallbacksParams {
  spreadsheetSession: SpreadsheetSession
  activeSheet: SpreadsheetSheet
  appSheetsRef: React.MutableRefObject<SpreadsheetSheet[]>
  peerSheetDataCacheRef: React.MutableRefObject<Map<string, ViewerRow[]>>
  authoritativePeerSheetDataCacheRef: React.MutableRefObject<Set<string>>
  getBackendRowIdForUiRowIdRef: React.MutableRefObject<(uiRowId: string, univerRow?: number) => string | undefined>
  activeSheetId: string
  commitLocalSheetData: SpreadsheetCollaborationCallbacks['commitLocalSheetData']
  syncSheetRowsIntoLocalState: (
    targetSheetId: string,
    rows: ViewerRow[],
    options?: { persisted?: boolean; syncGrid?: boolean; version?: number; recoveredSheetMeta?: SpreadsheetSheet }
  ) => void
  applyRemoteCellUpdateWithRetry: SpreadsheetCollaborationCallbacks['applyRemoteCellUpdate']
  activeSheetIdRef: React.MutableRefObject<string>
  spreadsheetGridRef: React.MutableRefObject<UniverSheetGridCollaborationBridgeHandle | null | undefined>
  recentLocalRowHeightRef: React.MutableRefObject<Map<string, { height: number; at: number }>>
  recentLocalColWidthRef: React.MutableRefObject<Map<string, { width: number; at: number }>>
  baselineRowHeightsRef: React.MutableRefObject<Map<number, number>>
  baselineColWidthsRef: React.MutableRefObject<Map<number, number>>
  updateActiveSheetVersion: (version: number, mode?: 'set' | 'max') => void
  rememberSheetVersion: (sheetId: string, version: number) => void
  applyLocalAppUpdate: (updater: (currentApp: SpreadsheetApp) => SpreadsheetApp) => void
  structuralWsDedupRef: React.MutableRefObject<StructuralWsDedupToken | null>
  ensureRemoteSheetInLiveWorkbook: (sheet: Record<string, unknown> | undefined, insertIndex?: number) => void
  renameRemoteSheetInLiveWorkbook: (sheetId: string | undefined, nextName: string | undefined) => void
  removeRemoteSheetFromLiveWorkbook: (sheetId: string | undefined) => void
  setRemoteSheetVisibilityInLiveWorkbook: (
    sheetId: string | undefined,
    hidden: boolean | undefined,
    options?: { syncActiveSheet?: boolean }
  ) => void
  mapPersistedRowsToViewerRows: (rows: unknown) => ViewerRow[]
  onAppRefreshNeeded?: (appId: string, sheetId?: string) => void | Promise<void>
  appId: string
  markSheetNeedsGridMaterialization: (sheetId: string, reason: string) => void
  requestSheetDeltaCatchUp: (
    sheetId: string,
    reason:
      | 'collaboration_join'
      | 'collaboration_reconnect'
      | 'sheet_activation'
      | 'visibility'
      | 'focus'
      | 'version_gap'
      | 'row_identity_mismatch'
      | 'stale_version_data_op',
    options?: { sinceVersion?: number; incomingVersion?: number }
  ) => void
  scheduleSheetVersionRefreshFromApi: () => void
  scheduleRemoteStructuralResync: (sheetId?: string, options?: { immediate?: boolean }) => void
  handleRemoteColumnUpdate: (data: Record<string, unknown>) => void
  mutationFacadeRef: React.MutableRefObject<SpreadsheetMutationFacade | null>
  fetchSheetReplaySince: (sheetId: string, sinceVersion: number) => Promise<SpreadsheetReplayResponse>
  isSpreadsheetAppsDebugEnabled: () => boolean
  enqueueDiagnosticsTraceEvent: (event: SpreadsheetTraceEventInput) => void
  sheetT: (key: string) => string
  debugLog: (message: string, meta?: Record<string, unknown>) => void
  setActiveSheetId: (id: string) => void
  getActiveSessionRows: () => ViewerRow[]
  resolveKnownSheetVersion: (sheetId: string) => number
  createdSheetIdAliasesRef?: React.MutableRefObject<Map<string, string>>
}

/**
 * Builds the collaboration manager callback bundle (session reads + grid apply + structural WS).
 */
export function buildSpreadsheetCollaborationCallbacks(
  params: BuildSpreadsheetCollaborationCallbacksParams
): SpreadsheetCollaborationCallbacks {
  const {
    spreadsheetSession,
    activeSheet,
    appSheetsRef,
    peerSheetDataCacheRef,
    authoritativePeerSheetDataCacheRef,
    getBackendRowIdForUiRowIdRef,
    activeSheetId,
    commitLocalSheetData,
    syncSheetRowsIntoLocalState,
    applyRemoteCellUpdateWithRetry,
    activeSheetIdRef,
    spreadsheetGridRef,
    recentLocalRowHeightRef,
    recentLocalColWidthRef,
    baselineRowHeightsRef,
    baselineColWidthsRef,
    updateActiveSheetVersion,
    rememberSheetVersion,
    applyLocalAppUpdate,
    structuralWsDedupRef,
    ensureRemoteSheetInLiveWorkbook,
    renameRemoteSheetInLiveWorkbook,
    removeRemoteSheetFromLiveWorkbook,
    setRemoteSheetVisibilityInLiveWorkbook,
    mapPersistedRowsToViewerRows,
    onAppRefreshNeeded,
    appId,
    markSheetNeedsGridMaterialization,
    requestSheetDeltaCatchUp,
    scheduleSheetVersionRefreshFromApi,
    scheduleRemoteStructuralResync,
    handleRemoteColumnUpdate,
    mutationFacadeRef,
    fetchSheetReplaySince,
    isSpreadsheetAppsDebugEnabled,
    enqueueDiagnosticsTraceEvent,
    sheetT,
    debugLog,
    setActiveSheetId,
    getActiveSessionRows,
    resolveKnownSheetVersion,
    createdSheetIdAliasesRef
  } = params

  const applyRemoteDimensions = createCollaborationApplyRemoteDimensions({
    activeSheetId,
    spreadsheetGridRef,
    recentLocalRowHeightRef,
    recentLocalColWidthRef,
    baselineRowHeightsRef,
    baselineColWidthsRef
  })

  const onWorkbookStructureChange = createCollaborationWorkbookStructureHandler({
    structuralWsDedupRef,
    peerSheetDataCacheRef,
    authoritativePeerSheetDataCacheRef,
    appSheetsRef,
    activeSheetIdRef,
    ensureRemoteSheetInLiveWorkbook,
    renameRemoteSheetInLiveWorkbook,
    removeRemoteSheetFromLiveWorkbook,
    setRemoteSheetVisibilityInLiveWorkbook,
    applyLocalAppUpdate,
    mapPersistedRowsToViewerRows,
    onAppRefreshNeeded,
    appId,
    setActiveSheetId
  })

  return {
    getActiveSheetId: () => {
      const raw = spreadsheetSession.getState().activeSheetId
      const aliases = createdSheetIdAliasesRef?.current
      return aliases ? resolveReconciledSheetId(raw, aliases) : raw
    },
    getColumns: () => spreadsheetSession.getActiveSheetState()?.columns ?? activeSheet.columns,
    getColumnsForSheet: sheetId =>
      spreadsheetSession.getSheetState(sheetId)?.columns ??
      appSheetsRef.current.find(sheet => sheet.id === sheetId)?.columns ??
      [],
    getSheetVersion: sheetId => spreadsheetSession.getSheetState(sheetId)?.version ?? resolveKnownSheetVersion(sheetId),
    getLocalSheetData: () => getActiveSessionRows(),
    getSheetData: sheetId => {
      const targetSheet = appSheetsRef.current.find(sheet => sheet.id === sheetId)
      const fallbackSorted = sortSpreadsheetRowsBySheetSettings(targetSheet?.data ?? [], targetSheet) as ViewerRow[]
      const sheetSessionState = spreadsheetSession.getSheetState(sheetId)
      if (sheetSessionState) {
        return hydrateCachedRowsWithServerIdentities(sheetSessionState.rows as ViewerRow[], fallbackSorted)
      }
      const cached = peerSheetDataCacheRef.current.get(sheetId)
      if (cached) {
        return hydrateCachedRowsWithServerIdentities(cached, fallbackSorted)
      }
      return fallbackSorted
    },
    getBackendRowIdForUiRowId: (uiRowId, univerRow) => getBackendRowIdForUiRowIdRef.current(uiRowId, univerRow),
    commitLocalSheetData,
    commitSheetData: (sheetId, data, options) => {
      syncSheetRowsIntoLocalState(sheetId, data, options)
    },
    applyRemoteCellUpdate: applyRemoteCellUpdateWithRetry,
    applyRemoteCellUpdatesBulk: (items, meta) => {
      spreadsheetGridRef.current?.applyRemoteCellUpdatesBulk?.(items, meta)
    },
    applyRemoteClearAllRange: payload => {
      spreadsheetGridRef.current?.applyRemoteClearAllRange?.(payload)
    },
    applyRemoteClearFormatRange: payload => {
      spreadsheetGridRef.current?.applyRemoteClearFormatRange?.(payload)
    },
    applyRemoteSpreadsheetFeatureOperation: payload => {
      spreadsheetGridRef.current?.applyRemoteSpreadsheetFeatureOperation?.(payload)
    },
    forceGridReapply: (sheetId, region, options) => {
      globalThis.setTimeout(() => {
        if (activeSheetIdRef.current !== sheetId) return
        spreadsheetGridRef.current?.forceAuthoritativeReapply?.(region ?? null, options)
      }, 0)
    },
    applyRemoteDimensions,
    onVersionUpdate: version => {
      updateActiveSheetVersion(version)
    },
    onSheetVersionUpdate: (sheetId, version) => {
      rememberSheetVersion(sheetId, version)
      applyLocalAppUpdate(currentApp => ({
        ...currentApp,
        sheets: currentApp.sheets.map(sheet =>
          sheet.id !== sheetId
            ? sheet
            : {
                ...sheet,
                version: Math.max(Number(sheet.version ?? 0), Math.trunc(version))
              }
        )
      }))
    },
    onWorkbookStructureChange,
    markSheetNeedsGridMaterialization,
    requestSheetCatchUp: (sheetId, reason, options) => {
      void requestSheetDeltaCatchUp(sheetId, reason, options)
    },
    scheduleSheetVersionRefreshFromApi,
    scheduleRemoteStructuralResync,
    onRemoteColumnUpdate: handleRemoteColumnUpdate,
    fetchChangesSince: async (sheetId, sinceVersion) => {
      const facade = mutationFacadeRef.current
      if (facade) {
        return facade.fetchSheetChangesSince(sheetId, sinceVersion)
      }
      return fetchSheetReplaySince(sheetId, sinceVersion)
    },
    isCollabDiagEnabled: isSpreadsheetAppsDebugEnabled,
    onCollabDiagnostic: (event, meta) => {
      debugLog('collab-diagnostic', { event, meta })
    },
    onDiagnosticsTraceEvent: event => {
      enqueueDiagnosticsTraceEvent(event)
    },
    onPendingQueueTrimmed: dropped => {
      if (dropped > 0) {
        toast.warning(sheetT('collab-queue-trimmed-warn'), { duration: 8000 })
      }
    }
  }
}
