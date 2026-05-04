import { PluginKey } from '@tiptap/pm/state'
import { createPaginationExtensionPlugins } from '../paginationExtensionPlugins'
import { classifyPaginationTransaction } from '../paginationTransactionClassifier'
import { getMountedEditorView } from '../paginationExtensionLifecycle'
import { isYjsInboundSyncTransaction } from '@/components/tiptap-extensions/yjsProsemirrorSync'

jest.mock('../deferredRepaginationScheduler', () => ({
  createDeferredRepaginationScheduler: jest.fn(() => ({
    clear: jest.fn(),
    schedule: jest.fn(),
    destroy: jest.fn(),
    decrementStabilizationAttempts: jest.fn(),
    resetStabilizationAttempts: jest.fn(),
    getStabilizationAttemptsRemaining: jest.fn(() => 0)
  }))
}))

jest.mock('../paginationDecorationController', () => ({
  createPaginationChromeDecorationSet: jest.fn(() => ({ map: jest.fn() })),
  renderPaginationChromeWidget: jest.fn(() => document.createElement('div'))
}))

jest.mock('../squareWrapDecorationController', () => ({
  buildSquareWrapDecorations: jest.fn(() => ({ map: jest.fn() }))
}))

jest.mock('../paginationLayoutHelpers', () => ({
  applyMeasuredPageHeightsToView: jest.fn(() => ({
    headerHeights: new Map(),
    footerHeights: new Map()
  })),
  createSafePaginationSelection: jest.fn(),
  documentHasTables: jest.fn(() => true),
  resolvePaginationBodyClick: jest.fn(() => ({ action: 'allow' })),
  resolvePaginationSelectionBodyOverflow: jest.fn(() => null)
}))

jest.mock('../paginationHardBreakDecorationController', () => ({
  buildHardBreakDecorations: jest.fn(() => ({ map: jest.fn() })),
  shouldRebuildHardBreakDecorations: jest.fn(() => false)
}))

jest.mock('../paginationPageBreakDecorationController', () => ({
  buildPageBreakSpacerDecorations: jest.fn(() => ({ map: jest.fn() })),
  shouldRebuildPageBreakSpacerDecorations: jest.fn(() => false),
  collectPageBreakEntries: jest.fn(() => [])
}))

jest.mock('../paginationRuntimeBookkeeping', () => ({
  clearPaginationOwnedGrowthSuppression: jest.fn(),
  consumePaginationHydrationDocChange: jest.fn(() => false),
  getPaginationOwnedGrowthSuppressionPageCount: jest.fn(() => null),
  setPaginationOwnedGrowthSuppression: jest.fn()
}))

jest.mock('../paginationRuntimeRegistry', () => ({
  getPaginationOverlayManager: jest.fn(() => ({
    recoverStaleOverlayState: jest.fn()
  })),
  getRuntimeOptions: jest.fn(() => ({})),
  getWindowedRenderer: jest.fn(() => ({
    syncRootPresentation: jest.fn(),
    refreshPresentation: jest.fn(),
    refreshLayoutBounds: jest.fn(),
    destroy: jest.fn()
  }))
}))

jest.mock('../deferredRepaginationEvaluationController', () => ({
  runDeferredRepaginationEvaluationLoop: jest.fn()
}))

jest.mock('../overlayOpenController', () => ({
  openManagedPaginationOverlay: jest.fn()
}))

jest.mock('../paginationPluginViewController', () => ({
  runPaginationPluginViewUpdate: jest.fn()
}))

jest.mock('../overlayReopen', () => ({
  schedulePaginationOverlayReopen: jest.fn()
}))

jest.mock('../windowedRenderer', () => ({
  createWindowedPaginationRenderer: jest.fn(() => ({
    syncRootPresentation: jest.fn(),
    refreshPresentation: jest.fn(),
    refreshLayoutBounds: jest.fn(),
    destroy: jest.fn()
  }))
}))

jest.mock('../paginationExtensionLifecycle', () => ({
  getMountedEditorView: jest.fn()
}))

jest.mock('../paginationInstrumentation', () => ({
  incrementPaginationInstrumentationCounter: jest.fn(),
  recordPaginationInstrumentationEvent: jest.fn()
}))

jest.mock('../paginationTransactionClassifier', () => ({
  classifyPaginationTransaction: jest.fn()
}))

jest.mock('../utils', () => ({
  getPageBodyMeasurementBands: jest.fn(() => []),
  getExistingPageCount: jest.fn(() => 2),
  logPaginationDebug: jest.fn(),
  syncStorageFromOptions: jest.fn()
}))

jest.mock('../paginationStabilizationPolicy', () => ({
  shouldScheduleDeferredRepaginationOnUpdate: jest.fn(() => false)
}))

