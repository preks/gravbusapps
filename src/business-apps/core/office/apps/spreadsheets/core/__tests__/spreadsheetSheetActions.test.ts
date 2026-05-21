import type { SpreadsheetApp } from '../../types'
import type { SpreadsheetMutationFacade } from '../SpreadsheetMutationFacade'
import type { SpreadsheetSession } from '../SpreadsheetSession'
import {
  applyOptimisticSpreadsheetSheetRenameToLocalApp,
  persistSpreadsheetCreatedSheet,
  persistSpreadsheetSheetDelete,
  persistSpreadsheetSheetRename,
  type PersistSpreadsheetCreatedSheetContext,
  queuePersistSpreadsheetSheetRenameAfterCellFlush
} from '../spreadsheetSheetActions'
import { createTestSpreadsheetApp, createTestSpreadsheetSheet } from '../test-fixtures/spreadsheetCoreTestFixtures'

const baseSheet = createTestSpreadsheetSheet()

function createPersistCreatedSheetTestContext(): PersistSpreadsheetCreatedSheetContext {
  const duplicateSheet = jest.fn()
  const createSheet = jest.fn()
  const baseApp = createTestSpreadsheetApp({
    sheets: [createTestSpreadsheetSheet({ id: 'sheet-1' }), createTestSpreadsheetSheet({ id: 'temp-sheet', data: [] })]
  })
  return {
    mutationFacade: {
      createSheet,
      duplicateSheet
    } as unknown as SpreadsheetMutationFacade,
    spreadsheetSession: {
      replaceSheetState: jest.fn(),
      capturePersistedBaseline: jest.fn(),
      subscribe: jest.fn(() => jest.fn())
    } as unknown as SpreadsheetSession,
    activeSheetIdRef: { current: 'sheet-1' },
    peerSheetDataCacheRef: { current: new Map<string, Record<string, unknown>[]>() },
    authoritativePeerSheetDataCacheRef: { current: new Set<string>() },
    createdSheetIdAliasesRef: { current: new Map<string, string>() },
    pendingCreatedSheetSelectionRef: {
      current: null as { temporarySheetId: string; persistedSheetId: string | null } | null
    },
    pendingCreatedSheetReconciliationRef: {
      current: null as { temporarySheetId: string; persistedSheetId: string } | null
    },
    pendingUniverRowsBySheetRef: { current: new Map() },
    pendingSnapshotClearCellsRef: { current: new Map() },
    pendingSnapshotCheckpointBySheetRef: { current: new Map() },
    knownSheetVersionsRef: { current: new Map() },
    pendingCellChangesRef: { current: [] as Array<{ sheetId?: string }> },
    pendingCellBatchesRef: { current: [] as Array<{ targetSheetId: string }> },
    latestUniverDataRef: {
      current: { sheetId: 'temp-sheet', data: [] } as { sheetId: string; data: Record<string, unknown>[] } | null
    },
    applyLocalAppUpdate: jest.fn((updater: (app: SpreadsheetApp) => SpreadsheetApp) => updater(baseApp)),
    seedActiveSheetState: jest.fn(),
    setActiveSheetId: jest.fn(),
    rememberKnownSheetVersion: jest.fn(),
    ensureRemoteSheetInLiveWorkbook: jest.fn(),
    onPersistedSheetReady: jest.fn()
  }
}

