import { act, renderHook } from '@testing-library/react'

import { useSpreadsheetUniverDataChangeBridge } from '../useSpreadsheetUniverDataChangeBridge'

describe('useSpreadsheetUniverDataChangeBridge', () => {
  it('does not promote inactive worksheet snapshots to authoritative peer cache', () => {
    const authoritativePeerSheetDataCacheRef = { current: new Set<string>() }
    const peerSheetDataCacheRef = { current: new Map<string, Record<string, unknown>[]>() }

    const { result } = renderHook(() =>
      useSpreadsheetUniverDataChangeBridge({
        activeSheetIdRef: { current: 'sheet-a' },
        createdSheetIdAliasesRef: { current: new Map<string, string>() },
        latestUniverDataRef: { current: null },
        pendingUniverRowsBySheetRef: { current: new Map() },
        peerSheetDataCacheRef,
        authoritativePeerSheetDataCacheRef,
        lastProcessedLengthRef: { current: 0 },
        univerDataChangeTimeoutRef: { current: null },
        operationQueueRef: { current: Promise.resolve() },
        chainOnOperationQueue: async (_queueRef, fn) => {
          await fn()
        },
        processUniverDataChangeRef: { current: jest.fn(async () => {}) },
        getKnownRowsForSheet: () => [],
        getActiveSessionRows: () => [],
        summarizeRowsForDebug: () => ({}),
        multiSheetDebugLog: jest.fn(),
        univerDataChangeDebounceMs: 250,
        canEditWithLock: true,
        entityEnabled: false
      })
    )

    act(() => {
      result.current.handleUniverDataChange([{ _id: 'row-1', ColA: 'x' }], 'sheet-b')
    })

    expect(peerSheetDataCacheRef.current.get('sheet-b')).toEqual([{ _id: 'row-1', ColA: 'x' }])
    expect(authoritativePeerSheetDataCacheRef.current.has('sheet-b')).toBe(false)
  })
})
