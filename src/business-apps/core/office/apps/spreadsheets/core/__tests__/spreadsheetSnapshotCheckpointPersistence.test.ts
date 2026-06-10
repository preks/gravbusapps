import { SpreadsheetApiService } from '../../services/SpreadsheetApiService'
import { saveSpreadsheetSnapshotWithRetry } from '../spreadsheetSnapshotSaveWithRetry'
import { createTestSpreadsheetSheet } from '../test-fixtures/spreadsheetCoreTestFixtures'
import { persistSpreadsheetSnapshotCheckpointForSheet } from '../spreadsheetSnapshotCheckpointPersistence'
import { mergeAuthoritativeViewerRowsIntoWorkbookSnapshot } from '../../utils/univerAdapter'

jest.mock('../../utils/univerAdapter', () => ({
  mergeAuthoritativeViewerRowsIntoWorkbookSnapshot: jest.fn((snapshot: unknown) => snapshot),
  normalizeWorkbookSnapshotToAppSheets: jest.fn((snapshot: unknown) => snapshot),
  stripWorkbookSnapshotValuesPreservingFormatting: jest.fn((snapshot: unknown) => snapshot)
}))

jest.mock('../../utils/univerSnapshotCache', () => ({
  writeUniverSnapshotCache: jest.fn(() => ({ stored: false, reason: 'best-effort-cache' as string | null }))
}))

jest.mock('../../utils/spreadsheetSheetRowSort', () => ({
  sortSpreadsheetRowsBySheetSettings: jest.fn((rows: unknown[]) => rows)
}))

jest.mock('../spreadsheetSnapshotSaveWithRetry', () => ({
  saveSpreadsheetSnapshotWithRetry: jest.fn()
}))

const mockSaveSpreadsheetSnapshotWithRetry = jest.mocked(saveSpreadsheetSnapshotWithRetry)
const mockMergeAuthoritativeViewerRowsIntoWorkbookSnapshot = jest.mocked(
  mergeAuthoritativeViewerRowsIntoWorkbookSnapshot
)

const baseSheet = createTestSpreadsheetSheet()

const createContext = (overrides: Record<string, unknown> = {}) => {
  const snapshotDebugState = { lastSuccessAt: null, lastFailAt: null, successCount: 0, failCount: 0 }
  const ctx = {
    appId: 'app-1',
    sheets: [baseSheet],
    entityEnabled: false,
    socketPersistChainRef: { current: Promise.resolve() },
    workbookSnapshotVersionRef: { current: 1 },
    workbookSnapshotCoversVersionsRef: { current: { 'sheet-1': 1 } },
    snapshotSaveMetricsRef: { current: { attempts: 0, conflicts: 0, failures: 0, fallbackLoads: 0 } },
    spreadsheetGridRef: {
      current: {
        getWorkbookSnapshot: jest.fn(() => ({
          sheets: {
            'sheet-1': {
              id: 'sheet-1',
              rowCount: 2,
              columnCount: 1,
              cellData: { 0: { 0: { v: 'Alice' } } }
            }
          }
        })),
        getVisibleRangeValues: jest.fn(() => ({ 0: { 0: { v: 'Alice' } } }))
      }
    },
    activeSheetIdRef: { current: 'sheet-1' },
    peerSheetDataCacheRef: { current: new Map<string, Record<string, unknown>[]>() },
    authoritativePeerSheetDataCacheRef: { current: new Set<string>() },
    getPersistedBaselineRowsForSheet: jest.fn(() => [{ _id: 'row-1', Name: 'Alice' }]),
    pendingSnapshotClearCellsRef: { current: new Map<string, Set<string>>([['sheet-1', new Set(['0:0'])]]) },
    pendingSnapshotCheckpointBySheetRef: { current: new Map<string, { requestedAt: number }>() },
    pendingCellPersistTimeoutRef: { current: null },
    unloadKeepAlivePersistRef: { current: false },
    lastSuccessfulSnapshotCheckpointAtRef: { current: 0 },
    activeTraceSessionRef: { current: { id: 'trace-1' } },
    getActiveSessionRows: jest.fn(() => [{ _id: 'row-1', Name: 'Alice' }]),
    hasPendingCellPersistence: jest.fn(() => false),
    resolveKnownSheetVersion: jest.fn(() => 1),
    isUuid: jest.fn(() => true),
    commitLocalSheetData: jest.fn(),
    setSnapshotDebugInfo: jest.fn((updater: (s: typeof snapshotDebugState) => typeof snapshotDebugState) =>
      updater(snapshotDebugState)
    ),
    debugLog: jest.fn(),
    enqueueDiagnosticsTraceEvent: jest.fn(),
    sheetPersist: {
      recordError: jest.fn(),
      recordSuccess: jest.fn()
    },
    sheetT: jest.fn((key: string) => key),
    versioning: {
      markAsSaved: jest.fn()
    },
    ...overrides
  }
  return { ctx, snapshotDebugState }
}

