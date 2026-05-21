import { SpreadsheetApiService } from '../../services/SpreadsheetApiService'
import { saveSpreadsheetSnapshotWithRetry } from '../spreadsheetSnapshotSaveWithRetry'
import { createTestSpreadsheetSheet } from '../test-fixtures/spreadsheetCoreTestFixtures'
import { persistSpreadsheetSnapshotCheckpointForSheet } from '../spreadsheetSnapshotCheckpointPersistence'

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

const baseSheet = createTestSpreadsheetSheet()

const createContext = (overrides: Record<string, unknown> = {}) => {
  const snapshotDebugState = { lastSuccessAt: null, lastFailAt: null, successCount: 0, failCount: 0 }
  const ctx = {
    appId: 'app-1',
    sheets: [baseSheet],
    entityEnabled: false,
    socketPersistChainRef: { current: Promise.resolve() },
    workbookSnapshotVersionRef: { current: 1 },
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
  })

  it('returns early when entity-backed mode is enabled', async () => {
    const { ctx } = createContext({ entityEnabled: true })

    await persistSpreadsheetSnapshotCheckpointForSheet('sheet-1', ctx as never)

    expect(mockSaveSpreadsheetSnapshotWithRetry).not.toHaveBeenCalled()
    expect(ctx.snapshotSaveMetricsRef.current.attempts).toBe(0)
  })

  it('records a failure when no workbook snapshot is available', async () => {
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({ version: 2 } as never)
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

  it('persists a quiet active-sheet checkpoint and marks it saved', async () => {
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({ version: 2 } as never)
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

  it('updates peer caches when a non-active sheet checkpoint succeeds', async () => {
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({ version: 2 } as never)
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
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({ version: 2 } as never)
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