describe('spreadsheetSheetActions', () => {
  it('persists a duplicated sheet, seeds active state, and reconciles temporary ids', async () => {
    const ctx = createPersistCreatedSheetTestContext()
    const duplicateSheet = ctx.mutationFacade.duplicateSheet as jest.MockedFunction<
      SpreadsheetMutationFacade['duplicateSheet']
    >
    duplicateSheet.mockResolvedValue(
      createTestSpreadsheetSheet({
        id: 'persisted-sheet',
        name: 'Copy',
        columns: baseSheet.columns,
        data: [{ _id: 'row-2', Name: 'Bob' }],
        version: 5
      })
    )
    ctx.pendingCellChangesRef.current.push({ sheetId: 'temp-sheet' })
    ctx.pendingCellBatchesRef.current.push({ targetSheetId: 'temp-sheet' })

    const created = await persistSpreadsheetCreatedSheet(
      {
        kind: 'duplicate',
        requestedSheetId: 'temp-sheet',
        requestedSheetName: 'Copy',
        templateColumns: baseSheet.columns,
        sourceSheetId: 'sheet-1',
        visualWorksheetSnapshot: { sheet: true },
        liveWorkbookInsertIndex: 2,
        activatePersistedSheet: true,
        shouldSeedAsActive: () => true
      },
      ctx
    )

    expect(created.id).toBe('persisted-sheet')
    expect(ctx.onPersistedSheetReady).toHaveBeenCalled()
    expect(ctx.mutationFacade.duplicateSheet).toHaveBeenCalledWith({
      sourceSheetId: 'sheet-1',
      targetSheetId: 'temp-sheet',
      name: 'Copy',
      visualWorksheetSnapshot: { sheet: true }
    })
    expect(ctx.seedActiveSheetState).toHaveBeenCalled()
    expect(ctx.setActiveSheetId).toHaveBeenCalledWith('persisted-sheet')
    expect(ctx.createdSheetIdAliasesRef.current.get('temp-sheet')).toBe('persisted-sheet')
    expect(ctx.pendingCreatedSheetReconciliationRef.current).toEqual({
      temporarySheetId: 'temp-sheet',
      persistedSheetId: 'persisted-sheet'
    })
    expect(ctx.pendingCellChangesRef.current[0]?.sheetId).toBe('persisted-sheet')
    expect(ctx.pendingCellBatchesRef.current[0]?.targetSheetId).toBe('persisted-sheet')
    expect(ctx.ensureRemoteSheetInLiveWorkbook).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'persisted-sheet' }),
      2
    )
  })

  it('captures persisted baseline when created sheet is not seeded as active', async () => {
    const ctx = createPersistCreatedSheetTestContext()
    const createSheet = ctx.mutationFacade.createSheet as jest.MockedFunction<SpreadsheetMutationFacade['createSheet']>
    createSheet.mockResolvedValue(
      createTestSpreadsheetSheet({
        id: 'new-sheet',
        name: 'New',
        columns: baseSheet.columns,
        data: [{ _id: 'r1', Name: 'X' }],
        version: 2
      })
    )
    const replaceSheetState = jest.fn()
    const capturePersistedBaseline = jest.fn()
    ctx.spreadsheetSession = {
      replaceSheetState,
      capturePersistedBaseline,
      subscribe: jest.fn(() => jest.fn())
    } as unknown as typeof ctx.spreadsheetSession

    await persistSpreadsheetCreatedSheet(
      {
        kind: 'create',
        requestedSheetId: 'new-sheet',
        requestedSheetName: 'New',
        templateColumns: baseSheet.columns,
        shouldSeedAsActive: () => false
      },
      ctx
    )

    expect(replaceSheetState).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'new-sheet' }),
      [{ _id: 'r1', Name: 'X' }],
      2
    )
    expect(capturePersistedBaseline).toHaveBeenCalledWith('new-sheet')
    expect(ctx.seedActiveSheetState).not.toHaveBeenCalled()
  })

  it('does not materialize remote sheet when skipLiveWorkbookMaterialization is set', async () => {
    const ctx = createPersistCreatedSheetTestContext()
    const createSheet = ctx.mutationFacade.createSheet as jest.MockedFunction<SpreadsheetMutationFacade['createSheet']>
    createSheet.mockResolvedValue(
      createTestSpreadsheetSheet({
        id: 'new-sheet',
        name: 'New',
        columns: baseSheet.columns,
        data: [],
        version: 1
      })
    )

    await persistSpreadsheetCreatedSheet(
      {
        kind: 'create',
        requestedSheetId: 'new-sheet',
        requestedSheetName: 'New',
        templateColumns: baseSheet.columns,
        skipLiveWorkbookMaterialization: true,
        shouldSeedAsActive: () => true
      },
      ctx
    )

    expect(ctx.ensureRemoteSheetInLiveWorkbook).not.toHaveBeenCalled()
  })

  it('remaps placeholder sheet id and syncs React active tab when backend returns a different sheet id (Univer insert path)', async () => {
    const ctx = createPersistCreatedSheetTestContext()
    const createSheet = ctx.mutationFacade.createSheet as jest.MockedFunction<SpreadsheetMutationFacade['createSheet']>
    createSheet.mockResolvedValue(
      createTestSpreadsheetSheet({
        id: 'persisted-sheet',
        name: 'New',
        columns: baseSheet.columns,
        data: [],
        version: 1
      })
    )

    await persistSpreadsheetCreatedSheet(
      {
        kind: 'create',
        requestedSheetId: 'temp-sheet',
        requestedSheetName: 'New',
        templateColumns: baseSheet.columns,
        skipLiveWorkbookMaterialization: true,
        shouldSeedAsActive: () => true
      },
      ctx
    )

    expect(ctx.setActiveSheetId).toHaveBeenCalledWith('persisted-sheet')
    const updater = (ctx.applyLocalAppUpdate as jest.Mock).mock.calls[0]?.[0] as (app: SpreadsheetApp) => SpreadsheetApp
    const baseApp = createTestSpreadsheetApp({
      sheets: [
        createTestSpreadsheetSheet({ id: 'sheet-1' }),
        createTestSpreadsheetSheet({ id: 'temp-sheet', data: [] })
      ]
    })
    const nextApp = updater(baseApp)
    expect(nextApp.sheets.some(s => s.id === 'temp-sheet')).toBe(false)
    expect(nextApp.sheets.find(s => s.id === 'persisted-sheet')).toEqual(
      expect.objectContaining({ id: 'persisted-sheet', name: 'New', data: [] })
    )
  })

  it('inserts the created sheet into local app state when API-first sheet creation has no placeholder', async () => {
    const ctx = createPersistCreatedSheetTestContext()
    const createSheet = ctx.mutationFacade.createSheet as jest.MockedFunction<SpreadsheetMutationFacade['createSheet']>
    createSheet.mockResolvedValue(
      createTestSpreadsheetSheet({
        id: 'new-sheet',
        name: 'New',
        columns: baseSheet.columns,
        data: [],
        version: 1
      })
    )

    await persistSpreadsheetCreatedSheet(
      {
        kind: 'create',
        requestedSheetId: 'new-sheet',
        requestedSheetName: 'New',
        templateColumns: baseSheet.columns,
        liveWorkbookInsertIndex: 1,
        activatePersistedSheet: true,
        shouldSeedAsActive: () => true
      },
      ctx
    )

    expect(ctx.setActiveSheetId).toHaveBeenCalledWith('new-sheet')
    const updater = (ctx.applyLocalAppUpdate as jest.Mock).mock.calls[0]?.[0] as (app: SpreadsheetApp) => SpreadsheetApp
    const baseApp = createTestSpreadsheetApp({
      sheets: [createTestSpreadsheetSheet({ id: 'sheet-1' }), createTestSpreadsheetSheet({ id: 'sheet-2' })]
    })
    const nextApp = updater(baseApp)
    expect(nextApp.sheets.map(sheet => sheet.id)).toEqual(['sheet-1', 'new-sheet', 'sheet-2'])
    expect(nextApp.sheets[1]).toEqual(expect.objectContaining({ id: 'new-sheet', name: 'New', data: [] }))
  })

  it('applyOptimisticSpreadsheetSheetRenameToLocalApp updates caches and app sheets', () => {
    const getRowsToPreserve = jest.fn(() => [{ _id: 'row-1', Name: 'Alice' }])
    const peerSheetDataCacheRef = { current: new Map<string, Record<string, unknown>[]>() }
    const authoritativePeerSheetDataCacheRef = { current: new Set<string>() }
    const sheetBefore = createTestSpreadsheetSheet({ id: 'sheet-1', name: 'Old', data: [] })
    const applyLocalAppUpdate = jest.fn((updater: (app: SpreadsheetApp) => SpreadsheetApp) =>
      updater(
        createTestSpreadsheetApp({
          sheets: [sheetBefore]
        })
      )
    )

    applyOptimisticSpreadsheetSheetRenameToLocalApp('sheet-1', 'New Tab', getRowsToPreserve, {
      peerSheetDataCacheRef,
      authoritativePeerSheetDataCacheRef,
      applyLocalAppUpdate
    })

    expect(getRowsToPreserve).toHaveBeenCalledWith('sheet-1')
    expect(peerSheetDataCacheRef.current.get('sheet-1')).toEqual([{ _id: 'row-1', Name: 'Alice' }])
    expect(authoritativePeerSheetDataCacheRef.current.has('sheet-1')).toBe(true)
    expect(applyLocalAppUpdate).toHaveBeenCalledTimes(1)
  })

  it('persists sheet rename, refreshes cached rows, and queues a snapshot checkpoint', async () => {
    const mutationFacade = {
      renameSheet: jest.fn().mockResolvedValue({
        id: 'sheet-1',
        name: 'Renamed',
        columns: baseSheet.columns,
        data: [],
        version: 8
      })
    } as unknown as SpreadsheetMutationFacade
    const peerSheetDataCacheRef = { current: new Map<string, Record<string, unknown>[]>() }
    const authoritativePeerSheetDataCacheRef = { current: new Set<string>() }
    const applyLocalAppUpdate = jest.fn()
    const queueSnapshotCheckpoint = jest.fn()

    const result = await persistSpreadsheetSheetRename({
      sheetId: 'sheet-1',
      sheetName: ' Renamed ',
      currentSheetVersion: 3,
      mutationFacade,
      getRowsToPreserve: jest.fn(() => [{ _id: 'row-1', Name: 'Alice Updated' }]),
      peerSheetDataCacheRef,
      authoritativePeerSheetDataCacheRef,
      applyLocalAppUpdate,
      rememberKnownSheetVersion: jest.fn(),
      rememberSheetVersion: jest.fn(),
      renameRemoteSheetInLiveWorkbook: jest.fn(),
      queueSnapshotCheckpoint
    })

    expect(result.updatedVersion).toBe(8)
    expect(result.latestRowsToPreserve).toEqual([{ _id: 'row-1', Name: 'Alice Updated' }])
    expect(peerSheetDataCacheRef.current.get('sheet-1')).toEqual([{ _id: 'row-1', Name: 'Alice Updated' }])
    expect(authoritativePeerSheetDataCacheRef.current.has('sheet-1')).toBe(true)
    expect(queueSnapshotCheckpoint).toHaveBeenCalledWith('sheet-1')
    expect(applyLocalAppUpdate).toHaveBeenCalledTimes(1)
  })

  it('persists sheet delete and switches to the next active sheet when needed', async () => {
    const setActiveSheetId = jest.fn()
    const removeRemoteSheetFromLiveWorkbook = jest.fn()

    const deleted = await persistSpreadsheetSheetDelete({
      sheetId: 'sheet-1',
      activeSheetId: 'sheet-1',
      nextActiveSheetId: 'sheet-2',
      mutationFacade: {
        deleteSheet: jest.fn().mockResolvedValue(undefined)
      } as unknown as SpreadsheetMutationFacade,
      removeRemoteSheetFromLiveWorkbook,
      setActiveSheetId
    })

    expect(deleted).toBe(true)
    expect(removeRemoteSheetFromLiveWorkbook).toHaveBeenCalledWith('sheet-1')
    expect(setActiveSheetId).toHaveBeenCalledWith('sheet-2')
  })

  it('runs process, flush, then rename when queuing rename after cell flush', async () => {
    const order: string[] = []
    const chainOnOperationQueue = jest.fn(async (_ref: { current: Promise<void> }, fn: () => Promise<void>) => {
      await fn()
    })
    const operationQueueRef = { current: Promise.resolve() }
    const mutationFacade = {
      renameSheet: jest.fn().mockImplementation(async () => {
        order.push('rename')
        return {
          id: 'sheet-1',
          name: 'N',
          columns: baseSheet.columns,
          data: [],
          version: 2
        }
      })
    } as unknown as SpreadsheetMutationFacade

    await queuePersistSpreadsheetSheetRenameAfterCellFlush({
      operationQueueRef,
      chainOnOperationQueue,
      processUniverDataChange: async () => {
        order.push('process')
      },
      flushPendingCellChanges: async () => {
        order.push('flush')
      },
      rename: {
        sheetId: 'sheet-1',
        sheetName: 'N',
        mutationFacade,
        getRowsToPreserve: () => [],
        peerSheetDataCacheRef: { current: new Map() },
        authoritativePeerSheetDataCacheRef: { current: new Set() },
        applyLocalAppUpdate: jest.fn()
      },
      onSuccess: () => order.push('success')
    })
    expect(order).toEqual(['process', 'flush', 'rename', 'success'])
    expect(chainOnOperationQueue).toHaveBeenCalledTimes(1)
  })
})
