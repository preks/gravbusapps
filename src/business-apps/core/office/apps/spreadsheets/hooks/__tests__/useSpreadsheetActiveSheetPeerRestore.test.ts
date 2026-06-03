import { renderHook } from '@testing-library/react'

import { useSpreadsheetActiveSheetPeerRestore } from '../useSpreadsheetActiveSheetPeerRestore'

describe('useSpreadsheetActiveSheetPeerRestore', () => {
  it('commits a region-backed authoritative sync when peer restore detects a stale worksheet', () => {
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
          spreadsheetGridRef: {
            current: {
              getWorkbookSnapshot: () => ({ sheets: {} })
            } as any
          },
          peerSheetDataCacheRef: {
            current: new Map([['sheet-2', [{ _id: 'row-2', _gridRowIndex: 0, column_a: 'server value' }]]])
          },
          authoritativePeerSheetDataCacheRef: {
            current: new Set(['sheet-2'])
          },
          resolveKnownSheetVersion: () => 7,
          resolveCanonicalSheetId: (sheetId: string) => sheetId,
          buildFullAuthoritativeGridRegion: () => ({ minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 }),
          commitLocalSheetData
        }),
      {
        initialProps: { activeSheetId: 'sheet-1' }
      }
    )

    rerender({ activeSheetId: 'sheet-2' })

    expect(commitLocalSheetData).toHaveBeenCalledWith(
      [{ _id: 'row-2', _gridRowIndex: 0, column_a: 'server value' }],
      expect.objectContaining({
        persisted: false,
        syncGrid: true,
        publishParent: false,
        peerAuthoritative: true,
        replaceSheetVersion: 7,
        authoritativeGridRegion: { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 }
      })
    )
  })

  it('does not treat a temp-id to persisted-id alias swap as a real tab switch', () => {
    const commitLocalSheetData = jest.fn()
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
          resolveCanonicalSheetId: (sheetId: string) => (sheetId === 'client-sheet-1' ? 'sheet-1' : sheetId),
          buildFullAuthoritativeGridRegion: () => ({ minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 }),
          commitLocalSheetData
        }),
      {
        initialProps: { activeSheetId: 'client-sheet-1' }
      }
    )

    rerender({ activeSheetId: 'sheet-1' })

    expect(commitLocalSheetData).not.toHaveBeenCalled()
  })
})
