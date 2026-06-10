import { act, renderHook, waitFor } from '@testing-library/react'

import { SpreadsheetApiService } from '../../services/SpreadsheetApiService'
import { useSpreadsheetRemoteSyncController } from '../useSpreadsheetRemoteSyncController'

const col = (id: string, name: string, order: number) => ({
  id,
  name,
  label: name,
  type: 'text',
  isVisible: true,
  isEditable: true,
  isRequired: false,
  isUnique: false,
  order
})

describe('useSpreadsheetRemoteSyncController', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('refreshes workbook checkpoint metadata alongside remote sheet version state', async () => {
    jest.useFakeTimers()

    try {
      jest.spyOn(SpreadsheetApiService, 'getSheet').mockResolvedValue({
        id: 'sheet-1',
        version: 40
      } as any)
      jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
        appId: 'app-1',
        version: 87,
        updatedAt: null,
        snapshot: null,
        coversVersions: { 'sheet-1': 40 }
      } as any)

      const workbookSnapshotVersionRef = { current: 0 }
      const workbookSnapshotCoversVersionsRef = { current: { 'sheet-2': 12 } }
      const rememberKnownSheetVersion = jest.fn()
      const updateActiveSheetVersion = jest.fn()
      const activeSheet = {
        id: 'sheet-1',
        name: 'Sheet 1',
        viewType: 'table',
        columns: [col('col-a', 'A', 0)],
        views: [],
        data: [],
        settings: {}
      } as any

      const { result } = renderHook(() =>
        useSpreadsheetRemoteSyncController({
          appId: 'app-1',
          activeSheetId: 'sheet-1',
          activeSheet,
          preferUniverNativeSheetTabs: false,
          entityEnabled: false,
          activeSheetIdRef: { current: 'sheet-1' },
          appSheetsRef: { current: [activeSheet] },
          workbookSnapshotVersionRef,
          workbookSnapshotCoversVersionsRef,
          pendingCreatedSheetSelectionRef: { current: null },
          createdSheetIdAliasesRef: { current: new Map() },
          collaborationManagerRef: { current: null },
          mutationFacadeRef: { current: null },
          sheetsNeedingGridMaterializationRef: { current: new Map() },
          snapshotSaveMetricsRef: { current: { fallbackLoads: 0 } },
          spreadsheetSession: {
            replaceSheetState: jest.fn(),
            clearDirty: jest.fn(),
            capturePersistedBaseline: jest.fn()
          } as any,
          enqueueDiagnosticsTraceEvent: jest.fn(),
          activeTraceSessionRef: { current: null },
          debugLog: jest.fn(),
          rememberKnownSheetVersion,
          updateActiveSheetVersion,
          resolveKnownSheetVersion: jest.fn(() => 0),
          syncSheetRowsIntoLocalState: jest.fn(),
          setBootstrapSnapshot: jest.fn(),
          requestGridRefresh: jest.fn(),
          getKnownRowsForSheet: jest.fn(() => []),
          hasPendingCellPersistence: jest.fn(() => false),
          hasPendingPersistenceForSheet: jest.fn(() => false),
          getActiveSessionVersion: jest.fn(() => 0),
          sheetMetadataReloadEnabled: false,
          scheduleSheetVersionRefreshFromApiRef: { current: jest.fn() },
          conflictRecovery: {
            onRecoverSuccess: jest.fn(),
            onRecoverError: jest.fn(),
            translatePersistRecoveryFailed: jest.fn(() => 'failed')
          }
        })
      )

      await act(async () => {
        result.current.scheduleSheetVersionRefreshFromApi('sheet-1')
        jest.advanceTimersByTime(250)
        await Promise.resolve()
      })

      expect(rememberKnownSheetVersion).toHaveBeenCalledWith('sheet-1', 40)
      expect(updateActiveSheetVersion).toHaveBeenCalledWith(40, 'max')
      expect(workbookSnapshotVersionRef.current).toBe(87)
      expect(workbookSnapshotCoversVersionsRef.current).toEqual({
        'sheet-1': 40,
        'sheet-2': 12
      })
    } finally {
      jest.useRealTimers()
    }
  })

  it('reloads active sheet snapshots using refreshed recovered column order', async () => {
    jest.spyOn(SpreadsheetApiService, 'getSheetHydrationSnapshot').mockResolvedValue({
      sheet: {
        id: 'sheet-1',
        name: 'Sheet 1',
        viewType: 'table',
        columns: [col('col-a', 'A', 0), col('col-c', 'C', 1), col('col-b', 'B', 2)],
        views: [],
        data: [],
        settings: {}
      },
      rows: [{ id: 'row-1', data: { A: 1, B: 2, C: 4 } }],
      operationVersion: 3,
      sheetSnapshotVersion: 1,
      worksheetSnapshot: null,
      workbookDependencies: {},
      workbookSnapshotVersion: 3
    } as any)
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      version: 3,
      snapshot: {
        id: 'workbook-1',
        name: 'Workbook',
        sheetOrder: ['sheet-1'],
        sheets: {
          'sheet-1': {
            id: 'sheet-1',
            name: 'Sheet 1',
            cellData: {
              0: {
                0: { v: 1 },
                1: { v: 2 },
                2: { v: 4 }
              }
            }
          }
        }
      },
      updatedAt: null,
      coversVersions: { 'sheet-1': 3 }
    } as any)

    const requestGridRefresh = jest.fn()
    const syncSheetRowsIntoLocalState = jest.fn()
    const rememberKnownSheetVersion = jest.fn()
    const updateActiveSheetVersion = jest.fn()
    const flushDeferredDirtyCells = jest.fn(async () => undefined)
    const flushDeferredDirtyCellsRef = { current: flushDeferredDirtyCells }

    const activeSheet = {
      id: 'sheet-1',
      name: 'Sheet 1',
      viewType: 'table',
      columns: [col('col-a', 'A', 0), col('col-b', 'B', 1), col('col-c', 'C', 2)],
      views: [],
      data: [],
      settings: {}
    } as any

    const appSheetsRef = {
      current: [activeSheet]
    }

    const { result } = renderHook(() =>
      useSpreadsheetRemoteSyncController({
        appId: 'app-1',
        activeSheetId: 'sheet-1',
        activeSheet,
        preferUniverNativeSheetTabs: false,
        entityEnabled: false,
        activeSheetIdRef: { current: 'sheet-1' },
        appSheetsRef,
        workbookSnapshotVersionRef: { current: 0 },
        workbookSnapshotCoversVersionsRef: { current: {} },
        pendingCreatedSheetSelectionRef: { current: null },
        createdSheetIdAliasesRef: { current: new Map() },
        collaborationManagerRef: { current: null },
        mutationFacadeRef: { current: null },
        sheetsNeedingGridMaterializationRef: { current: new Map() },
        snapshotSaveMetricsRef: { current: { fallbackLoads: 0 } },
        spreadsheetSession: {
          replaceSheetState: jest.fn(),
          clearDirty: jest.fn(),
          capturePersistedBaseline: jest.fn()
        } as any,
        enqueueDiagnosticsTraceEvent: jest.fn(),
        activeTraceSessionRef: { current: null },
        debugLog: jest.fn(),
        rememberKnownSheetVersion,
        updateActiveSheetVersion,
        resolveKnownSheetVersion: jest.fn(() => 0),
        syncSheetRowsIntoLocalState,
        setBootstrapSnapshot: jest.fn(),
        requestGridRefresh,
        getKnownRowsForSheet: jest.fn(() => []),
        hasPendingCellPersistence: jest.fn(() => false),
        hasPendingPersistenceForSheet: jest.fn(() => false),
        getActiveSessionVersion: jest.fn(() => 0),
        sheetMetadataReloadEnabled: false,
        scheduleSheetVersionRefreshFromApiRef: { current: jest.fn() },
        conflictRecovery: {
          onRecoverSuccess: jest.fn(),
          onRecoverError: jest.fn(),
          translatePersistRecoveryFailed: jest.fn(() => 'failed')
        },
        flushDeferredDirtyCellsRef
      })
    )

    await result.current.reloadSheetFromCanonicalSnapshot('remote-structural-resync', 'sheet-1')

    await waitFor(() => expect(requestGridRefresh).toHaveBeenCalled())
    expect(flushDeferredDirtyCells).toHaveBeenCalledTimes(1)
    const flushOrder = flushDeferredDirtyCells.mock.invocationCallOrder[0]
    const refreshOrder = requestGridRefresh.mock.invocationCallOrder[0]
    expect(flushOrder).toBeLessThan(refreshOrder)

    const refreshedSnapshot = requestGridRefresh.mock.calls[0][0] as {
      sheets: Record<string, { cellData: Record<string, Record<string, { v?: unknown }>> }>
    }

    expect(syncSheetRowsIntoLocalState).toHaveBeenCalledWith(
      'sheet-1',
      [{ _id: 'row-1', A: 1, B: 2, C: 4 }],
      expect.objectContaining({
        persisted: true,
        syncGrid: false,
        recoveredSheetMeta: expect.objectContaining({
          columns: [
            expect.objectContaining({ id: 'col-a', order: 0 }),
            expect.objectContaining({ id: 'col-c', order: 1 }),
            expect.objectContaining({ id: 'col-b', order: 2 })
          ]
        })
      })
    )
    expect(rememberKnownSheetVersion).toHaveBeenCalledWith('sheet-1', 3)
    expect(updateActiveSheetVersion).not.toHaveBeenCalled()
    expect(refreshedSnapshot.sheets['sheet-1'].cellData['0']['0'].v).toBe(1)
    expect(refreshedSnapshot.sheets['sheet-1'].cellData['0']['1'].v).toBe(4)
    expect(refreshedSnapshot.sheets['sheet-1'].cellData['0']['2'].v).toBe(2)
  })

  it('deduplicates concurrent canonical reloads for the same sheet', async () => {
    let resolveSnapshot: ((value: unknown) => void) | null = null
    const snapshotPromise = new Promise(resolve => {
      resolveSnapshot = resolve
    })
    const getSheetHydrationSnapshot = jest
      .spyOn(SpreadsheetApiService, 'getSheetHydrationSnapshot')
      .mockImplementation(() => snapshotPromise as Promise<any>)
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      version: 3,
      snapshot: null,
      updatedAt: null,
      coversVersions: {}
    } as any)

    const requestGridRefresh = jest.fn()
    const enqueueDiagnosticsTraceEvent = jest.fn()
    const activeSheet = {
      id: 'sheet-1',
      name: 'Sheet 1',
      viewType: 'table',
      columns: [col('col-a', 'A', 0)],
      views: [],
      data: [],
      settings: {}
    } as any

    const { result } = renderHook(() =>
      useSpreadsheetRemoteSyncController({
        appId: 'app-1',
        activeSheetId: 'sheet-1',
        activeSheet,
        preferUniverNativeSheetTabs: false,
        entityEnabled: false,
        activeSheetIdRef: { current: 'sheet-1' },
        appSheetsRef: { current: [activeSheet] },
        workbookSnapshotVersionRef: { current: 0 },
        workbookSnapshotCoversVersionsRef: { current: {} },
        pendingCreatedSheetSelectionRef: { current: null },
        createdSheetIdAliasesRef: { current: new Map() },
        collaborationManagerRef: { current: null },
        mutationFacadeRef: { current: null },
        sheetsNeedingGridMaterializationRef: { current: new Map() },
        snapshotSaveMetricsRef: { current: { fallbackLoads: 0 } },
        spreadsheetSession: {
          replaceSheetState: jest.fn(),
          clearDirty: jest.fn(),
          capturePersistedBaseline: jest.fn()
        } as any,
        enqueueDiagnosticsTraceEvent,
        activeTraceSessionRef: { current: null },
        debugLog: jest.fn(),
        rememberKnownSheetVersion: jest.fn(),
        updateActiveSheetVersion: jest.fn(),
        resolveKnownSheetVersion: jest.fn(() => 0),
        syncSheetRowsIntoLocalState: jest.fn(),
        setBootstrapSnapshot: jest.fn(),
        requestGridRefresh,
        getKnownRowsForSheet: jest.fn(() => []),
        hasPendingCellPersistence: jest.fn(() => false),
        hasPendingPersistenceForSheet: jest.fn(() => false),
        getActiveSessionVersion: jest.fn(() => 0),
        sheetMetadataReloadEnabled: false,
        scheduleSheetVersionRefreshFromApiRef: { current: jest.fn() },
        conflictRecovery: {
          onRecoverSuccess: jest.fn(),
          onRecoverError: jest.fn(),
          translatePersistRecoveryFailed: jest.fn(() => 'failed')
        }
      })
    )

    const firstReload = result.current.reloadSheetFromCanonicalSnapshot('remote-structural-resync', 'sheet-1')
    const secondReload = result.current.reloadSheetFromCanonicalSnapshot('delta-catchup-version-gap', 'sheet-1')

    expect(getSheetHydrationSnapshot).toHaveBeenCalledTimes(1)

    resolveSnapshot?.({
      sheet: activeSheet,
      rows: [{ id: 'row-1', data: { A: 1 } }],
      operationVersion: 3,
      sheetSnapshotVersion: 1,
      worksheetSnapshot: null,
      workbookDependencies: {},
      workbookSnapshotVersion: 3
    })

    await expect(firstReload).resolves.toBe(true)
    await expect(secondReload).resolves.toBe(true)
    expect(requestGridRefresh).toHaveBeenCalledTimes(1)
    expect(enqueueDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'client_snapshot_reload_deduplicated',
        payload: expect.objectContaining({
          targetSheetId: 'sheet-1'
        })
      })
    )
  })

  it('cancels a pending structural resync timeout once an immediate reload begins', async () => {
    jest.useFakeTimers()
    jest.spyOn(SpreadsheetApiService, 'getSheetHydrationSnapshot').mockResolvedValue({
      sheet: {
        id: 'sheet-1',
        name: 'Sheet 1',
        viewType: 'table',
        columns: [col('col-a', 'A', 0)],
        views: [],
        data: [],
        settings: {}
      },
      rows: [{ id: 'row-1', data: { A: 1 } }],
      operationVersion: 3,
      sheetSnapshotVersion: 1,
      worksheetSnapshot: null,
      workbookDependencies: {},
      workbookSnapshotVersion: 3
    } as any)
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      version: 3,
      snapshot: null,
      updatedAt: null,
      coversVersions: {}
    } as any)

    const requestGridRefresh = jest.fn()
    const activeSheet = {
      id: 'sheet-1',
      name: 'Sheet 1',
      viewType: 'table',
      columns: [col('col-a', 'A', 0)],
      views: [],
      data: [],
      settings: {}
    } as any

    const { result } = renderHook(() =>
      useSpreadsheetRemoteSyncController({
        appId: 'app-1',
        activeSheetId: 'sheet-1',
        activeSheet,
        preferUniverNativeSheetTabs: false,
        entityEnabled: false,
        activeSheetIdRef: { current: 'sheet-1' },
        appSheetsRef: { current: [activeSheet] },
        workbookSnapshotVersionRef: { current: 0 },
        workbookSnapshotCoversVersionsRef: { current: {} },
        pendingCreatedSheetSelectionRef: { current: null },
        createdSheetIdAliasesRef: { current: new Map() },
        collaborationManagerRef: { current: null },
        mutationFacadeRef: { current: null },
        sheetsNeedingGridMaterializationRef: { current: new Map() },
        snapshotSaveMetricsRef: { current: { fallbackLoads: 0 } },
        spreadsheetSession: {
          replaceSheetState: jest.fn(),
          clearDirty: jest.fn(),
          capturePersistedBaseline: jest.fn()
        } as any,
        enqueueDiagnosticsTraceEvent: jest.fn(),
        activeTraceSessionRef: { current: null },
        debugLog: jest.fn(),
        rememberKnownSheetVersion: jest.fn(),
        updateActiveSheetVersion: jest.fn(),
        resolveKnownSheetVersion: jest.fn(() => 0),
        syncSheetRowsIntoLocalState: jest.fn(),
        setBootstrapSnapshot: jest.fn(),
        requestGridRefresh,
        getKnownRowsForSheet: jest.fn(() => []),
        hasPendingCellPersistence: jest.fn(() => false),
        hasPendingPersistenceForSheet: jest.fn(() => false),
        getActiveSessionVersion: jest.fn(() => 0),
        sheetMetadataReloadEnabled: false,
        scheduleSheetVersionRefreshFromApiRef: { current: jest.fn() },
        conflictRecovery: {
          onRecoverSuccess: jest.fn(),
          onRecoverError: jest.fn(),
          translatePersistRecoveryFailed: jest.fn(() => 'failed')
        }
      })
    )

    result.current.scheduleRemoteStructuralResync('sheet-1')
    await result.current.reloadSheetFromCanonicalSnapshot('delta-catchup-version-gap', 'sheet-1')
    jest.advanceTimersByTime(500)

    expect(SpreadsheetApiService.getSheetHydrationSnapshot).toHaveBeenCalledTimes(1)
    expect(requestGridRefresh).toHaveBeenCalledTimes(1)
    jest.useRealTimers()
  })

  describe('pending local persist guard', () => {
    const buildControllerParams = (overrides: Record<string, unknown>) => {
      const activeSheet = {
        id: 'sheet-1',
        name: 'Sheet 1',
        viewType: 'table',
        columns: [col('col-a', 'A', 0)],
        views: [],
        data: [],
        settings: {}
      } as any
      return {
        appId: 'app-1',
        activeSheetId: 'sheet-1',
        activeSheet,
        preferUniverNativeSheetTabs: false,
        entityEnabled: false,
        activeSheetIdRef: { current: 'sheet-1' },
        appSheetsRef: { current: [activeSheet] },
        workbookSnapshotVersionRef: { current: 0 },
        workbookSnapshotCoversVersionsRef: { current: {} },
        pendingCreatedSheetSelectionRef: { current: null },
        createdSheetIdAliasesRef: { current: new Map() },
        collaborationManagerRef: { current: null },
        mutationFacadeRef: { current: null },
        sheetsNeedingGridMaterializationRef: { current: new Map() },
        snapshotSaveMetricsRef: { current: { fallbackLoads: 0 } },
        spreadsheetSession: {
          replaceSheetState: jest.fn(),
          clearDirty: jest.fn(),
          capturePersistedBaseline: jest.fn()
        } as any,
        enqueueDiagnosticsTraceEvent: jest.fn(),
        activeTraceSessionRef: { current: null },
        debugLog: jest.fn(),
        rememberKnownSheetVersion: jest.fn(),
        updateActiveSheetVersion: jest.fn(),
        resolveKnownSheetVersion: jest.fn(() => 0),
        syncSheetRowsIntoLocalState: jest.fn(),
        setBootstrapSnapshot: jest.fn(),
        requestGridRefresh: jest.fn(),
        getKnownRowsForSheet: jest.fn(() => []),
        hasPendingCellPersistence: jest.fn(() => false),
        hasPendingPersistenceForSheet: jest.fn(() => false),
        getActiveSessionVersion: jest.fn(() => 0),
        sheetMetadataReloadEnabled: false,
        scheduleSheetVersionRefreshFromApiRef: { current: jest.fn() },
        conflictRecovery: {
          onRecoverSuccess: jest.fn(),
          onRecoverError: jest.fn(),
          translatePersistRecoveryFailed: jest.fn(() => 'failed')
        },
        ...overrides
      }
    }

    it('skips a non-cold-start reload while the work queue still has pending persist', async () => {
      const getSheetHydrationSnapshot = jest.spyOn(SpreadsheetApiService, 'getSheetHydrationSnapshot')
      const enqueueDiagnosticsTraceEvent = jest.fn()
      const params = buildControllerParams({
        enqueueDiagnosticsTraceEvent,
        hasPendingPersistenceForSheet: jest.fn(() => true)
      })

      const { result } = renderHook(() => useSpreadsheetRemoteSyncController(params as any))

      const reloaded = await result.current.reloadSheetFromCanonicalSnapshot('delta-catchup-version-gap', 'sheet-1')

      expect(reloaded).toBe(false)
      expect(getSheetHydrationSnapshot).not.toHaveBeenCalled()
      expect(enqueueDiagnosticsTraceEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'client_snapshot_reload_skipped',
          payload: expect.objectContaining({
            reason: 'pending-local-persist',
            hasPendingQueuedPersist: true,
            targetSheetId: 'sheet-1'
          })
        })
      )
    })

    it('skips an active-sheet reload while transient local grid state still exists', async () => {
      const getSheetHydrationSnapshot = jest.spyOn(SpreadsheetApiService, 'getSheetHydrationSnapshot')
      const enqueueDiagnosticsTraceEvent = jest.fn()
      const params = buildControllerParams({
        enqueueDiagnosticsTraceEvent,
        hasTransientLocalGridStateForSheet: jest.fn(() => true)
      })

      const { result } = renderHook(() => useSpreadsheetRemoteSyncController(params as any))

      const reloaded = await result.current.reloadSheetFromCanonicalSnapshot('delta-catchup-version-gap', 'sheet-1')

      expect(reloaded).toBe(false)
      expect(getSheetHydrationSnapshot).not.toHaveBeenCalled()
      expect(enqueueDiagnosticsTraceEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'client_snapshot_reload_skipped',
          payload: expect.objectContaining({
            reason: 'transient-local-grid-state',
            hasTransientLocalGridState: true,
            targetSheetId: 'sheet-1'
          })
        })
      )
    })

    it('skips an inactive-sheet reload while transient local grid state still exists for that sheet', async () => {
      const getSheetHydrationSnapshot = jest.spyOn(SpreadsheetApiService, 'getSheetHydrationSnapshot')
      const enqueueDiagnosticsTraceEvent = jest.fn()
      const activeSheet = {
        id: 'sheet-1',
        name: 'Sheet 1',
        viewType: 'table',
        columns: [col('col-a', 'A', 0)],
        views: [],
        data: [],
        settings: {}
      } as any
      const inactiveSheet = {
        id: 'sheet-2',
        name: 'Sheet 2',
        viewType: 'table',
        columns: [col('col-b', 'B', 0)],
        views: [],
        data: [],
        settings: {}
      } as any

      const { result } = renderHook(() =>
        useSpreadsheetRemoteSyncController({
          ...buildControllerParams({
            enqueueDiagnosticsTraceEvent,
            activeSheet,
            activeSheetId: 'sheet-1',
            activeSheetIdRef: { current: 'sheet-1' },
            appSheetsRef: { current: [activeSheet, inactiveSheet] },
            hasTransientLocalGridStateForSheet: jest.fn((sheetId: string) => sheetId === 'sheet-2')
          } as any)
        })
      )

      const reloaded = await result.current.reloadSheetFromCanonicalSnapshot('delta-catchup-version-gap', 'sheet-2')

      expect(reloaded).toBe(false)
      expect(getSheetHydrationSnapshot).not.toHaveBeenCalled()
      expect(enqueueDiagnosticsTraceEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'client_snapshot_reload_skipped',
          payload: expect.objectContaining({
            reason: 'transient-local-grid-state',
            hasTransientLocalGridState: true,
            targetSheetId: 'sheet-2'
          })
        })
      )
    })

    it('still performs a cold-start reload even when pending persist is reported', async () => {
      jest.spyOn(SpreadsheetApiService, 'getSheetHydrationSnapshot').mockResolvedValue({
        sheet: {
          id: 'sheet-1',
          name: 'Sheet 1',
          viewType: 'table',
          columns: [col('col-a', 'A', 0)],
          views: [],
          data: [],
          settings: {}
        },
        rows: [{ id: 'row-1', data: { A: 1 } }],
        operationVersion: 3,
        sheetSnapshotVersion: 1,
        worksheetSnapshot: null,
        workbookDependencies: {},
        workbookSnapshotVersion: 3
      } as any)
      jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
        version: 3,
        snapshot: null,
        updatedAt: null,
        coversVersions: {}
      } as any)

      const params = buildControllerParams({
        hasPendingPersistenceForSheet: jest.fn(() => true)
      })

      const { result } = renderHook(() => useSpreadsheetRemoteSyncController(params as any))

      const reloaded = await result.current.reloadSheetFromCanonicalSnapshot('workbook-bootstrap', 'sheet-1')

      expect(reloaded).toBe(true)
      expect(SpreadsheetApiService.getSheetHydrationSnapshot).toHaveBeenCalledTimes(1)
    })
  })
})
