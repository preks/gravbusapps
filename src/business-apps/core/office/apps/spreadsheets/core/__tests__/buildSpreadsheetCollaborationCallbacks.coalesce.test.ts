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
  flushMicrotasks: () => Promise<void>
  bulkApplyCalls: Array<{ items: unknown[]; meta: unknown }>
  versionEchoCalls: Array<{ sheetId: string; version: number }>
  requestCatchUpCalls: Array<{ sheetId: string; reason: string; options: unknown }>
  debugLogCalls: Array<{ message: string; meta: Record<string, unknown> | undefined }>
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

const buildHarness = (options?: {
  isQueueOwnedCell?: SheetWorkQueueApi['isQueueOwnedCell']
  queueAppliedVersion?: number | null
  resolveKnownSheetVersion?: number
  requestSheetDeltaCatchUpImpl?: () => Promise<boolean>
}): TestHarness => {
  const bulkApplyCalls: Array<{ items: unknown[]; meta: unknown }> = []
  const versionEchoCalls: Array<{ sheetId: string; version: number }> = []
  const requestCatchUpCalls: Array<{ sheetId: string; reason: string; options: unknown }> = []
  const debugLogCalls: Array<{ message: string; meta: Record<string, unknown> | undefined }> = []
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
    isQueueOwnedCell: options?.isQueueOwnedCell ?? (() => false),
    getDebugState: jest.fn(
      () =>
        ({
          queueClientAppliedVersion: options?.queueAppliedVersion ?? null
        }) as SheetWorkQueueApi['getDebugState'] extends (...args: any[]) => infer TResult ? TResult : never
    ) as unknown as SheetWorkQueueApi['getDebugState']
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
  const liveRemoteApplyVersionRef = { current: null } as any

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
    getWorkbookSnapshot: () => null,
    applyCommittedWorksheetMetadataPatch: () => undefined,
    applyCommittedCommentAnchorPatches: () => undefined,
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
    requestSheetDeltaCatchUp: async (sheetId: string, reason: string, extraOptions?: unknown) => {
      requestCatchUpCalls.push({ sheetId, reason, options: extraOptions })
      return options?.requestSheetDeltaCatchUpImpl ? options.requestSheetDeltaCatchUpImpl() : true
    },
    scheduleSheetVersionRefreshFromApi: () => undefined,
    scheduleRemoteStructuralResync: () => undefined,
    handleRemoteColumnUpdate: () => undefined,
    mutationFacadeRef: { current: null } as any,
    fetchSheetReplaySince: async () => ({ currentVersion: 0, changes: [], requiresSnapshot: false }),
    isSpreadsheetAppsDebugEnabled: () => false,
    enqueueDiagnosticsTraceEvent: () => undefined,
    sheetT: (k: string) => k,
    debugLog: (message: string, meta?: Record<string, unknown>) => {
      debugLogCalls.push({ message, meta })
    },
    setActiveSheetId: () => undefined,
    getActiveSessionRows: () => [],
    resolveKnownSheetVersion: () => options?.resolveKnownSheetVersion ?? 0,
    getSheetWorkQueue: () => sheetWorkQueue as SheetWorkQueueApi,
    liveRemoteApplyVersionRef
  })

  const flushRaf = (): void => {
    const drained = rafQueue.splice(0, rafQueue.length)
    for (const cb of drained) cb(performance.now?.() ?? Date.now())
  }
  const flushMicrotasks = async (): Promise<void> => {
    await Promise.resolve()
    await Promise.resolve()
  }

  return {
    callbacks,
    flushRaf,
    flushMicrotasks,
    bulkApplyCalls,
    versionEchoCalls,
    requestCatchUpCalls,
    debugLogCalls,
    applyRemoteCellUpdateWithRetry
  }
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

  it('collapses repeated version updates into one queue enqueue per frame once catch-up resolves', async () => {
    const h = buildHarness({
      queueAppliedVersion: 29,
      resolveKnownSheetVersion: 29,
      requestSheetDeltaCatchUpImpl: async () => true
    })
    for (let v = 10; v <= 30; v += 1) {
      h.callbacks.onVersionUpdate(v)
    }
    expect(h.versionEchoCalls).toHaveLength(0)
    await h.flushMicrotasks()
    h.flushRaf()
    await h.flushMicrotasks()
    expect(h.versionEchoCalls).toHaveLength(1)
    expect(h.versionEchoCalls[0]).toEqual({ sheetId: ACTIVE_SHEET_ID, version: 30 })
  })

  it('routes behind-version echoes through catch-up before marking the queue current', async () => {
    let resolveCatchUp!: (value: boolean) => void
    const h = buildHarness({
      queueAppliedVersion: 31,
      resolveKnownSheetVersion: 31,
      requestSheetDeltaCatchUpImpl: () =>
        new Promise<boolean>(resolve => {
          resolveCatchUp = resolve
        })
    })

    h.callbacks.onVersionUpdate(32)

    expect(h.requestCatchUpCalls).toEqual([
      {
        sheetId: ACTIVE_SHEET_ID,
        reason: 'version_gap',
        options: { sinceVersion: 31, incomingVersion: 32 }
      }
    ])
    expect(h.versionEchoCalls).toHaveLength(0)

    resolveCatchUp(true)
    await h.flushMicrotasks()
    h.flushRaf()
    await h.flushMicrotasks()

    expect(h.versionEchoCalls).toEqual([{ sheetId: ACTIVE_SHEET_ID, version: 32 }])
    expect(h.debugLogCalls.some(call => call.message === 'versionEcho_requires_catchup')).toBe(true)
    expect(h.debugLogCalls.some(call => call.message === 'structural_catchup_applied')).toBe(true)
  })

  it('does not request catch-up for the same version right after a live remote transaction applied it', async () => {
    const h = buildHarness({
      queueAppliedVersion: 31,
      resolveKnownSheetVersion: 31
    })

    h.callbacks.runRemoteTransaction?.({
      ok: true,
      batch: {
        sheetId: ACTIVE_SHEET_ID,
        baseVersion: 31,
        appliedVersion: 32,
        payloadSchemaVersion: 1,
        operations: []
      },
      sessionPatch: { rows: [] },
      dirtyRegions: []
    } as any)

    h.callbacks.onVersionUpdate(32)
    await h.flushMicrotasks()
    h.flushRaf()
    await h.flushMicrotasks()

    expect(h.requestCatchUpCalls).toHaveLength(0)
    expect(h.versionEchoCalls).toEqual([{ sheetId: ACTIVE_SHEET_ID, version: 32 }])
    expect(h.debugLogCalls.some(call => call.message === 'versionEcho_requires_catchup')).toBe(false)
  })

  it('does not request catch-up for same-user local echo version updates', async () => {
    const h = buildHarness({
      queueAppliedVersion: 31,
      resolveKnownSheetVersion: 31
    })

    h.callbacks.onVersionUpdate(32, { isLocalEcho: true })
    await h.flushMicrotasks()
    h.flushRaf()
    await h.flushMicrotasks()

    expect(h.requestCatchUpCalls).toHaveLength(0)
    expect(h.versionEchoCalls).toEqual([{ sheetId: ACTIVE_SHEET_ID, version: 32 }])
    expect(h.debugLogCalls.some(call => call.message === 'versionOnlyEcho_local_echo_noop')).toBe(true)
    expect(h.debugLogCalls.some(call => call.message === 'versionEcho_requires_catchup')).toBe(false)
  })

  it('does not let queue-applied version state suppress catch-up when the known sheet version is behind', async () => {
    const h = buildHarness({
      queueAppliedVersion: 32,
      resolveKnownSheetVersion: 31,
      requestSheetDeltaCatchUpImpl: async () => true
    })

    h.callbacks.onVersionUpdate(32)

    await h.flushMicrotasks()
    expect(h.requestCatchUpCalls).toEqual([
      {
        sheetId: ACTIVE_SHEET_ID,
        reason: 'version_gap',
        options: { sinceVersion: 31, incomingVersion: 32 }
      }
    ])
    expect(h.versionEchoCalls).toHaveLength(0)

    h.flushRaf()
    await h.flushMicrotasks()

    expect(h.versionEchoCalls).toHaveLength(0)
    expect(h.debugLogCalls.some(call => call.message === 'versionEcho_requires_catchup')).toBe(true)
    expect(h.debugLogCalls.some(call => call.message === 'versionOnlyEcho_noop')).toBe(true)
  })

  it('keeps equal-version echoes cheap and skips redundant queue version jobs', async () => {
    const h = buildHarness({
      queueAppliedVersion: 32,
      resolveKnownSheetVersion: 32
    })

    h.callbacks.onVersionUpdate(32)
    h.flushRaf()
    await h.flushMicrotasks()

    expect(h.requestCatchUpCalls).toHaveLength(0)
    expect(h.versionEchoCalls).toHaveLength(0)
    expect(h.debugLogCalls.some(call => call.message === 'versionOnlyEcho_noop')).toBe(true)
  })
})
