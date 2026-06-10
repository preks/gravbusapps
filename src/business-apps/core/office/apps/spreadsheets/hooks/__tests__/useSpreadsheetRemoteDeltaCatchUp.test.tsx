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
    workbookSnapshotCoversVersionsRef: { current: {} },
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

  it('uses checkpoint coverage as the default catch-up baseline for the requested sheet', async () => {
    const fetchSheetChangesSince = jest.fn(async () => ({
      currentVersion: 4,
      changes: [{ operationType: 'set_style', appliedVersion: 4, payload: {} }],
      requiresSnapshot: false
    }))
    const spreadsheetSession = {
      applyDeltaChanges: jest.fn(),
      getSheetState: jest.fn(() => ({ rows: [] }))
    } as unknown as never
    const { result } = renderHook(() =>
      useSpreadsheetRemoteDeltaCatchUp({
        ...baseParams(),
        spreadsheetSession,
        workbookSnapshotCoversVersionsRef: { current: { s1: 3 } },
        mutationFacadeRef: {
          current: {
            fetchSheetChangesSince
          } as unknown as SpreadsheetMutationFacade
        }
      })
    )

    await expect(result.current.requestSheetDeltaCatchUp('s1', 'sheet_activation')).resolves.toBe(true)
    expect(fetchSheetChangesSince).toHaveBeenCalledWith('s1', 3)
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

  it('treats insert_row_slots-only catch-up like structural replay already painted the active grid', async () => {
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
        {
          operationType: 'insert_row_slots',
          appliedVersion: 5,
          payload: { startGridRowIndex: 2, count: 1, rows: [] }
        }
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
        resolveKnownSheetVersion: jest.fn(() => 4),
        mutationFacadeRef: {
          current: {
            fetchSheetChangesSince
          } as unknown as SpreadsheetMutationFacade
        }
      })
    )

    await expect(result.current.requestSheetDeltaCatchUp('s1', 'version_gap', { sinceVersion: 4 })).resolves.toBe(true)

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
          hasAddRowsStructural: true
        })
      })
    )
  })

  it('replays pure column structural catch-up even when the version is already known', async () => {
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
    const knownVersion = 109
    const fetchSheetChangesSince = jest.fn(async () => ({
      currentVersion: 109,
      changes: [
        {
          operationType: 'columns_reorder',
          appliedVersion: 109,
          baseVersion: 108,
          operationId: 'columns-reorder-op-109',
          operationLogId: 'columns-reorder-log-109',
          payload: {
            sheetId: 's1',
            columns: [
              { id: 'col-a', name: 'ColumnA', order: 0, isVisible: true },
              { id: 'col-b', name: 'ColumnB', order: 1, isVisible: true }
            ]
          },
          result: {
            columns: [
              { id: 'col-b', name: 'ColumnB', order: 0, isVisible: true },
              { id: 'col-a', name: 'ColumnA', order: 1, isVisible: true }
            ],
            visibleColumnIds: ['col-b', 'col-a'],
            gridColumnIndexByColumnId: { 'col-b': 0, 'col-a': 1 }
          }
        }
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
        appSheetsRef: {
          current: [
            {
              id: 's1',
              name: 's1',
              columns: [
                { id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 },
                { id: 'col-b', name: 'ColumnB', isVisible: true, order: 1 }
              ]
            } as never
          ]
        },
        resolveKnownSheetVersion: jest.fn(() => knownVersion),
        mutationFacadeRef: {
          current: {
            fetchSheetChangesSince
          } as unknown as SpreadsheetMutationFacade
        }
      })
    )

    await expect(result.current.requestSheetDeltaCatchUp('s1', 'version_gap', { sinceVersion: 108 })).resolves.toBe(
      true
    )

    expect(replayDeltaChanges).toHaveBeenCalledTimes(1)
    expect(
      (replayDeltaChanges.mock.calls[0]?.[0] as Array<{ operationType: string }>).map(change => change.operationType)
    ).toEqual(['columns_reorder'])
    expect(syncSheetRowsIntoLocalState).toHaveBeenCalledWith(
      's1',
      expect.any(Array),
      expect.objectContaining({ persisted: true, syncGrid: true, version: 109 })
    )
    expect(enqueueDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'client_catchup_paint_strategy',
        payload: expect.objectContaining({
          replayRan: true,
          skippedStructuralReplay: false,
          hasColumnStructuralChanges: true,
          syncGrid: true,
          skipSyncGridReason: 'full_token'
        })
      })
    )
  })

  it('still replays mixed column reorder catch-up when cell changes share an already-known version', async () => {
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
    } as unknown as never
    const enqueueDiagnosticsTraceEvent = jest.fn()
    const syncSheetRowsIntoLocalState = jest.fn()
    const fetchSheetChangesSince = jest.fn(async () => ({
      currentVersion: 109,
      changes: [
        {
          operationType: 'columns_reorder',
          appliedVersion: 109,
          baseVersion: 108,
          operationId: 'columns-reorder-op-109',
          operationLogId: 'columns-reorder-log-109',
          payload: {
            sheetId: 's1',
            columns: [
              { id: 'col-b', name: 'ColumnB', order: 0, isVisible: true },
              { id: 'col-a', name: 'ColumnA', order: 1, isVisible: true }
            ]
          }
        },
        {
          operationType: 'set_range',
          appliedVersion: 109,
          baseVersion: 108,
          payload: {
            cells: [
              {
                rowId: 'row-1',
                columnName: 'ColumnB',
                value: 'moved'
              }
            ]
          }
        }
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
        appSheetsRef: {
          current: [
            {
              id: 's1',
              name: 's1',
              columns: [
                { id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 },
                { id: 'col-b', name: 'ColumnB', isVisible: true, order: 1 }
              ]
            } as never
          ]
        },
        resolveKnownSheetVersion: jest.fn(() => 109),
        mutationFacadeRef: {
          current: {
            fetchSheetChangesSince
          } as unknown as SpreadsheetMutationFacade
        }
      })
    )

    await expect(result.current.requestSheetDeltaCatchUp('s1', 'version_gap', { sinceVersion: 108 })).resolves.toBe(
      true
    )

    expect(replayDeltaChanges).toHaveBeenCalledTimes(1)
    expect(
      (replayDeltaChanges.mock.calls[0]?.[0] as Array<{ operationType: string }>).map(change => change.operationType)
    ).toEqual(['columns_reorder'])
    expect(syncSheetRowsIntoLocalState).toHaveBeenCalledWith(
      's1',
      expect.any(Array),
      expect.objectContaining({ persisted: true, syncGrid: true, version: 109 })
    )
    expect(enqueueDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'client_catchup_paint_strategy',
        payload: expect.objectContaining({
          replayRan: true,
          skippedStructuralReplay: false,
          cellChangeCount: 1,
          structuralChangeCount: 1,
          syncGrid: true
        })
      })
    )
  })

  it('marks recovery sync to skip generic session diff when no bounded region can be computed', async () => {
    const spreadsheetSession = {
      applyDeltaChanges: jest.fn(),
      getSheetState: jest.fn(() => ({ rows: [] }))
    } as unknown as never
    const syncSheetRowsIntoLocalState = jest.fn()
    const fetchSheetChangesSince = jest.fn(async () => ({
      currentVersion: 2,
      changes: [{ operationType: 'set_style', appliedVersion: 2, payload: {} }],
      requiresSnapshot: false
    }))

    const { result } = renderHook(() =>
      useSpreadsheetRemoteDeltaCatchUp({
        ...baseParams(),
        spreadsheetSession,
        syncSheetRowsIntoLocalState,
        resolveKnownSheetVersion: jest.fn(() => 1),
        appSheetsRef: {
          current: [
            {
              id: 's1',
              name: 'Sheet 1',
              viewType: 'table',
              columns: [],
              views: [],
              data: [],
              settings: {}
            } as never
          ]
        },
        mutationFacadeRef: {
          current: {
            fetchSheetChangesSince
          } as unknown as SpreadsheetMutationFacade
        }
      })
    )

    await expect(result.current.requestSheetDeltaCatchUp('s1', 'focus')).resolves.toBe(true)

    expect(syncSheetRowsIntoLocalState).toHaveBeenCalledWith(
      's1',
      expect.any(Array),
      expect.objectContaining({
        persisted: true,
        syncGrid: true,
        sessionDiffProjectionMode: 'skip',
        version: 2
      })
    )
  })

  it('passes multi-region repaint targets into syncSheetRowsIntoLocalState', async () => {
    const syncSheetRowsIntoLocalState = jest.fn()
    const rows = [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'A', column_c: 'C' }]
    const fetchSheetChangesSince = jest.fn(async () => ({
      currentVersion: 7,
      changes: [
        {
          operationType: 'set_range',
          appliedVersion: 7,
          payload: {
            cells: [
              { rowId: 'row-1', columnName: 'column_a', value: 'left' },
              { rowId: 'row-1', columnName: 'column_c', value: 'right' }
            ]
          }
        }
      ],
      requiresSnapshot: false
    }))
    const spreadsheetSession = {
      applyDeltaChanges: jest.fn(),
      getSheetState: jest.fn(() => ({
        rows
      }))
    } as unknown as never
    const targetSheet = {
      id: 's1',
      name: 'Sheet 1',
      columns: [
        { id: 'col-a', name: 'column_a', isVisible: true },
        { id: 'col-b', name: 'column_b', isVisible: true },
        { id: 'col-c', name: 'column_c', isVisible: true }
      ]
    } as never

    const { result } = renderHook(() =>
      useSpreadsheetRemoteDeltaCatchUp({
        ...baseParams(),
        spreadsheetSession,
        syncSheetRowsIntoLocalState,
        getKnownRowsForSheet: jest.fn(() => rows),
        resolveKnownSheetVersion: jest.fn(() => 6),
        appSheetsRef: { current: [targetSheet] },
        mutationFacadeRef: {
          current: {
            fetchSheetChangesSince
          } as unknown as SpreadsheetMutationFacade
        }
      })
    )

    await expect(result.current.requestSheetDeltaCatchUp('s1', 'focus')).resolves.toBe(true)

    expect(syncSheetRowsIntoLocalState).toHaveBeenCalledWith(
      's1',
      expect.any(Array),
      expect.objectContaining({
        persisted: true,
        syncGrid: true,
        version: 7,
        authoritativeGridRegion: [
          { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 },
          { minRow: 0, maxRow: 0, minCol: 2, maxCol: 2 }
        ]
      })
    )
  })

  it('retries delta catch-up once after version refresh when gap does not require snapshot', async () => {
    const reportStaleRecoveryLifecycle = jest.fn()
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
        collaborationManagerRef: {
          current: { reportStaleRecoveryLifecycle } as unknown as SpreadsheetCollaborationManager
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
    expect(reportStaleRecoveryLifecycle).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        sheetId: 's1',
        stage: 'catchup_started'
      })
    )
    expect(reportStaleRecoveryLifecycle).toHaveBeenLastCalledWith({
      sheetId: 's1',
      stage: 'catchup_applied',
      version: 6
    })
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
    const reportStaleRecoveryLifecycle = jest.fn()
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
        collaborationManagerRef: {
          current: { reportStaleRecoveryLifecycle } as unknown as SpreadsheetCollaborationManager
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
    expect(reportStaleRecoveryLifecycle).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        sheetId: 's1',
        stage: 'catchup_started'
      })
    )
    expect(reportStaleRecoveryLifecycle).toHaveBeenNthCalledWith(2, {
      sheetId: 's1',
      stage: 'snapshot_fallback_scheduled',
      version: 3
    })
  })
})
