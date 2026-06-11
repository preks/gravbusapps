import { renderHook } from '@testing-library/react'

import { useSpreadsheetActiveSheetPeerRestore } from '../useSpreadsheetActiveSheetPeerRestore'

describe('useSpreadsheetActiveSheetPeerRestore', () => {
  it('dispatches switched sheets into canonical materialization after seeding rows', () => {
    const restoreSwitchedSheetRows = jest.fn()
    const requestCanonicalGridMaterialization = jest.fn()
    const activeSheet = {
      id: 'sheet-2',
      data: [{ _id: 'row-2', _gridRowIndex: 0, column_a: 'server value' }],
      columns: [{ id: 'col-a', name: 'column_a', isVisible: true }]
    } as any

    const { rerender } = renderHook(
      ({ activeSheetId }) =>
        useSpreadsheetActiveSheetPeerRestore({
          activeSheet,
          activeSheetId,
          preferUniverNativeSheetTabs: true,
          spreadsheetGridRef: { current: null },
          peerSheetDataCacheRef: {
            current: new Map([['sheet-2', [{ _id: 'row-2', _gridRowIndex: 0, column_a: 'server value' }]]])
          },
          authoritativePeerSheetDataCacheRef: {
            current: new Set(['sheet-2'])
          },
          resolveKnownSheetVersion: () => 7,
          resolveKnownSheetSnapshotVersion: () => 3,
          resolveLiveAppliedSheetVersion: () => 7,
          resolveLiveAppliedSheetSnapshotVersion: () => 2,
          rememberLiveAppliedSheetVersion: jest.fn(),
          resolveCanonicalSheetId: (sheetId: string) => sheetId,
          buildFullAuthoritativeGridRegion: () => ({ minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 }),
          requestCanonicalGridMaterialization,
          restoreSwitchedSheetRows
        }),
      { initialProps: { activeSheetId: 'sheet-1' } }
    )

    rerender({ activeSheetId: 'sheet-2' })

    expect(restoreSwitchedSheetRows).toHaveBeenCalledWith(
      'sheet-2',
      [{ _id: 'row-2', _gridRowIndex: 0, column_a: 'server value' }],
      expect.objectContaining({
        version: 7
      })
    )
    expect(requestCanonicalGridMaterialization).toHaveBeenCalledWith('sheet-2', 'sheet_switch')
  })

  it('does not treat a temp-id to persisted-id alias swap as a real tab switch', () => {
    const restoreSwitchedSheetRows = jest.fn()
    const activeSheet = {
      id: 'sheet-1',
      data: [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'value' }],
      columns: [{ id: 'col-a', name: 'column_a', isVisible: true }]
    } as any

    const { rerender } = renderHook(
      ({ activeSheetId }) =>
        useSpreadsheetActiveSheetPeerRestore({
          activeSheet,
          activeSheetId,
          preferUniverNativeSheetTabs: true,
          spreadsheetGridRef: { current: null },
          peerSheetDataCacheRef: { current: new Map() },
          authoritativePeerSheetDataCacheRef: { current: new Set() },
          resolveKnownSheetVersion: () => 1,
          resolveKnownSheetSnapshotVersion: () => 1,
          resolveLiveAppliedSheetVersion: () => 1,
          resolveLiveAppliedSheetSnapshotVersion: () => 1,
          rememberLiveAppliedSheetVersion: jest.fn(),
          resolveCanonicalSheetId: (sheetId: string) => (sheetId === 'client-sheet-1' ? 'sheet-1' : sheetId),
          buildFullAuthoritativeGridRegion: () => ({ minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 }),
          restoreSwitchedSheetRows
        }),
      { initialProps: { activeSheetId: 'client-sheet-1' } }
    )

    rerender({ activeSheetId: 'sheet-1' })

    expect(restoreSwitchedSheetRows).not.toHaveBeenCalled()
  })

  it('preserves pending canonical materialization reasons when dispatching the switch', () => {
    const restoreSwitchedSheetRows = jest.fn()
    const requestCanonicalGridMaterialization = jest.fn()
    const activeSheet = {
      id: 'sheet-2',
      data: [{ _id: 'row-2', _gridRowIndex: 0, column_a: 'server value', column_b: 'new column value' }],
      columns: [
        { id: 'col-a', name: 'column_a', isVisible: true },
        { id: 'col-b', name: 'column_b', isVisible: true }
      ]
    } as any

    const { rerender } = renderHook(
      ({ activeSheetId }) =>
        useSpreadsheetActiveSheetPeerRestore({
          activeSheet,
          activeSheetId,
          preferUniverNativeSheetTabs: true,
          spreadsheetGridRef: { current: null },
          peerSheetDataCacheRef: {
            current: new Map([
              ['sheet-2', [{ _id: 'row-2', _gridRowIndex: 0, column_a: 'server value', column_b: 'new column value' }]]
            ])
          },
          authoritativePeerSheetDataCacheRef: {
            current: new Set(['sheet-2'])
          },
          resolveKnownSheetVersion: () => 8,
          resolveKnownSheetSnapshotVersion: () => 4,
          resolveLiveAppliedSheetVersion: () => 8,
          resolveLiveAppliedSheetSnapshotVersion: () => 4,
          rememberLiveAppliedSheetVersion: jest.fn(),
          resolveCanonicalSheetId: (sheetId: string) => sheetId,
          buildFullAuthoritativeGridRegion: () => ({ minRow: 0, maxRow: 0, minCol: 0, maxCol: 1 }),
          getGridMaterializationReason: () => 'column_add',
          requestCanonicalGridMaterialization,
          restoreSwitchedSheetRows
        }),
      { initialProps: { activeSheetId: 'sheet-1' } }
    )

    rerender({ activeSheetId: 'sheet-2' })

    expect(restoreSwitchedSheetRows).toHaveBeenCalledWith(
      'sheet-2',
      [{ _id: 'row-2', _gridRowIndex: 0, column_a: 'server value', column_b: 'new column value' }],
      expect.objectContaining({
        version: 8
      })
    )
    expect(requestCanonicalGridMaterialization).toHaveBeenCalledWith('sheet-2', 'column_add')
  })

  it('falls back to snapshot style repair when canonical materialization is unavailable', () => {
    const restoreSwitchedSheetRows = jest.fn()
    const requestSheetSnapshotStyleRepair = jest.fn()
    const activeSheet = {
      id: 'sheet-2',
      data: [{ _id: 'row-2', _gridRowIndex: 0, column_a: 'server value' }],
      columns: [{ id: 'col-a', name: 'column_a', isVisible: true }]
    } as any

    const { rerender } = renderHook(
      ({ activeSheetId }) =>
        useSpreadsheetActiveSheetPeerRestore({
          activeSheet,
          activeSheetId,
          preferUniverNativeSheetTabs: true,
          spreadsheetGridRef: { current: null },
          peerSheetDataCacheRef: {
            current: new Map([['sheet-2', [{ _id: 'row-2', _gridRowIndex: 0, column_a: 'server value' }]]])
          },
          authoritativePeerSheetDataCacheRef: {
            current: new Set(['sheet-2'])
          },
          resolveKnownSheetVersion: () => 7,
          resolveKnownSheetSnapshotVersion: () => 3,
          resolveLiveAppliedSheetVersion: () => 7,
          resolveLiveAppliedSheetSnapshotVersion: () => 3,
          rememberLiveAppliedSheetVersion: jest.fn(),
          resolveCanonicalSheetId: (sheetId: string) => sheetId,
          buildFullAuthoritativeGridRegion: () => ({ minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 }),
          requestSheetSnapshotStyleRepair,
          restoreSwitchedSheetRows
        }),
      { initialProps: { activeSheetId: 'sheet-1' } }
    )

    rerender({ activeSheetId: 'sheet-2' })

    expect(restoreSwitchedSheetRows).toHaveBeenCalledWith(
      'sheet-2',
      [{ _id: 'row-2', _gridRowIndex: 0, column_a: 'server value' }],
      expect.objectContaining({
        version: 7
      })
    )
    expect(requestSheetSnapshotStyleRepair).toHaveBeenCalledWith({
      sheet: activeSheet,
      sheetId: 'sheet-2',
      rows: [{ _id: 'row-2', _gridRowIndex: 0, column_a: 'server value' }],
      knownSheetVersion: 7,
      knownSheetSnapshotVersion: 3,
      reason: 'sheet_switch',
      allowBackendHydrationFallback: true
    })
  })

  it('seeds switched-sheet rows through the non-dirty authoritative restore path only once', () => {
    const restoreSwitchedSheetRows = jest.fn()
    const commitLocalSheetData = jest.fn()
    const activeSheet = {
      id: 'sheet-2',
      data: [{ _id: 'row-2', _gridRowIndex: 0, column_a: 'server value' }],
      columns: [{ id: 'col-a', name: 'column_a', isVisible: true }]
    } as any

    const { rerender } = renderHook(
      ({ activeSheetId }) =>
        useSpreadsheetActiveSheetPeerRestore({
          activeSheet,
          activeSheetId,
          preferUniverNativeSheetTabs: true,
          spreadsheetGridRef: { current: null },
          peerSheetDataCacheRef: {
            current: new Map([['sheet-2', [{ _id: 'row-2', _gridRowIndex: 0, column_a: 'server value' }]]])
          },
          authoritativePeerSheetDataCacheRef: {
            current: new Set(['sheet-2'])
          },
          resolveKnownSheetVersion: () => 12,
          resolveKnownSheetSnapshotVersion: () => 5,
          resolveLiveAppliedSheetVersion: () => 12,
          resolveLiveAppliedSheetSnapshotVersion: () => 5,
          rememberLiveAppliedSheetVersion: jest.fn(),
          resolveCanonicalSheetId: (sheetId: string) => sheetId,
          buildFullAuthoritativeGridRegion: () => ({ minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 }),
          requestCanonicalGridMaterialization: jest.fn(),
          restoreSwitchedSheetRows,
          commitLocalSheetData
        } as any),
      { initialProps: { activeSheetId: 'sheet-1' } }
    )

    rerender({ activeSheetId: 'sheet-2' })

    expect(restoreSwitchedSheetRows).toHaveBeenCalledTimes(1)
    expect(restoreSwitchedSheetRows).toHaveBeenCalledWith(
      'sheet-2',
      [{ _id: 'row-2', _gridRowIndex: 0, column_a: 'server value' }],
      { version: 12 }
    )
    expect(commitLocalSheetData).not.toHaveBeenCalled()
  })
})
