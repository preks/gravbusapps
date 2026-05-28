import { renderHook } from '@testing-library/react'

import type { SpreadsheetMutationFacade } from '../../core'
import type { SpreadsheetCollaborationManager } from '../../services/SpreadsheetCollaborationManager'
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

  it('replays only structural ops through the collab manager (cell-value ops painted by authoritative re-sync)', async () => {
    const replayDeltaChanges = jest.fn()
    const applyDeltaChanges = jest.fn()
    const collaborationManagerRef = {
      current: {
        replayDeltaChanges
      } as unknown as SpreadsheetCollaborationManager
    }
    const spreadsheetSession = {
      applyDeltaChanges,
      getSheetState: jest.fn(() => ({ rows: [] }))
    } as any
    const enqueueDiagnosticsTraceEvent = jest.fn()
    const syncSheetRowsIntoLocalState = jest.fn()
    const fetchSheetChangesSince = jest.fn(async () => ({
      currentVersion: 5,
      changes: [
        { operationType: 'set_cell', appliedVersion: 2, payload: { rowId: 'r1', columnName: 'a', value: '1' } },
        { operationType: 'add_rows', appliedVersion: 3, payload: { rows: [] } },
        { operationType: 'set_range', appliedVersion: 4, payload: { cells: [] } },
        { operationType: 'set_style', appliedVersion: 5, payload: {} }
      ],
      requiresSnapshot: false
    }))
    const { result } = renderHook(() =>
      useSpreadsheetRemoteDeltaCatchUp({
        ...baseParams(),
        spreadsheetSession,
        collaborationManagerRef,
        enqueueDiagnosticsTraceEvent,
        syncSheetRowsIntoLocalState,
        resolveKnownSheetVersion: jest.fn(() => 1),
        mutationFacadeRef: {
          current: {
            fetchSheetChangesSince
          } as unknown as SpreadsheetMutationFacade
        }
      })
    )

    await expect(result.current.requestSheetDeltaCatchUp('s1', 'focus')).resolves.toBe(true)

    expect(replayDeltaChanges).toHaveBeenCalledTimes(1)
    const [structuralChanges] = replayDeltaChanges.mock.calls[0]
    expect((structuralChanges as Array<{ operationType: string }>).map(c => c.operationType)).toEqual([
      'add_rows',
      'set_style'
    ])

    // Session apply still receives the full delta (it is the source of truth for row state).
    expect(applyDeltaChanges).toHaveBeenCalledTimes(1)
    const [sessionDescriptor] = applyDeltaChanges.mock.calls[0]
    expect((sessionDescriptor.changes as Array<{ operationType: string }>).map(c => c.operationType)).toEqual([
      'set_cell',
      'add_rows',
      'set_range',
      'set_style'
    ])

    // Diagnostics record the catch-up paint strategy with both cell and structural counts.
    expect(enqueueDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'client_catchup_paint_strategy',
        payload: expect.objectContaining({
          replayRan: true,
          changeCount: 4,
          cellChangeCount: 2,
          structuralChangeCount: 2,
          syncGrid: true
        })
      })
    )
    expect(syncSheetRowsIntoLocalState).toHaveBeenCalledWith(
      's1',
      expect.any(Array),
      expect.objectContaining({ persisted: true, syncGrid: true, version: 5 })
    )
  })

  it('skips authoritative grid sync for add_rows-only catch-up so Phase 1 replay paint is not duplicated', async () => {
    const replayDeltaChanges = jest.fn()
    const collaborationManagerRef = {
      current: {
        replayDeltaChanges
      } as unknown as SpreadsheetCollaborationManager
    }
    const spreadsheetSession = {
      applyDeltaChanges: jest.fn(),
      getSheetState: jest.fn(() => ({ rows: [] }))
    } as unknown as never
    const enqueueDiagnosticsTraceEvent = jest.fn()
    const syncSheetRowsIntoLocalState = jest.fn()
    const fetchSheetChangesSince = jest.fn(async () => ({
      currentVersion: 5,
      changes: [
        { operationType: 'add_rows', appliedVersion: 2, payload: { rows: [] } },
        { operationType: 'add_rows', appliedVersion: 3, payload: { rows: [] } }
      ],
      requiresSnapshot: false
    }))
    const { result } = renderHook(() =>
      useSpreadsheetRemoteDeltaCatchUp({
        ...baseParams(),
        spreadsheetSession,
        collaborationManagerRef,
        enqueueDiagnosticsTraceEvent,
        syncSheetRowsIntoLocalState,
        appSheetsRef: { current: [{ id: 's1', name: 's1', columns: [] }] as never[] },
        resolveKnownSheetVersion: jest.fn(() => 1),
        mutationFacadeRef: {
          current: {
            fetchSheetChangesSince
          } as unknown as SpreadsheetMutationFacade
        }
      })
    )

    await expect(result.current.requestSheetDeltaCatchUp('s1', 'focus')).resolves.toBe(true)

    expect(replayDeltaChanges).toHaveBeenCalledTimes(1)
    expect(syncSheetRowsIntoLocalState).toHaveBeenCalledWith(
      's1',
      expect.any(Array),
      expect.objectContaining({ persisted: true, syncGrid: false, version: 5 })
    )
    expect(enqueueDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'client_catchup_paint_strategy',
        payload: expect.objectContaining({
          syncGrid: false,
          skipSyncGridReason: 'structural_replay_painted',
          hasAddRowsStructural: true,
          cellChangeCount: 0
        })
      })
    )
  })

  it('retries delta catch-up once after version refresh when gap does not require snapshot', async () => {
    const reloadSheetFromCanonicalSnapshot = jest.fn(async () => true)
    const enqueueDiagnosticsTraceEvent = jest.fn()
    const resolveKnownSheetVersion = jest.fn().mockReturnValueOnce(1).mockReturnValueOnce(4)
    const fetchSheetChangesSince = jest
      .fn()
      .mockResolvedValueOnce({
        currentVersion: 6,
        changes: [{ operationType: 'set_cell', appliedVersion: 6, payload: {} }],
        requiresSnapshot: false
      })
      .mockResolvedValueOnce({
        currentVersion: 6,
        changes: [
          { operationType: 'set_cell', appliedVersion: 4, payload: {} },
          { operationType: 'set_cell', appliedVersion: 5, payload: {} },
          { operationType: 'set_cell', appliedVersion: 6, payload: {} }
        ],
        requiresSnapshot: false
      })
    const spreadsheetSession = {
      applyDeltaChanges: jest.fn(),
      getSheetState: jest.fn(() => ({ rows: [] }))
    } as unknown as never
    const { result } = renderHook(() =>
      useSpreadsheetRemoteDeltaCatchUp({
        ...baseParams(),
        spreadsheetSession,
        enqueueDiagnosticsTraceEvent,
        resolveKnownSheetVersion,
        syncSheetRowsIntoLocalState: jest.fn(),
        mutationFacadeRef: {
          current: {
            fetchSheetChangesSince
          } as unknown as SpreadsheetMutationFacade
        },
        reloadSheetFromCanonicalSnapshot
      })
    )

    await expect(result.current.requestSheetDeltaCatchUp('s1', 'version_gap')).resolves.toBe(true)

    expect(fetchSheetChangesSince).toHaveBeenCalledTimes(2)
    expect(fetchSheetChangesSince).toHaveBeenNthCalledWith(1, 's1', 1)
    expect(fetchSheetChangesSince).toHaveBeenNthCalledWith(2, 's1', 4)
    expect(reloadSheetFromCanonicalSnapshot).not.toHaveBeenCalled()
    expect(enqueueDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'client_delta_catchup_gap_retry',
        payload: expect.objectContaining({
          recoveryPath: 'ops_catchup',
          versionStream: 'sheet_operations'
        })
      })
    )
    expect(enqueueDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'client_delta_catchup_applied',
        payload: expect.objectContaining({
          versionStream: 'sheet_operations'
        })
      })
    )
  })

  it('skips snapshot fallback for unrecoverable gaps unless the server requires a snapshot', async () => {
    const reloadSheetFromCanonicalSnapshot = jest.fn(async () => true)
    const enqueueDiagnosticsTraceEvent = jest.fn()
    const markLocalIntentsFailedForSheet = jest.fn(() => 2)
    const fetchSheetChangesSince = jest.fn(async () => ({
      currentVersion: 6,
      changes: [{ operationType: 'set_cell', appliedVersion: 8, payload: {} }],
      requiresSnapshot: false
    }))
    const { result } = renderHook(() =>
      useSpreadsheetRemoteDeltaCatchUp({
        ...baseParams(),
        enqueueDiagnosticsTraceEvent,
        resolveKnownSheetVersion: jest.fn(() => 1),
        mutationFacadeRef: {
          current: {
            fetchSheetChangesSince
          } as unknown as SpreadsheetMutationFacade
        },
        reloadSheetFromCanonicalSnapshot,
        localWorkGuard: {
          hasUnresolvedLocalWorkForSheet: () => true,
          listLocalIntentsForSheet: () => [],
          markLocalIntentsFailedForSheet
        }
      })
    )

    await expect(result.current.requestSheetDeltaCatchUp('s1', 'version_gap')).resolves.toBe(false)

    expect(reloadSheetFromCanonicalSnapshot).not.toHaveBeenCalled()
    expect(markLocalIntentsFailedForSheet).toHaveBeenCalledWith('s1')
    expect(enqueueDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'client_delta_catchup_snapshot_skipped',
        payload: expect.objectContaining({
          recoveryPath: 'ops_gap_unrecoverable',
          failedIntentCount: 2
        })
      })
    )
  })

  it('routes replay gaps through snapshot fallback telemetry', async () => {
    const reloadSheetFromCanonicalSnapshot = jest.fn(async () => true)
    const enqueueDiagnosticsTraceEvent = jest.fn()
    const fetchSheetChangesSince = jest.fn(async () => ({
      currentVersion: 3,
      changes: [],
      requiresSnapshot: true
    }))
    const { result } = renderHook(() =>
      useSpreadsheetRemoteDeltaCatchUp({
        ...baseParams(),
        enqueueDiagnosticsTraceEvent,
        resolveKnownSheetVersion: jest.fn(() => 1),
        mutationFacadeRef: {
          current: {
            fetchSheetChangesSince
          } as unknown as SpreadsheetMutationFacade
        },
        reloadSheetFromCanonicalSnapshot
      })
    )

    await expect(result.current.requestSheetDeltaCatchUp('s1', 'version_gap')).resolves.toBe(true)

    expect(fetchSheetChangesSince).toHaveBeenCalledWith('s1', 1)
    expect(reloadSheetFromCanonicalSnapshot).toHaveBeenCalledWith('delta-catchup-requires_snapshot', 's1')
    expect(enqueueDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'client_snapshot_fallback_scheduled',
        payload: expect.objectContaining({
          source: 'delta_catchup',
          reason: 'requires_snapshot',
          catchUpReason: 'version_gap',
          recoveryPath: 'explicit_snapshot_required',
          versionStream: 'sheet_operations'
        })
      })
    )
  })
})
