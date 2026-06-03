/**
 * Regression tests for the rAF coalescers in
 * `buildSpreadsheetCollaborationCallbacks`:
 *
 *  - Remote cell paints (`applyRemoteCellUpdate` /
 *    `applyRemoteCellUpdatesBulk`) collapse into one grid bulk apply per
 *    animation frame per sheet (Fix 4).
 *  - Remote version updates (`onVersionUpdate` / `onSheetVersionUpdate`)
 *    collapse into one `enqueueRemoteApply('versionOnlyEcho')` per frame per
 *    sheet, keeping the latest version (Fix 2).
 */
import { buildSpreadsheetCollaborationCallbacks } from '../buildSpreadsheetCollaborationCallbacks'
import type { SheetWorkQueueApi } from '../spreadsheetSheetWorkQueue'

const ACTIVE_SHEET_ID = 'sheet-A'

type RafCallback = (ts: number) => void

interface TestHarness {
  callbacks: ReturnType<typeof buildSpreadsheetCollaborationCallbacks>
  flushRaf: () => void
  bulkApplyCalls: Array<{ items: unknown[]; meta: unknown }>
  versionEchoCalls: Array<{ sheetId: string; version: number }>
  applyRemoteCellUpdateWithRetry: jest.Mock
}

let originalRaf: typeof globalThis.requestAnimationFrame
let originalCancel: typeof globalThis.cancelAnimationFrame
let rafQueue: RafCallback[] = []

beforeEach(() => {
  originalRaf = globalThis.requestAnimationFrame
  originalCancel = globalThis.cancelAnimationFrame
  rafQueue = []
  ;(globalThis as { requestAnimationFrame: (cb: RafCallback) => number }).requestAnimationFrame = cb => {
    rafQueue.push(cb)
    return rafQueue.length
  }
  ;(globalThis as { cancelAnimationFrame: (handle: number) => void }).cancelAnimationFrame = handle => {
    const idx = handle - 1
    if (idx >= 0 && idx < rafQueue.length) {
      rafQueue[idx] = () => undefined
    }
  }
})

afterEach(() => {
  globalThis.requestAnimationFrame = originalRaf
  globalThis.cancelAnimationFrame = originalCancel
})