describe('persistSpreadsheetSnapshotCheckpointForSheet', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
    mockMergeAuthoritativeViewerRowsIntoWorkbookSnapshot.mockImplementation((snapshot: unknown) => snapshot as never)
  })

  it('returns early when entity-backed mode is enabled', async () => {
    const { ctx } = createContext({ entityEnabled: true })

    await persistSpreadsheetSnapshotCheckpointForSheet('sheet-1', ctx as never)

    expect(mockSaveSpreadsheetSnapshotWithRetry).not.toHaveBeenCalled()
    expect(ctx.snapshotSaveMetricsRef.current.attempts).toBe(0)
  })

  it('records a failure when no workbook snapshot is available', async () => {
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      version: 2,
      coversVersions: { 'sheet-1': 2 }
    } as never)
    const { ctx } = createContext({
      spreadsheetGridRef: { current: { getWorkbookSnapshot: jest.fn(() => null) } }
    })

    await persistSpreadsheetSnapshotCheckpointForSheet('sheet-1', ctx as never)

    expect(ctx.snapshotSaveMetricsRef.current.failures).toBe(1)
    expect(ctx.debugLog).toHaveBeenCalledWith('snapshot checkpoint skipped: snapshot unavailable', {
      appId: 'app-1',
      sheetId: 'sheet-1'
    })
    expect(mockSaveSpreadsheetSnapshotWithRetry).not.toHaveBeenCalled()
  })

  it('skips checkpoint persistence while pending local mutation protection is active', async () => {
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      version: 2,
      coversVersions: { 'sheet-1': 2 }
    } as never)
    const { ctx } = createContext({
      pendingLocalMutationCellsRef: { current: new Set(['coord\u0000sheet-1\u00000\u00000']) }
    })

    await persistSpreadsheetSnapshotCheckpointForSheet('sheet-1', ctx as never)

    expect(ctx.debugLog).toHaveBeenCalledWith(
      'snapshot checkpoint deferred: sheet not safe',
      expect.objectContaining({
        appId: 'app-1',
        sheetId: 'sheet-1',
        reason: 'pending_local_mutation_protection',
        pendingProtectedCellCount: 1,
        pendingProtectedCellGlobalCount: 1,
        pendingProtectedOwnerCount: 0,
        pendingProtectedOwnerGlobalCount: 0,
        pendingProtectedKeysBySheet: { 'sheet-1': 1 }
      })
    )
    expect(ctx.pendingSnapshotCheckpointBySheetRef.current.get('sheet-1')).toEqual(
      expect.objectContaining({
        requestedAt: expect.any(Number)
      })
    )
    expect(mockSaveSpreadsheetSnapshotWithRetry).not.toHaveBeenCalled()
  })

  it('ignores protection keys from other sheets when deciding active-sheet snapshot safety', async () => {
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      version: 2,
      coversVersions: { 'sheet-1': 2 }
    } as never)
    mockSaveSpreadsheetSnapshotWithRetry.mockResolvedValue({
      savedSnapshot: { ok: true },
      cacheResult: { stored: true, reason: null }
    })
    const { ctx } = createContext({
      pendingLocalMutationCellsRef: { current: new Set(['coord\u0000sheet-2\u00000\u00000']) }
    })

    await persistSpreadsheetSnapshotCheckpointForSheet('sheet-1', ctx as never)

    expect(mockSaveSpreadsheetSnapshotWithRetry).toHaveBeenCalledTimes(1)
    expect(ctx.debugLog).not.toHaveBeenCalledWith(
      'snapshot checkpoint deferred: sheet not safe',
      expect.objectContaining({ reason: 'pending_local_mutation_protection' })
    )
  })

  it('defers checkpoint persistence while sheet queue work is still busy', async () => {
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      version: 2,
      coversVersions: { 'sheet-1': 2 }
    } as never)
    const { ctx } = createContext({
      isSheetPersistenceBusy: jest.fn(() => true)
    })

    await persistSpreadsheetSnapshotCheckpointForSheet('sheet-1', ctx as never)

    expect(ctx.debugLog).toHaveBeenCalledWith('snapshot checkpoint deferred: sheet not safe', {
      appId: 'app-1',
      sheetId: 'sheet-1',
      reason: 'sheet_persistence_busy'
    })
    expect(ctx.pendingSnapshotCheckpointBySheetRef.current.has('sheet-1')).toBe(true)
    expect(mockSaveSpreadsheetSnapshotWithRetry).not.toHaveBeenCalled()
  })

  it('persists a quiet active-sheet checkpoint and marks it saved', async () => {
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      version: 2,
      coversVersions: { 'sheet-1': 2 }
    } as never)
    mockSaveSpreadsheetSnapshotWithRetry.mockImplementation(
      async ({ workbookSnapshotVersionRef }: { workbookSnapshotVersionRef: { current: number } }) => {
        workbookSnapshotVersionRef.current = 8
        return { savedSnapshot: { ok: true }, cacheResult: { stored: true, reason: null } }
      }
    )

    const { ctx } = createContext()
    await persistSpreadsheetSnapshotCheckpointForSheet('sheet-1', ctx as never)

    expect(ctx.snapshotSaveMetricsRef.current.attempts).toBe(1)
    expect(mockSaveSpreadsheetSnapshotWithRetry).toHaveBeenCalledTimes(1)
    expect(mockSaveSpreadsheetSnapshotWithRetry).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: 'app-1',
        activeSheetId: 'sheet-1',
        maxSnapshotRetries: 3,
        useKeepaliveHttp: false
      })
    )
    expect(ctx.enqueueDiagnosticsTraceEvent).toHaveBeenCalledTimes(2)
    expect(ctx.sheetPersist.recordSuccess).toHaveBeenCalledWith(true)
    expect(ctx.versioning.markAsSaved).toHaveBeenCalledTimes(1)
    expect(ctx.pendingSnapshotClearCellsRef.current.has('sheet-1')).toBe(false)
    expect(ctx.workbookSnapshotVersionRef.current).toBe(8)
    expect(ctx.lastSuccessfulSnapshotCheckpointAtRef.current).toBeGreaterThan(0)
  })

  it('preserves richer live workbook values for the active sheet instead of downgrading to rows state', async () => {
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      version: 2,
      coversVersions: { 'sheet-1': 2 }
    } as never)
    mockMergeAuthoritativeViewerRowsIntoWorkbookSnapshot.mockImplementation(() => ({ merged: true }) as never)
    mockSaveSpreadsheetSnapshotWithRetry.mockResolvedValue({
      savedSnapshot: { ok: true },
      cacheResult: { stored: true, reason: null }
    })
    const liveSnapshot = {
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          rowCount: 2,
          columnCount: 2,
          cellData: {
            0: { 0: { v: 'Alice' }, 1: { v: 'Extra' } }
          }
        }
      }
    }
    const { ctx } = createContext({
      spreadsheetGridRef: {
        current: {
          getWorkbookSnapshot: jest.fn(() => liveSnapshot),
          getVisibleRangeValues: jest.fn(() => ({ 0: { 0: { v: 'Alice' }, 1: { v: 'Extra' } } }))
        }
      },
      getActiveSessionRows: jest.fn(() => [{ _id: 'row-1', Name: 'Alice' }]),
      getPersistedBaselineRowsForSheet: jest.fn(() => [{ _id: 'row-1', Name: 'Alice' }])
    })

    await persistSpreadsheetSnapshotCheckpointForSheet('sheet-1', ctx as never)

    expect(ctx.debugLog).toHaveBeenCalledWith(
      'snapshot checkpoint: preserving richer live workbook values for active sheet',
      expect.objectContaining({
        appId: 'app-1',
        sheetId: 'sheet-1',
        rowsForAuthoritativeSnapshotValueCount: 1,
        liveSnapshotValueCount: 2
      })
    )
    expect(mockSaveSpreadsheetSnapshotWithRetry).toHaveBeenCalledWith(
      expect.objectContaining({
        baseSnapshot: expect.objectContaining(liveSnapshot)
      })
    )
  })

  it('seeds snapshot save retry from the latest snapshot api version', async () => {
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      version: 6,
      coversVersions: { 'sheet-1': 6 }
    } as never)
    mockSaveSpreadsheetSnapshotWithRetry.mockImplementation(
      async ({ workbookSnapshotVersionRef }: { workbookSnapshotVersionRef: { current: number } }) => {
        expect(workbookSnapshotVersionRef.current).toBe(6)
        return { savedSnapshot: { ok: true }, cacheResult: { stored: true, reason: null } }
      }
    )

    const { ctx } = createContext({
      workbookSnapshotVersionRef: { current: 1 }
    })

    await persistSpreadsheetSnapshotCheckpointForSheet('sheet-1', ctx as never)

    expect(mockSaveSpreadsheetSnapshotWithRetry).toHaveBeenCalledTimes(1)
    expect(ctx.workbookSnapshotVersionRef.current).toBe(6)
  })

  it('updates peer caches when a non-active sheet checkpoint succeeds', async () => {
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      version: 2,
      coversVersions: { 'sheet-2': 2 }
    } as never)
    mockSaveSpreadsheetSnapshotWithRetry.mockResolvedValue({
      savedSnapshot: { ok: true },
      cacheResult: { stored: true, reason: null }
    })

    const { ctx } = createContext({
      sheets: [
        baseSheet,
        createTestSpreadsheetSheet({
          id: 'sheet-2',
          name: 'Sheet 2',
          columns: baseSheet.columns,
          data: [{ _id: 'row-2', Name: 'Bob' }]
        })
      ],
      activeSheetIdRef: { current: 'sheet-1' },
      peerSheetDataCacheRef: { current: new Map([['sheet-2', [{ _id: 'row-2', Name: 'Bob' }]]]) },
      pendingSnapshotClearCellsRef: { current: new Map() }
    })

    await persistSpreadsheetSnapshotCheckpointForSheet('sheet-2', ctx as never)

    expect(ctx.peerSheetDataCacheRef.current.get('sheet-2')).toEqual([{ _id: 'row-2', Name: 'Bob' }])
    expect(ctx.authoritativePeerSheetDataCacheRef.current.has('sheet-2')).toBe(true)
  })

  it('records an error event and rethrows when snapshot save fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      version: 2,
      coversVersions: { 'sheet-1': 2 }
    } as never)
    mockSaveSpreadsheetSnapshotWithRetry.mockRejectedValue(new Error('save failed'))

    const { ctx } = createContext()

    try {
      await expect(persistSpreadsheetSnapshotCheckpointForSheet('sheet-1', ctx as never)).rejects.toThrow('save failed')

      expect(ctx.sheetPersist.recordError).toHaveBeenCalledWith('persist-snapshot-failed')
      expect(ctx.enqueueDiagnosticsTraceEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'client_snapshot_checkpoint_failed',
          severity: 'error'
        })
      )
      expect(ctx.snapshotSaveMetricsRef.current.attempts).toBe(1)
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })
})
