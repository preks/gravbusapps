import { renderHook } from '@testing-library/react'

import type { SpreadsheetMutationFacade } from '../../core'
import { useSpreadsheetRemoteDeltaCatchUp } from '../useSpreadsheetRemoteDeltaCatchUp'

describe('useSpreadsheetRemoteDeltaCatchUp', () => {
  const baseParams = () => ({
    entityEnabled: false,
    spreadsheetSession: {} as never,
    enqueueDiagnosticsTraceEvent: jest.fn(),
    activeTraceSessionRef: { current: null },
    rememberKnownSheetVersion: jest.fn(),
    resolveKnownSheetVersion: jest.fn(() => 0),
    syncSheetRowsIntoLocalState: jest.fn(),
    getKnownRowsForSheet: jest.fn(() => []),
    hasPendingCellPersistence: jest.fn(() => false),
    activeSheetIdRef: { current: 's1' },
    appSheetsRef: { current: [] },
    collaborationManagerRef: { current: null },
    mutationFacadeRef: {
      current: {
        fetchSheetChangesSince: jest.fn()
      } as unknown as SpreadsheetMutationFacade
    },
    pendingCreatedSheetSelectionRef: { current: null },
    reloadSheetFromCanonicalSnapshot: jest.fn(async () => true),
    scheduleSheetVersionRefreshFromApi: jest.fn()
  })

  it('returns false immediately when entity data mode is enabled', async () => {
    const { result } = renderHook(() =>
      useSpreadsheetRemoteDeltaCatchUp({
        ...baseParams(),
        entityEnabled: true
      })
    )

    await expect(result.current.requestSheetDeltaCatchUp('s1', 'focus')).resolves.toBe(false)
  })

  it('returns false while a provisional created sheet has not persisted yet', async () => {
    const { result } = renderHook(() =>
      useSpreadsheetRemoteDeltaCatchUp({
        ...baseParams(),
        pendingCreatedSheetSelectionRef: {
          current: { temporarySheetId: 'tmp', persistedSheetId: null }
        }
      })
    )

    await expect(result.current.requestSheetDeltaCatchUp('tmp', 'sheet_activation')).resolves.toBe(false)
  })
})