jest.mock('@/components/tiptap-extensions/yjsProsemirrorSync', () => ({
  isYjsInboundSyncTransaction: jest.fn(() => false)
}))

jest.mock('@/components/tiptap-extensions/tiptap-custom-tables/tablePaginationDetection', () => ({
  hasPendingTableMeasurements: jest.fn(() => false)
}))

jest.mock('@/components/tiptap-extensions/tiptap-custom-tables/tablePaginationController', () => ({
  createTablePaginationController: jest.fn(() => ({
    reset: jest.fn(),
    evaluate: jest.fn()
  }))
}))

jest.mock('@/components/tiptap-extensions/tiptap-custom-tables/tableMetadataOwnedDocChange', () => ({
  TABLE_METADATA_OWNED_DOC_CHANGE_META: 'TABLE_METADATA_OWNED_DOC_CHANGE_META'
}))

function createMetaTransaction() {
  return {
    before: null,
    doc: {},
    docChanged: false,
    mapping: {},
    metas: new Map<string, unknown>(),
    steps: [],
    getMeta(key: string) {
      return this.metas.get(key)
    },
    setMeta(key: string, value: unknown) {
      this.metas.set(key, value)
      return this
    }
  }
}

function createDocChangeTransaction() {
  return {
    before: {},
    doc: {},
    docChanged: true,
    mapping: {},
    metas: new Map<string, unknown>(),
    steps: [],
    getMeta(key: string) {
      return this.metas.get(key)
    }
  }
}

function createHarness() {
  const storage = {
    activeEditorType: null,
    pageCount: 2
  } as never
  const editor = {
    storage: {
      pages: storage
    }
  } as never
  const refreshTransaction = createMetaTransaction()
  const updatedView = {
    dom: document.createElement('div'),
    dispatch: jest.fn(),
    state: {
      doc: {},
      selection: {
        head: 5
      },
      tr: refreshTransaction
    }
  } as never

  ;(getMountedEditorView as jest.Mock).mockReturnValue(updatedView)

  const plugins = createPaginationExtensionPlugins({
    editor,
    storage,
    extensionOptions: {} as never,
    defaultOptions: {} as never,
    paginationKey: new PluginKey('pagination'),
    hardBreakKey: new PluginKey('hard-break'),
    squareWrapKey: new PluginKey('square-wrap'),
    pageBreakSpacerKey: new PluginKey('page-break-spacer'),
    refreshMeta: 'REFRESH',
    refreshAndStabilizeMeta: 'REFRESH_AND_STABILIZE',
    paginationOwnedDocChangeMeta: 'PAGINATION_OWNED_DOC_CHANGE_META',
    initialLayoutStabilizationMaxAttempts: 4
  })

  return {
    paginationPlugin: plugins[0],
    hardBreakPlugin: plugins[1],
    squareWrapPlugin: plugins[2],
    pageBreakSpacerPlugin: plugins[3],
    refreshTransaction,
    updatedView,
    plugins
  }
}