const buildHarness = (options?: { isQueueOwnedCell?: SheetWorkQueueApi['isQueueOwnedCell'] }): TestHarness => {
  const bulkApplyCalls: Array<{ items: unknown[]; meta: unknown }> = []
  const versionEchoCalls: Array<{ sheetId: string; version: number }> = []
  const applyRemoteCellUpdateWithRetry = jest.fn()

  const spreadsheetGridRef = {
    current: {
      applyRemoteCellUpdatesBulk: (items: unknown[], meta: unknown) => {
        bulkApplyCalls.push({ items, meta })
      }
    } as unknown as ReturnType<typeof buildSpreadsheetCollaborationCallbacks> extends never
      ? never
      : Record<string, unknown>
  }

  const sheetWorkQueue: Partial<SheetWorkQueueApi> = {
    enqueueRemoteApply: jest.fn(
      async (sheetId: string, _kind: string, executor: (controller: any) => Promise<void>) => {
        await executor({
          markVersionDone: (version?: number) => {
            if (typeof version === 'number') {
              versionEchoCalls.push({ sheetId, version })
            }
          },
          markPaintDone: () => undefined,
          markBulkDepthDone: () => undefined,
          markNoGridFallbackDone: () => undefined,
          fail: () => undefined,
          jobId: 'job',
          sheetId,
          kind: 'versionOnlyEcho'
        })
        return 'job-id'
      }
    ) as unknown as SheetWorkQueueApi['enqueueRemoteApply'],
    isQueueOwnedCell: options?.isQueueOwnedCell ?? (() => false)
  }

  const activeSheet = {
    id: ACTIVE_SHEET_ID,
    columns: [{ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 }],
    data: []
  } as any
  const spreadsheetSession = {
    getState: () => ({ activeSheetId: ACTIVE_SHEET_ID }),
    getActiveSheetState: () => ({ columns: activeSheet.columns, version: 0 }),
    getSheetState: () => ({ columns: activeSheet.columns, version: 0, rows: [] }),
    applyMutation: () => undefined
  } as any

  const callbacks = buildSpreadsheetCollaborationCallbacks({
    spreadsheetSession,
    activeSheet,
    appSheetsRef: { current: [activeSheet] } as any,
    peerSheetDataCacheRef: { current: new Map() } as any,
    authoritativePeerSheetDataCacheRef: { current: new Set() } as any,
    getBackendRowIdForUiRowIdRef: { current: () => undefined } as any,
    activeSheetId: ACTIVE_SHEET_ID,
    commitLocalSheetData: () => undefined,
    syncSheetRowsIntoLocalState: () => undefined,
    applyRemoteCellUpdateWithRetry: applyRemoteCellUpdateWithRetry as any,
    activeSheetIdRef: { current: ACTIVE_SHEET_ID } as any,
    spreadsheetGridRef: spreadsheetGridRef as any,
    recentLocalRowHeightRef: { current: new Map() } as any,
    recentLocalColWidthRef: { current: new Map() } as any,
    baselineRowHeightsRef: { current: new Map() } as any,
    baselineColWidthsRef: { current: new Map() } as any,
    updateActiveSheetVersion: () => undefined,
    rememberSheetVersion: () => undefined,
    applyLocalAppUpdate: () => undefined,
    structuralWsDedupRef: { current: null } as any,
    ensureRemoteSheetInLiveWorkbook: () => undefined,
    renameRemoteSheetInLiveWorkbook: () => undefined,
    removeRemoteSheetFromLiveWorkbook: () => undefined,
    setRemoteSheetVisibilityInLiveWorkbook: () => undefined,
    mapPersistedRowsToViewerRows: () => [],
    appId: 'app-1',
    markSheetNeedsGridMaterialization: () => undefined,
    requestSheetDeltaCatchUp: () => undefined,
    scheduleSheetVersionRefreshFromApi: () => undefined,
    scheduleRemoteStructuralResync: () => undefined,
    handleRemoteColumnUpdate: () => undefined,
    mutationFacadeRef: { current: null } as any,
    fetchSheetReplaySince: async () => ({ currentVersion: 0, changes: [], requiresSnapshot: false }),
    isSpreadsheetAppsDebugEnabled: () => false,
    enqueueDiagnosticsTraceEvent: () => undefined,
    sheetT: (k: string) => k,
    debugLog: () => undefined,
    setActiveSheetId: () => undefined,
    getActiveSessionRows: () => [],
    resolveKnownSheetVersion: () => 0,
    getSheetWorkQueue: () => sheetWorkQueue as SheetWorkQueueApi
  })

  const flushRaf = (): void => {
    const drained = rafQueue.splice(0, rafQueue.length)
    for (const cb of drained) cb(performance.now?.() ?? Date.now())
  }

  return { callbacks, flushRaf, bulkApplyCalls, versionEchoCalls, applyRemoteCellUpdateWithRetry }
}

