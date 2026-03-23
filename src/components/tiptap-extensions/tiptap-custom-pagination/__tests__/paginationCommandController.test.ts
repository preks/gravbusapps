import { openManagedPaginationOverlay } from '../overlayOpenController'
import { createPaginationCommandController } from '../paginationCommandController'

jest.mock('../overlayOpenController', () => ({
  openManagedPaginationOverlay: jest.fn()
}))

function createTransactionHarness() {
  return {
    metas: new Map<string, unknown>(),
    setMeta(key: string, value: unknown) {
      this.metas.set(key, value)
      return this
    }
  }
}

function createControllerHarness() {
  const transaction = createTransactionHarness()
  const dispatch = jest.fn()
  const dom = document.createElement('div')
  const storage = {
    pageCount: 3,
    getPageCount: () => 3
  } as never
  const editor = {
    storage: {
      pages: storage
    },
    state: {
      tr: transaction
    }
  } as never
  const view = {
    dom,
    dispatch
  } as never
  const overlayManager = {
    close: jest.fn()
  } as never
  const runtimeOptions = {
    headerFooterExtensions: []
  } as never
  const windowedRenderer = {
    syncRootPresentation: jest.fn(),
    refreshPresentation: jest.fn(),
    hydratePageBreakShells: jest.fn().mockReturnValue(true)
  }

  const baseOptions = {
    getRuntimeOptions: jest.fn(() => runtimeOptions),
    getMountedEditorView: jest.fn(() => view),
    getOverlayManager: jest.fn(() => overlayManager),
    syncStorageFromOptions: jest.fn(),
    syncEditorStorage: jest.fn(),
    clearGrowthSuppression: jest.fn(),
    applyMeasuredPageHeightsToView: jest.fn(() => ({
      headerHeights: new Map(),
      footerHeights: new Map()
    })),
    windowedRenderer,
    refreshMeta: 'REFRESH',
    refreshAndStabilizeMeta: 'REFRESH_AND_STABILIZE'
  } as const

  return {
    controller: createPaginationCommandController(baseOptions),
    baseOptions,
    transaction,
    dispatch,
    dom,
    editor,
    overlayManager,
    runtimeOptions,
    storage,
    view,
    windowedRenderer
  }
}

describe('createPaginationCommandController', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('dispatches refresh meta and syncs presentation', () => {
    const harness = createControllerHarness()

    expect(harness.controller.dispatchRefreshCommand(harness.editor, true)).toBe(true)

    expect(harness.baseOptions.syncStorageFromOptions).toHaveBeenCalledWith(harness.storage, harness.runtimeOptions)
    expect(harness.baseOptions.syncEditorStorage).toHaveBeenCalled()
    expect(harness.baseOptions.clearGrowthSuppression).toHaveBeenCalledWith(harness.editor)
    expect(harness.windowedRenderer.syncRootPresentation).toHaveBeenCalledWith({
      editorDom: harness.view.dom,
      options: harness.runtimeOptions,
      storage: harness.storage
    })
    expect(harness.dispatch).toHaveBeenCalledWith(harness.transaction)
    expect(harness.transaction.metas.get('REFRESH')).toBe(true)
    expect(harness.transaction.metas.get('REFRESH_AND_STABILIZE')).toBe(true)
  })

  it('delegates overlay closing to the manager', () => {
    const harness = createControllerHarness()

    harness.controller.closeOverlay(harness.editor)

    expect(harness.overlayManager.close).toHaveBeenCalledTimes(1)
  })

  it('returns false for hydration when no mounted view exists', () => {
    const harness = createControllerHarness()
    harness.baseOptions.getMountedEditorView.mockReturnValueOnce(null)

    expect(harness.controller.hydratePageBreakShells(harness.editor, [1, 2])).toBe(false)
  })

  it('returns false when opening an editor without a matching target', () => {
    const harness = createControllerHarness()

    expect(harness.controller.openEditorByType(harness.editor, 'header', 2)).toBe(false)
    expect(openManagedPaginationOverlay).not.toHaveBeenCalled()
  })

  it('opens a managed overlay when the matching target exists', () => {
    const harness = createControllerHarness()
    const target = document.createElement('div')
    target.dataset.rmEditorType = 'header'
    target.dataset.rmPageNumber = '2'
    harness.dom.append(target)

    expect(harness.controller.openEditorByType(harness.editor, 'header', 2, { clientX: 10, clientY: 20 })).toBe(true)
    expect(openManagedPaginationOverlay).toHaveBeenCalledWith(
      expect.objectContaining({
        overlayManager: harness.overlayManager,
        storage: harness.storage,
        runtimeOptions: harness.runtimeOptions,
        activeEditor: { type: 'header', pageNumber: 2 },
        target,
        clickPosition: { clientX: 10, clientY: 20 }
      })
    )
  })
})
