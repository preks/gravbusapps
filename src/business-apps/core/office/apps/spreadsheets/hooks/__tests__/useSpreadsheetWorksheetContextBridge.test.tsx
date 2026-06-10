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
        debugLog: jest.fn()
      })
    )

    act(() => {
      result.current.handleUniverActiveWorksheetChange('sheet-1', 'Sheet 1')
    })

    expect(setActiveSheetIdWithPeerCache).not.toHaveBeenCalled()
    expect(programmaticWorksheetActivationGuardRef.current).not.toBeNull()

    act(() => {
      result.current.handleUniverActiveWorksheetChange('sheet-2', 'Sheet 2')
    })

    expect(setActiveSheetIdWithPeerCache).not.toHaveBeenCalled()
    expect(programmaticWorksheetActivationGuardRef.current).toBeNull()
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
        debugLog: jest.fn()
      })
    )

    act(() => {
      result.current.handleUniverActiveWorksheetChange('sheet-1', 'Sheet 1')
    })

    expect(programmaticWorksheetActivationGuardRef.current).toBeNull()
    expect(setActiveSheetIdWithPeerCache).toHaveBeenCalledWith('sheet-1')
  })
})