describe('buildSpreadsheetCollaborationCallbacks rAF coalescing', () => {
  it('collapses 20 single-cell remote updates into one grid bulk apply per frame', () => {
    const h = buildHarness()
    for (let i = 0; i < 20; i += 1) {
      h.callbacks.applyRemoteCellUpdate(i, 0, `v${i}`, `row-${i}`)
    }
    expect(h.bulkApplyCalls).toHaveLength(0)
    h.flushRaf()
    expect(h.bulkApplyCalls).toHaveLength(1)
    expect((h.bulkApplyCalls[0].items as unknown[]).length).toBe(20)
    expect(h.applyRemoteCellUpdateWithRetry).not.toHaveBeenCalled()
  })

  it('dedupes repeated writes to the same cell within a frame, keeping latest', () => {
    const h = buildHarness()
    h.callbacks.applyRemoteCellUpdate(0, 0, 'first', 'row-1')
    h.callbacks.applyRemoteCellUpdate(0, 0, 'second', 'row-1')
    h.callbacks.applyRemoteCellUpdate(0, 0, 'third', 'row-1')
    h.flushRaf()
    expect(h.bulkApplyCalls).toHaveLength(1)
    const items = h.bulkApplyCalls[0].items as Array<{ value?: unknown }>
    expect(items).toHaveLength(1)
    expect(items[0].value).toBe('third')
  })

  it('flushes pending cell paints before a structural callback runs', () => {
    const h = buildHarness()
    h.callbacks.applyRemoteCellUpdate(0, 0, 'pending', 'row-1')
    expect(h.bulkApplyCalls).toHaveLength(0)
    h.callbacks.applyRemoteClearAllRange?.({ sheetId: ACTIVE_SHEET_ID, ranges: [] })
    expect(h.bulkApplyCalls).toHaveLength(1)
    expect((h.bulkApplyCalls[0].items as unknown[]).length).toBe(1)
  })

  it('flushes authoritative reapply bulks immediately instead of waiting for rAF', () => {
    const h = buildHarness()
    const result = h.callbacks.applyRemoteCellUpdatesBulk?.(
      [{ rowIndex: 4, colIndex: 2, value: 'repair', rowId: 'row-4' }],
      {
        operationType: 'authoritative_reapply',
        traceId: 'trace-repair-1'
      }
    )

    expect(h.bulkApplyCalls).toHaveLength(1)
    expect((h.bulkApplyCalls[0].items as unknown[]).length).toBe(1)
    expect(result).toEqual({
      status: 'painted',
      requestedCellCount: 1,
      paintedCellCount: 1,
      skippedCellCount: 0
    })
  })

  it('returns filtered_to_zero when overlay ownership drops every bulk cell', () => {
    const h = buildHarness({ isQueueOwnedCell: () => true })
    const onApplyComplete = jest.fn()

    const result = h.callbacks.applyRemoteCellUpdatesBulk?.(
      [{ rowIndex: 4, colIndex: 0, value: 'repair', rowId: 'row-4' }],
      {
        operationType: 'add_rows_replay',
        onApplyComplete
      }
    )

    expect(result).toEqual({
      status: 'filtered_to_zero',
      requestedCellCount: 1,
      paintedCellCount: 0,
      skippedCellCount: 1
    })
    expect(onApplyComplete).toHaveBeenCalledTimes(1)
    expect(h.bulkApplyCalls).toHaveLength(0)
  })

  it('keeps acknowledged locally-owned set_range cells in the visible bulk apply', () => {
    const h = buildHarness({ isQueueOwnedCell: () => true })

    const result = h.callbacks.applyRemoteCellUpdatesBulk?.(
      [{ rowIndex: 4, colIndex: 0, value: 'ack', rowId: 'row-4' }],
      {
        operationType: 'set_range',
        acknowledgedCellKeys: ['row-4\u0000ColumnA']
      }
    )

    expect(result).toEqual({
      status: 'deferred_buffered',
      requestedCellCount: 1,
      paintedCellCount: 0,
      skippedCellCount: 0
    })
    h.flushRaf()
    expect(h.bulkApplyCalls).toHaveLength(1)
    expect(h.bulkApplyCalls[0].items).toEqual([expect.objectContaining({ rowId: 'row-4', colIndex: 0, value: 'ack' })])
  })

  it('collapses repeated version updates into one queue enqueue per frame', async () => {
    const h = buildHarness()
    for (let v = 10; v <= 30; v += 1) {
      h.callbacks.onVersionUpdate(v)
    }
    expect(h.versionEchoCalls).toHaveLength(0)
    h.flushRaf()
    await Promise.resolve()
    expect(h.versionEchoCalls).toHaveLength(1)
    expect(h.versionEchoCalls[0]).toEqual({ sheetId: ACTIVE_SHEET_ID, version: 30 })
  })
})
