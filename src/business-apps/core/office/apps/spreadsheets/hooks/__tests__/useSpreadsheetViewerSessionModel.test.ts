import { act, renderHook } from '@testing-library/react'

import { useSpreadsheetViewerSessionModel } from '../useSpreadsheetViewerSessionModel'

jest.mock('../useSpreadsheetActiveSheetPeerRestore', () => ({
  useSpreadsheetActiveSheetPeerRestore: jest.fn()
}))

jest.mock('../useSpreadsheetViewerRowResolution', () => ({
  useSpreadsheetViewerRowResolution: jest.fn(() => ({
    getKnownRowsForSheet: jest.fn(() => []),
    getSessionBackedRowsForSheet: jest.fn(() => []),
    getRichestKnownRowsForSheet: jest.fn(() => [])
  }))
}))

describe('useSpreadsheetViewerSessionModel', () => {
  it('stages authoritative paint cells when the active sheet ref matches even if the render-state sheet id lags', () => {
    const sheetStateById = new Map<string, { rows: Record<string, unknown>[]; version: number }>([
      ['sheet-live', { rows: [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'before' }], version: 1 }]
    ])
    const spreadsheetSession = {
      getSheetState: jest.fn((sheetId: string) => sheetStateById.get(sheetId)),
      getActiveSheetState: jest.fn(() => sheetStateById.get('sheet-live')),
      replaceSheetState: jest.fn((sheet: { id: string }, rows: Record<string, unknown>[], version?: number) => {
        sheetStateById.set(sheet.id, { rows, version: typeof version === 'number' ? version : 1 })
      }),
      clearDirty: jest.fn(),
      capturePersistedBaseline: jest.fn()
    }
    const activeSheet = {
      id: 'sheet-live',
      columns: [{ id: 'col-a', name: 'column_a', isVisible: true }]
    } as any
    const appSheetsRef = { current: [activeSheet] }
    const activeSheetIdRef = { current: 'sheet-live' }

    const { result } = renderHook(() =>
      useSpreadsheetViewerSessionModel({
        app: { id: 'app-1', sheets: [activeSheet] },
        spreadsheetSession: spreadsheetSession as any,
        activeSheet,
        activeSheetId: 'sheet-stale',
        activeSheetIdRef,
        appSheetsRef: appSheetsRef as any,
        sheetVersionRef: { current: 1 },
        rememberSheetVersion: jest.fn(),
        updateActiveSheetVersion: jest.fn(),
        resolveKnownSheetVersion: jest.fn(() => 1),
        getActiveSessionRows: jest.fn(() => sheetStateById.get('sheet-live')?.rows ?? []),
        applyLocalAppUpdate: jest.fn(),
        onDataChange: jest.fn(),
        collaborationManagerRef: { current: null },
        preferUniverNativeSheetTabs: true,
        spreadsheetGridRef: { current: null },
        pendingUniverRowsBySheetRef: { current: new Map() },
        latestUniverDataRef: { current: null },
        setActiveSheetId: jest.fn(),
        onRowsStateUpdated: jest.fn()
      })
    )

    act(() => {
      result.current.syncSheetRowsIntoLocalState(
        'sheet-live',
        [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'after' }],
        { syncGrid: true }
      )
    })

    expect(result.current.authoritativeDataSyncToken).toBe(1)
    expect(result.current.authoritativePaintCellsRef.current).toEqual([
      expect.objectContaining({ rowIndex: 0, colIndex: 0, value: 'after' })
    ])
  })

  it('treats canonical aliases as the active sheet when syncing rows into local state', () => {
    const aliasMap = new Map([['client-sheet-live', 'sheet-live']])
    const regions = [
      { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 },
      { minRow: 0, maxRow: 0, minCol: 2, maxCol: 2 }
    ]
    const prepareAuthoritativeRegionSync = jest.fn()
    const spreadsheetSession = {
      getSheetState: jest.fn((sheetId: string) =>
        sheetId === 'sheet-live' ? { rows: [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'before' }], version: 1 } : null
      ),
      getActiveSheetState: jest.fn(() => ({
        rows: [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'before' }],
        version: 1
      })),
      replaceSheetState: jest.fn(),
      clearDirty: jest.fn(),
      capturePersistedBaseline: jest.fn()
    }
    const activeSheet = {
      id: 'sheet-live',
      columns: [{ id: 'col-a', name: 'column_a', isVisible: true }]
    } as any

    const { result } = renderHook(() =>
      useSpreadsheetViewerSessionModel({
        app: { id: 'app-1', sheets: [activeSheet] },
        spreadsheetSession: spreadsheetSession as any,
        activeSheet,
        activeSheetId: 'sheet-live',
        activeSheetIdRef: { current: 'sheet-live' },
        appSheetsRef: { current: [activeSheet] } as any,
        sheetVersionRef: { current: 1 },
        rememberSheetVersion: jest.fn(),
        updateActiveSheetVersion: jest.fn(),
        resolveKnownSheetVersion: jest.fn(() => 1),
        resolveCanonicalSheetId: (sheetId: string) => aliasMap.get(sheetId) ?? sheetId,
        getActiveSessionRows: jest.fn(() => [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'before' }]),
        applyLocalAppUpdate: jest.fn(),
        onDataChange: jest.fn(),
        collaborationManagerRef: { current: null },
        preferUniverNativeSheetTabs: true,
        spreadsheetGridRef: {
          current: { prepareAuthoritativeRegionSync } as any
        },
        pendingUniverRowsBySheetRef: { current: new Map() },
        latestUniverDataRef: { current: null },
        setActiveSheetId: jest.fn(),
        onRowsStateUpdated: jest.fn()
      })
    )

    act(() => {
      result.current.syncSheetRowsIntoLocalState(
        'client-sheet-live',
        [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'after' }],
        { syncGrid: true, authoritativeGridRegion: regions }
      )
    })

    expect(result.current.authoritativeDataSyncToken).toBe(1)
    expect(prepareAuthoritativeRegionSync).toHaveBeenCalledWith(regions)
    expect(result.current.authoritativePaintCellsRef.current).toEqual([
      expect.objectContaining({ rowIndex: 0, colIndex: 0, value: 'after' })
    ])
  })

  it('captures the persisted baseline for active-sheet authoritative syncs', () => {
    const spreadsheetSession = {
      getSheetState: jest.fn((sheetId: string) =>
        sheetId === 'sheet-live' ? { rows: [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'before' }], version: 1 } : null
      ),
      getActiveSheetState: jest.fn(() => ({
        rows: [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'before' }],
        version: 1
      })),
      replaceSheetState: jest.fn(),
      clearDirty: jest.fn(),
      capturePersistedBaseline: jest.fn()
    }
    const activeSheet = {
      id: 'sheet-live',
      columns: [{ id: 'col-a', name: 'column_a', isVisible: true }]
    } as any

    const { result } = renderHook(() =>
      useSpreadsheetViewerSessionModel({
        app: { id: 'app-1', sheets: [activeSheet] },
        spreadsheetSession: spreadsheetSession as any,
        activeSheet,
        activeSheetId: 'sheet-live',
        activeSheetIdRef: { current: 'sheet-live' },
        appSheetsRef: { current: [activeSheet] } as any,
        sheetVersionRef: { current: 1 },
        rememberSheetVersion: jest.fn(),
        updateActiveSheetVersion: jest.fn(),
        resolveKnownSheetVersion: jest.fn(() => 1),
        getActiveSessionRows: jest.fn(() => [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'before' }]),
        applyLocalAppUpdate: jest.fn(),
        onDataChange: jest.fn(),
        collaborationManagerRef: { current: null },
        preferUniverNativeSheetTabs: true,
        spreadsheetGridRef: { current: null },
        pendingUniverRowsBySheetRef: { current: new Map() },
        latestUniverDataRef: { current: null },
        setActiveSheetId: jest.fn(),
        onRowsStateUpdated: jest.fn()
      })
    )

    act(() => {
      result.current.syncSheetRowsIntoLocalState(
        'sheet-live',
        [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'after' }],
        { persisted: true, syncGrid: false, version: 2 }
      )
    })

    expect(spreadsheetSession.capturePersistedBaseline).toHaveBeenCalledWith('sheet-live')
    expect(spreadsheetSession.clearDirty).toHaveBeenCalledWith('sheet-live')
  })

  it('skips staging a generic session diff when sync requests skip projection mode', () => {
    const spreadsheetSession = {
      getSheetState: jest.fn((sheetId: string) =>
        sheetId === 'sheet-live'
          ? {
              rows: [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'before' }],
              version: 1
            }
          : null
      ),
      getActiveSheetState: jest.fn(() => ({
        rows: [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'before' }],
        version: 1
      })),
      replaceSheetState: jest.fn(),
      clearDirty: jest.fn(),
      capturePersistedBaseline: jest.fn()
    }
    const activeSheet = {
      id: 'sheet-live',
      columns: [{ id: 'col-a', name: 'column_a', isVisible: true }]
    } as any

    const { result } = renderHook(() =>
      useSpreadsheetViewerSessionModel({
        app: { id: 'app-1', sheets: [activeSheet] },
        spreadsheetSession: spreadsheetSession as any,
        activeSheet,
        activeSheetId: 'sheet-live',
        activeSheetIdRef: { current: 'sheet-live' },
        appSheetsRef: { current: [activeSheet] } as any,
        sheetVersionRef: { current: 1 },
        rememberSheetVersion: jest.fn(),
        updateActiveSheetVersion: jest.fn(),
        resolveKnownSheetVersion: jest.fn(() => 1),
        getActiveSessionRows: jest.fn(() => [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'before' }]),
        applyLocalAppUpdate: jest.fn(),
        onDataChange: jest.fn(),
        collaborationManagerRef: { current: null },
        preferUniverNativeSheetTabs: true,
        spreadsheetGridRef: { current: null },
        pendingUniverRowsBySheetRef: { current: new Map() },
        latestUniverDataRef: { current: null },
        setActiveSheetId: jest.fn(),
        onRowsStateUpdated: jest.fn()
      })
    )

    act(() => {
      result.current.syncSheetRowsIntoLocalState(
        'sheet-live',
        [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'after' }],
        { syncGrid: true, sessionDiffProjectionMode: 'skip' }
      )
    })

    expect(result.current.authoritativeDataSyncToken).toBe(1)
    expect(result.current.authoritativePaintCellsRef.current).toBeNull()
  })
})
