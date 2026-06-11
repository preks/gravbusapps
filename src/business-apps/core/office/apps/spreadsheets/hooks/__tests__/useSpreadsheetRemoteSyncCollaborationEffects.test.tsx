import { act, renderHook } from '@testing-library/react'

import { useSpreadsheetRemoteSyncCollaborationEffects } from '../useSpreadsheetRemoteSyncCollaborationEffects'

describe('useSpreadsheetRemoteSyncCollaborationEffects', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  const baseParams = () => {
    const activeSheetIdRef = { current: 'sheet-1' }
    return {
      preferUniverNativeSheetTabs: true,
      entityEnabled: false,
      appId: 'app-1',
      appIsShared: true,
      activeSheetId: 'sheet-1',
      activeSheetIdRef,
      collaborationJoined: true,
      collaborationConnected: true,
      requestSheetDeltaCatchUp: jest.fn(async () => true),
      ensureSheetReady: jest.fn(async () => 'ready' as const),
      rememberKnownSheetVersion: jest.fn(),
      rememberSheetVersion: jest.fn(),
      scheduleSheetVersionRefreshFromApi: jest.fn(),
      hasPendingPersistenceForSheet: jest.fn(() => false),
      commitLocalSheetData: jest.fn(),
      peerSheetDataCacheRef: { current: new Map<string, Record<string, unknown>[]>() },
      authoritativePeerSheetDataCacheRef: { current: new Set<string>() },
      createdSheetIdAliasesRef: { current: new Map<string, string>() },
      pendingCreatedSheetSelectionRef: { current: null },
      appSheetsRef: { current: [{ id: 'sheet-1', name: 'Sheet 1', columns: [] } as never] }
    }
  }

  it('routes native tab switches through ensureSheetReady', async () => {
    const params = baseParams()
    const { rerender } = renderHook(nextParams => useSpreadsheetRemoteSyncCollaborationEffects(nextParams), {
      initialProps: params
    })

    params.activeSheetIdRef.current = 'sheet-2'
    rerender({
      ...params,
      activeSheetId: 'sheet-2'
    })

    await act(async () => {
      jest.runOnlyPendingTimers()
    })

    expect(params.ensureSheetReady).toHaveBeenCalledTimes(1)
    expect(params.ensureSheetReady).toHaveBeenCalledWith('sheet-2', 'sheet_switch', {
      allowManifestRefresh: true
    })
  })

  it('routes browser focus through ensureSheetReady', async () => {
    const params = baseParams()
    renderHook(() => useSpreadsheetRemoteSyncCollaborationEffects(params))

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
    })

    expect(params.ensureSheetReady).toHaveBeenCalledWith('sheet-1', 'focus', {
      allowManifestRefresh: true
    })
  })

  it('dedupes back-to-back visibility and focus foreground catch-up for the same sheet', async () => {
    const params = baseParams()
    renderHook(() => useSpreadsheetRemoteSyncCollaborationEffects(params))
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible'
    })

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      window.dispatchEvent(new Event('focus'))
    })

    expect(params.ensureSheetReady).toHaveBeenCalledTimes(1)
    expect(params.ensureSheetReady).toHaveBeenCalledWith('sheet-1', 'visibility', {
      allowManifestRefresh: true
    })
  })
})
