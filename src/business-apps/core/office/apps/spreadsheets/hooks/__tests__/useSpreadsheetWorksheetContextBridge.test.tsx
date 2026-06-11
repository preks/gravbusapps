import { act, renderHook } from '@testing-library/react'

import type { SpreadsheetSheet } from '../../types'
import { useSpreadsheetWorksheetContextBridge } from '../useSpreadsheetWorksheetContextBridge'

function createSheet(id: string, name = id): SpreadsheetSheet {
  return {
    id,
    name,
    columns: [],
    data: [],
    views: [],
    viewType: 'table',
    settings: {},
    version: 0
  } as SpreadsheetSheet
}

describe('useSpreadsheetWorksheetContextBridge', () => {
  it('ignores temporary worksheet fallback during programmatic activation', () => {
    const setActiveSheetIdWithPeerCache = jest.fn()
    const programmaticWorksheetActivationGuardRef = {
      current: {
        expectedActiveSheetId: 'sheet-2',
        expiresAt: Date.now() + 5_000
      }
    }

    const { result } = renderHook(() =>
      useSpreadsheetWorksheetContextBridge({
        sheets: [createSheet('sheet-1', 'Sheet 1'), createSheet('sheet-2', 'Sheet 2')],
        activeSheetIdRef: { current: 'sheet-2' },
        createdSheetIdAliasesRef: { current: new Map() },
        programmaticWorksheetActivationGuardRef,
        pendingCreatedSheetSelectionRef: { current: null },
        peerSheetDataCacheRef: { current: new Map() },
        getActiveSessionRows: () => [],
        setActiveSheetIdWithPeerCache,
        resolveKnownSheetVersion: () => 1,
        debugLog: jest.fn()
      })
    )

    let firstDecision: ReturnType<typeof result.current.handleUniverActiveWorksheetChange> | undefined
    act(() => {
      firstDecision = result.current.handleUniverActiveWorksheetChange('sheet-1', 'Sheet 1')
    })

    expect(setActiveSheetIdWithPeerCache).not.toHaveBeenCalled()
    expect(programmaticWorksheetActivationGuardRef.current).not.toBeNull()
    expect(firstDecision).toMatchObject({
      accepted: false,
      decision: 'blocked_programmatic_activation'
    })

    let secondDecision: ReturnType<typeof result.current.handleUniverActiveWorksheetChange> | undefined
    act(() => {
      secondDecision = result.current.handleUniverActiveWorksheetChange('sheet-2', 'Sheet 2')
    })

    expect(setActiveSheetIdWithPeerCache).not.toHaveBeenCalled()
    expect(programmaticWorksheetActivationGuardRef.current).toBeNull()
    expect(secondDecision).toMatchObject({
      accepted: true,
      decision: 'matched',
      targetSheetId: 'sheet-2'
    })
  })

  it('does not suppress a real worksheet change after guard invalidates', () => {
    const setActiveSheetIdWithPeerCache = jest.fn()
    const programmaticWorksheetActivationGuardRef = {
      current: {
        expectedActiveSheetId: 'sheet-2',
        expiresAt: Date.now() + 5_000
      }
    }
    const activeSheetIdRef = { current: 'sheet-3' }

    const { result } = renderHook(() =>
      useSpreadsheetWorksheetContextBridge({
        sheets: [
          createSheet('sheet-1', 'Sheet 1'),
          createSheet('sheet-2', 'Sheet 2'),
          createSheet('sheet-3', 'Sheet 3')
        ],
        activeSheetIdRef,
        createdSheetIdAliasesRef: { current: new Map() },
        programmaticWorksheetActivationGuardRef,
        pendingCreatedSheetSelectionRef: { current: null },
        peerSheetDataCacheRef: { current: new Map() },
        getActiveSessionRows: () => [],
        setActiveSheetIdWithPeerCache,
        resolveKnownSheetVersion: () => 1,
        debugLog: jest.fn()
      })
    )

    act(() => {
      result.current.handleUniverActiveWorksheetChange('sheet-1', 'Sheet 1')
    })

    expect(programmaticWorksheetActivationGuardRef.current).toBeNull()
    expect(setActiveSheetIdWithPeerCache).toHaveBeenCalledWith('sheet-1')
  })

  it('drops unresolved mutation targets while a created sheet id is still temporary', () => {
    const { result } = renderHook(() =>
      useSpreadsheetWorksheetContextBridge({
        sheets: [createSheet('sheet-1', 'Sheet 1')],
        activeSheetIdRef: { current: 'sheet-1' },
        createdSheetIdAliasesRef: { current: new Map() },
        programmaticWorksheetActivationGuardRef: { current: null },
        pendingCreatedSheetSelectionRef: {
          current: {
            temporarySheetId: 'temp-sheet',
            persistedSheetId: null
          }
        },
        peerSheetDataCacheRef: { current: new Map() },
        getActiveSessionRows: () => [],
        setActiveSheetIdWithPeerCache: jest.fn(),
        resolveKnownSheetVersion: () => 0,
        debugLog: jest.fn()
      })
    )

    const decision = result.current.resolveMutationPersistTarget('temp-sheet')

    expect(decision).toMatchObject({
      submit: false,
      decision: 'pending_sheet_creation',
      canonicalProducerSheetId: 'temp-sheet'
    })
  })

  it('retries a previously unknown worksheet once sheet metadata arrives', () => {
    const setActiveSheetIdWithPeerCache = jest.fn()
    const { result, rerender } = renderHook(
      ({ sheets }: { sheets: SpreadsheetSheet[] }) =>
        useSpreadsheetWorksheetContextBridge({
          sheets,
          activeSheetIdRef: { current: 'sheet-1' },
          createdSheetIdAliasesRef: { current: new Map() },
          programmaticWorksheetActivationGuardRef: { current: null },
          pendingCreatedSheetSelectionRef: { current: null },
          peerSheetDataCacheRef: { current: new Map() },
          getActiveSessionRows: () => [],
          setActiveSheetIdWithPeerCache,
          resolveKnownSheetVersion: () => 1,
          debugLog: jest.fn()
        }),
      {
        initialProps: {
          sheets: [createSheet('sheet-1', 'Sheet 1')]
        }
      }
    )

    let firstDecision: ReturnType<typeof result.current.handleUniverActiveWorksheetChange> | undefined
    act(() => {
      firstDecision = result.current.handleUniverActiveWorksheetChange('sheet-2', 'Sheet 2')
    })

    expect(firstDecision).toMatchObject({
      accepted: false,
      decision: 'unknown_sheet',
      targetSheetId: null
    })
    expect(setActiveSheetIdWithPeerCache).not.toHaveBeenCalled()

    rerender({
      sheets: [createSheet('sheet-1', 'Sheet 1'), createSheet('sheet-2', 'Sheet 2')]
    })

    let secondDecision: ReturnType<typeof result.current.handleUniverActiveWorksheetChange> | undefined
    act(() => {
      secondDecision = result.current.handleUniverActiveWorksheetChange('sheet-2', 'Sheet 2')
    })

    expect(secondDecision).toMatchObject({
      accepted: true,
      decision: 'synced',
      targetSheetId: 'sheet-2'
    })
    expect(setActiveSheetIdWithPeerCache).toHaveBeenCalledWith('sheet-2')
  })

  it('blocks mutation persistence when producer and React active sheet diverge', () => {
    const setActiveSheetIdWithPeerCache = jest.fn()
    const { result } = renderHook(() =>
      useSpreadsheetWorksheetContextBridge({
        sheets: [createSheet('sheet-1', 'Sheet 1'), createSheet('sheet-2', 'Sheet 2')],
        activeSheetIdRef: { current: 'sheet-1' },
        createdSheetIdAliasesRef: { current: new Map() },
        programmaticWorksheetActivationGuardRef: { current: null },
        pendingCreatedSheetSelectionRef: { current: null },
        peerSheetDataCacheRef: { current: new Map() },
        getActiveSessionRows: () => [],
        setActiveSheetIdWithPeerCache,
        resolveKnownSheetVersion: (sheetId: string) => (sheetId === 'sheet-1' ? 5 : 3),
        debugLog: jest.fn()
      })
    )

    const decision = result.current.resolveMutationPersistTarget('sheet-2')

    expect(decision).toMatchObject({
      submit: false,
      decision: 'selection_sync_required',
      targetSheetId: 'sheet-2',
      canonicalReactActiveSheetId: 'sheet-1',
      canonicalProducerSheetId: 'sheet-2'
    })
    expect(setActiveSheetIdWithPeerCache).not.toHaveBeenCalled()
  })

  it('still allows switching React active sheet to a known worksheet even if its version is unresolved', () => {
    const setActiveSheetIdWithPeerCache = jest.fn()
    const { result } = renderHook(() =>
      useSpreadsheetWorksheetContextBridge({
        sheets: [createSheet('sheet-1', 'Sheet 1'), createSheet('sheet-2', 'Sheet 2')],
        activeSheetIdRef: { current: 'sheet-1' },
        createdSheetIdAliasesRef: { current: new Map() },
        programmaticWorksheetActivationGuardRef: { current: null },
        pendingCreatedSheetSelectionRef: { current: null },
        peerSheetDataCacheRef: { current: new Map() },
        getActiveSessionRows: () => [],
        setActiveSheetIdWithPeerCache,
        resolveKnownSheetVersion: (sheetId: string) => (sheetId === 'sheet-1' ? 9 : 0),
        debugLog: jest.fn()
      })
    )

    let decision: ReturnType<typeof result.current.handleUniverActiveWorksheetChange> | undefined
    act(() => {
      decision = result.current.handleUniverActiveWorksheetChange('sheet-2', 'Sheet 2')
    })

    expect(decision).toMatchObject({
      accepted: true,
      decision: 'synced',
      targetSheetId: 'sheet-2'
    })
    expect(setActiveSheetIdWithPeerCache).toHaveBeenCalledWith('sheet-2')
  })

  it('drops mutation persistence for a zero-version producer when active sheet is healthy', () => {
    const { result } = renderHook(() =>
      useSpreadsheetWorksheetContextBridge({
        sheets: [createSheet('sheet-1', 'Sheet 1'), createSheet('sheet-2', 'Sheet 2')],
        activeSheetIdRef: { current: 'sheet-1' },
        createdSheetIdAliasesRef: { current: new Map() },
        programmaticWorksheetActivationGuardRef: { current: null },
        pendingCreatedSheetSelectionRef: { current: null },
        peerSheetDataCacheRef: { current: new Map() },
        getActiveSessionRows: () => [],
        setActiveSheetIdWithPeerCache: jest.fn(),
        resolveKnownSheetVersion: (sheetId: string) => (sheetId === 'sheet-1' ? 11 : 0),
        debugLog: jest.fn()
      })
    )

    const decision = result.current.resolveMutationPersistTarget('sheet-2')

    expect(decision).toMatchObject({
      submit: false,
      decision: 'unsafe_unpersisted_sheet',
      targetSheetId: null,
      targetSheetVersion: 0,
      activeSheetVersion: 11
    })
  })
})