describe('createPaginationExtensionPlugins settled refresh behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('requests a stabilized settle refresh for local edits adjacent to tables', () => {
    ;(classifyPaginationTransaction as jest.Mock).mockReturnValue({
      kind: 'local-text',
      changedRanges: [{ from: 5, to: 5 }],
      touchesTable: false,
      touchesTableAdjacentContent: true,
      touchesTableRegion: true,
      isLayoutNeutral: false,
      shouldScheduleSettledRefresh: true
    })

    const harness = createHarness()
    const pluginView = harness.paginationPlugin.spec.view?.(harness.updatedView)
    const oldValue = {
      map: jest.fn().mockReturnThis()
    } as never

    harness.paginationPlugin.spec.state.apply(createDocChangeTransaction() as never, oldValue)
    pluginView?.update(harness.updatedView)
    jest.advanceTimersByTime(500)

    expect(harness.updatedView.dispatch).toHaveBeenCalledWith(harness.refreshTransaction)
    expect(harness.refreshTransaction.metas.get('REFRESH')).toBe(true)
    expect(harness.refreshTransaction.metas.get('REFRESH_AND_STABILIZE')).toBe(true)
  })

  it('keeps non-table external settle refreshes on the refresh-only path', () => {
    ;(classifyPaginationTransaction as jest.Mock).mockReturnValue({
      kind: 'structure',
      changedRanges: [{ from: 5, to: 8 }],
      touchesTable: false,
      touchesTableAdjacentContent: false,
      touchesTableRegion: false,
      isLayoutNeutral: false,
      shouldScheduleSettledRefresh: true
    })

    const harness = createHarness()
    const pluginView = harness.paginationPlugin.spec.view?.(harness.updatedView)
    const oldValue = {
      map: jest.fn().mockReturnThis()
    } as never

    harness.paginationPlugin.spec.state.apply(createDocChangeTransaction() as never, oldValue)
    pluginView?.update(harness.updatedView)
    jest.advanceTimersByTime(500)

    expect(harness.updatedView.dispatch).toHaveBeenCalledWith(harness.refreshTransaction)
    expect(harness.refreshTransaction.metas.get('REFRESH')).toBe(true)
    expect(harness.refreshTransaction.metas.has('REFRESH_AND_STABILIZE')).toBe(false)
  })

  it('keeps collaboration settle refreshes stabilized', () => {
    ;(classifyPaginationTransaction as jest.Mock).mockReturnValue({
      kind: 'local-text',
      changedRanges: [{ from: 5, to: 5 }],
      touchesTable: false,
      touchesTableAdjacentContent: false,
      touchesTableRegion: false,
      isLayoutNeutral: false,
      shouldScheduleSettledRefresh: false
    })
    ;(isYjsInboundSyncTransaction as jest.Mock).mockReturnValueOnce(true)

    const harness = createHarness()
    const pluginView = harness.paginationPlugin.spec.view?.(harness.updatedView)
    const oldValue = {
      map: jest.fn().mockReturnThis()
    } as never

    harness.paginationPlugin.spec.state.apply(createDocChangeTransaction() as never, oldValue)
    pluginView?.update(harness.updatedView)
    jest.advanceTimersByTime(800)

    expect(harness.updatedView.dispatch).toHaveBeenCalledWith(harness.refreshTransaction)
    expect(harness.refreshTransaction.metas.get('REFRESH')).toBe(true)
    expect(harness.refreshTransaction.metas.get('REFRESH_AND_STABILIZE')).toBe(true)
  })
})

describe('createPaginationExtensionPlugins page break spacer plugin', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('registers a dedicated page break spacer plugin', () => {
    const harness = createHarness()

    expect(harness.plugins).toHaveLength(4)
    expect(harness.pageBreakSpacerPlugin).toBeDefined()
    const pluginSpec = (harness.pageBreakSpacerPlugin as unknown as { spec: Record<string, unknown> }).spec
    expect(pluginSpec.state).toBeDefined()
    expect((pluginSpec.props as { decorations?: unknown }).decorations).toBeDefined()
  })

  it('rebuilds the spacer decoration set on refresh meta transactions', () => {
    const { buildPageBreakSpacerDecorations } = jest.requireMock('../paginationPageBreakDecorationController') as {
      buildPageBreakSpacerDecorations: jest.Mock
    }

    const harness = createHarness()
    const refreshTx = createMetaTransaction()
    refreshTx.setMeta('REFRESH', true)

    const oldValue = {
      map: jest.fn().mockReturnThis()
    } as never

    buildPageBreakSpacerDecorations.mockClear()
    const spacerState = (
      harness.pageBreakSpacerPlugin as unknown as {
        spec: { state: { apply: (tr: unknown, old: unknown) => unknown } }
      }
    ).spec.state
    spacerState.apply(refreshTx, oldValue)

    expect(buildPageBreakSpacerDecorations).toHaveBeenCalledTimes(1)
  })

  it('schedules a refresh when page break positions change', async () => {
    // `queuePluginViewRefresh` uses `queueMicrotask`, which Jest's modern
    // fake timers intercept. Switch to real timers for this test so the
    // microtask actually flushes once we await a resolved promise.
    jest.useRealTimers()

    const { collectPageBreakEntries } = jest.requireMock('../paginationPageBreakDecorationController') as {
      collectPageBreakEntries: jest.Mock
    }

    const harness = createHarness()
    const spacerSpec = (
      harness.pageBreakSpacerPlugin as unknown as {
        spec: { view?: (view: unknown) => { update?: (view: unknown) => void } }
      }
    ).spec
    const pluginView = spacerSpec.view?.(harness.updatedView)

    collectPageBreakEntries.mockReturnValueOnce([])
    pluginView?.update?.(harness.updatedView)

    const dispatchMock = (harness.updatedView as unknown as { dispatch: jest.Mock }).dispatch
    dispatchMock.mockClear()

    collectPageBreakEntries.mockReturnValueOnce([{ pos: 10 }])
    pluginView?.update?.(harness.updatedView)

    await new Promise<void>(resolve => queueMicrotask(resolve))

    expect(dispatchMock).toHaveBeenCalled()

    // Restore fake timers so the shared `afterEach` can flush pending timers
    // without triggering a "not using fake timers" warning.
    jest.useFakeTimers()
  })
})
