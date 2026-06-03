import { buildSpreadsheetCollaborationCallbacks } from '../buildSpreadsheetCollaborationCallbacks'

const ACTIVE_SHEET_ID = 'sheet-A'

const buildMinimalCallbacks = (spreadsheetGridRef: { current: { forceAuthoritativeReapply: jest.Mock } | null }) => {
  const activeSheet = { id: ACTIVE_SHEET_ID, columns: [], data: [] } as any
  const spreadsheetSession = {
    getState: () => ({ activeSheetId: ACTIVE_SHEET_ID }),
    getActiveSheetState: () => ({ columns: [], version: 0 }),
    getSheetState: () => ({ columns: [], version: 0, rows: [] }),
    applyMutation: () => undefined
  } as any

  return buildSpreadsheetCollaborationCallbacks({
    spreadsheetSession,
    activeSheet,
    appSheetsRef: { current: [activeSheet] } as any,
    peerSheetDataCacheRef: { current: new Map() } as any,
    authoritativePeerSheetDataCacheRef: { current: new Set() } as any,
    getBackendRowIdForUiRowIdRef: { current: () => undefined } as any,
    activeSheetId: ACTIVE_SHEET_ID,
    commitLocalSheetData: () => undefined,
    syncSheetRowsIntoLocalState: () => undefined,
    applyRemoteCellUpdateWithRetry: jest.fn() as any,
    activeSheetIdRef: { current: ACTIVE_SHEET_ID } as any,
    spreadsheetGridRef: spreadsheetGridRef as any,
    recentLocalRowHeightRef: { current: new Map() } as any,
    recentLocalColWidthRef: { current: new Map() } as any,
    baselineRowHeightsRef: { current: new Map() } as any,
    baselineColWidthsRef: { current: new Map() } as any,
    updateActiveSheetVersion: () => undefined,
    rememberSheetVersion: () => undefined,
    applyLocalAppUpdate: () => undefined,
    structuralWsDedupRef: { current: null } as any,
    ensureRemoteSheetInLiveWorkbook: () => undefined,
    renameRemoteSheetInLiveWorkbook: () => undefined,
    removeRemoteSheetFromLiveWorkbook: () => undefined,
    setRemoteSheetVisibilityInLiveWorkbook: () => undefined,
    mapPersistedRowsToViewerRows: () => [],
    appId: 'app-1',
    markSheetNeedsGridMaterialization: () => undefined,
    requestSheetDeltaCatchUp: () => undefined,
    scheduleSheetVersionRefreshFromApi: () => undefined,
    scheduleRemoteStructuralResync: () => undefined,
    handleRemoteColumnUpdate: () => undefined,
    mutationFacadeRef: { current: null } as any,
    fetchSheetReplaySince: async () => ({ currentVersion: 0, changes: [], requiresSnapshot: false }),
    isSpreadsheetAppsDebugEnabled: () => false,
    enqueueDiagnosticsTraceEvent: jest.fn(),
    sheetT: (key: string) => key,
    debugLog: jest.fn(),
    setActiveSheetId: () => undefined,
    getActiveSessionRows: () => [],
    resolveKnownSheetVersion: () => 0
  })
}

describe('buildSpreadsheetCollaborationCallbacks forceGridReapply guard', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('blocks null-region full-grid reapply unless allowFullGridReapply is set', () => {
    const forceAuthoritativeReapply = jest.fn()
    const spreadsheetGridRef = { current: { forceAuthoritativeReapply } }
    const callbacks = buildMinimalCallbacks(spreadsheetGridRef)

    callbacks.forceGridReapply?.(ACTIVE_SHEET_ID, null, {
      clearAllSignatures: true,
      preferBulk: true,
      reason: 'style_version_catchup'
    })

    jest.runOnlyPendingTimers()
    expect(forceAuthoritativeReapply).not.toHaveBeenCalled()
  })

  it('forwards bounded-region reapply without allowFullGridReapply', () => {
    const forceAuthoritativeReapply = jest.fn()
    const spreadsheetGridRef = { current: { forceAuthoritativeReapply } }
    const callbacks = buildMinimalCallbacks(spreadsheetGridRef)
    const region = { minRow: 112, maxRow: 115, minCol: 12, maxCol: 12 }

    callbacks.forceGridReapply?.(ACTIVE_SHEET_ID, region, {
      clearAllSignatures: false,
      preferBulk: true,
      reason: 'peer_value_bounded_catchup'
    })

    jest.runOnlyPendingTimers()
    expect(forceAuthoritativeReapply).toHaveBeenCalledWith(region, {
      clearAllSignatures: false,
      preferBulk: true,
      reason: 'peer_value_bounded_catchup'
    })
  })

  it('forwards explicit full-grid reapply when allowFullGridReapply is true', () => {
    const forceAuthoritativeReapply = jest.fn()
    const spreadsheetGridRef = { current: { forceAuthoritativeReapply } }
    const callbacks = buildMinimalCallbacks(spreadsheetGridRef)

    callbacks.forceGridReapply?.(ACTIVE_SHEET_ID, null, {
      allowFullGridReapply: true,
      clearAllSignatures: true,
      preferBulk: true,
      reason: 'column_reorder_fallback'
    })

    jest.runOnlyPendingTimers()
    expect(forceAuthoritativeReapply).toHaveBeenCalledWith(null, {
      allowFullGridReapply: true,
      clearAllSignatures: true,
      preferBulk: true,
      reason: 'column_reorder_fallback'
    })
  })
})
