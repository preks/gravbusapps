import { openManagedPaginationOverlay } from '../overlayOpenController'
import { createPaginationCommandController, requestViewportPageFocus } from '../paginationCommandController'

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

function createControllerHarness(options?: { scheduleFrame?: (callback: FrameRequestCallback) => number }) {
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
    refreshAndStabilizeMeta: 'REFRESH_AND_STABILIZE',
    scheduleFrame: options?.scheduleFrame ?? (() => 1)
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

  it('schedules a refresh-retry path when opening an editor without a matching target', () => {
    const harness = createControllerHarness()

    expect(harness.controller.openEditorByType(harness.editor, 'header', 2)).toBe(true)
    expect(harness.windowedRenderer.syncRootPresentation).toHaveBeenCalledWith({
      editorDom: harness.view.dom,
      options: harness.runtimeOptions,
      storage: harness.storage
    })
    expect(openManagedPaginationOverlay).not.toHaveBeenCalled()
  })

  it('refreshes and retries opening an editor when sparse shells are remounted after refresh', () => {
    const harness = createControllerHarness({
      scheduleFrame: callback => {
        callback(0)
        return 1
      }
    })

    harness.dispatch.mockImplementation(() => {
      const target = document.createElement('div')
      target.dataset.rmEditorType = 'header'
      target.dataset.rmPageNumber = '2'
      harness.dom.append(target)
    })

    expect(harness.controller.openEditorByType(harness.editor, 'header', 2)).toBe(true)
    expect(harness.windowedRenderer.syncRootPresentation).toHaveBeenCalledWith({
      editorDom: harness.view.dom,
      options: harness.runtimeOptions,
      storage: harness.storage
    })
    expect(harness.dispatch).toHaveBeenCalledWith(harness.transaction)
    expect(openManagedPaginationOverlay).toHaveBeenCalledWith(
      expect.objectContaining({
        activeEditor: { type: 'header', pageNumber: 2 }
      })
    )
  })

  it('scrolls the viewport toward the requested sparse page before falling back to refresh', () => {
    const harness = createControllerHarness({
      scheduleFrame: callback => {
        callback(0)
        return 1
      }
    })
    harness.storage.pageCount = 10
    harness.storage.getPageCount = () => 10

    const viewport = document.createElement('div')
    const paginationChrome = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const spacer = document.createElement('div')
    const target = document.createElement('div')
    const querySelectorSpy = jest.spyOn(harness.dom, 'querySelector')

    viewport.className = 'document-editor-viewport'
    viewport.appendChild(harness.dom)
    paginationChrome.dataset.rmPaginationChrome = 'true'
    paginationChrome.appendChild(paginationRoot)
    harness.dom.appendChild(paginationChrome)
    paginationRoot.dataset.rmPagination = 'true'
    spacer.className = 'rm-page-spacer'
    spacer.dataset.rmPageRangeStart = '5'
    spacer.dataset.rmPageRangeEnd = '9'
    paginationRoot.appendChild(spacer)
    target.dataset.rmEditorType = 'footer'
    target.dataset.rmPageNumber = '7'

    Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: 200 })
    Object.defineProperty(viewport, 'scrollTop', { configurable: true, writable: true, value: 0 })
    jest.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      left: 0,
      bottom: 200,
      right: 400,
      width: 400,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => ({})
    } as DOMRect)
    jest.spyOn(spacer, 'getBoundingClientRect').mockReturnValue({
      top: 400,
      left: 0,
      bottom: 1400,
      right: 400,
      width: 400,
      height: 1000,
      x: 0,
      y: 400,
      toJSON: () => ({})
    } as DOMRect)
    viewport.addEventListener('scroll', () => {
      if (!harness.dom.contains(target)) {
        harness.dom.appendChild(target)
      }
    })

    expect(harness.controller.openEditorByType(harness.editor, 'footer', 7)).toBe(true)
    expect(viewport.scrollTop).toBe(800)
    expect(harness.windowedRenderer.syncRootPresentation).not.toHaveBeenCalled()
    expect(querySelectorSpy).not.toHaveBeenCalledWith('[data-rm-pagination]')
    expect(openManagedPaginationOverlay).toHaveBeenCalledWith(
      expect.objectContaining({
        activeEditor: { type: 'footer', pageNumber: 7 },
        target
      })
    )
  })

  it('focuses the previous mounted shell when opening a later page header', () => {
    const harness = createControllerHarness({
      scheduleFrame: callback => {
        callback(0)
        return 1
      }
    })
    harness.storage.pageCount = 10
    harness.storage.getPageCount = () => 10

    const viewport = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const pageBreak = document.createElement('div')
    const target = document.createElement('div')

    viewport.className = 'document-editor-viewport'
    viewport.appendChild(harness.dom)
    harness.dom.appendChild(paginationRoot)
    paginationRoot.dataset.rmPagination = 'true'
    pageBreak.className = 'rm-page-break'
    pageBreak.dataset.rmPageNumber = '2'
    paginationRoot.appendChild(pageBreak)
    target.dataset.rmEditorType = 'header'
    target.dataset.rmPageNumber = '3'

    Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: 200 })
    Object.defineProperty(viewport, 'scrollTop', { configurable: true, writable: true, value: 0 })
    jest.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      left: 0,
      bottom: 200,
      right: 400,
      width: 400,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => ({})
    } as DOMRect)
    jest.spyOn(pageBreak, 'getBoundingClientRect').mockReturnValue({
      top: 400,
      left: 0,
      bottom: 500,
      right: 400,
      width: 400,
      height: 100,
      x: 0,
      y: 400,
      toJSON: () => ({})
    } as DOMRect)
    viewport.addEventListener('scroll', () => {
      if (!harness.dom.contains(target)) {
        harness.dom.appendChild(target)
      }
    })

    expect(harness.controller.openEditorByType(harness.editor, 'header', 3)).toBe(true)
    expect(viewport.scrollTop).toBe(350)
    expect(harness.windowedRenderer.syncRootPresentation).not.toHaveBeenCalled()
    expect(openManagedPaginationOverlay).toHaveBeenCalledWith(
      expect.objectContaining({
        activeEditor: { type: 'header', pageNumber: 3 },
        target
      })
    )
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

  it('refreshes once and retries hydration when sparse shells are missing', () => {
    const harness = createControllerHarness()
    harness.windowedRenderer.hydratePageBreakShells.mockReturnValueOnce(false).mockReturnValueOnce(true)

    expect(harness.controller.hydratePageBreakShells(harness.editor, [2, 3])).toBe(true)
    expect(harness.windowedRenderer.hydratePageBreakShells).toHaveBeenCalledTimes(2)
    expect(harness.windowedRenderer.syncRootPresentation).toHaveBeenCalledWith({
      editorDom: harness.view.dom,
      options: harness.runtimeOptions,
      storage: harness.storage
    })
    expect(harness.dispatch).toHaveBeenCalledWith(harness.transaction)
  })

  it('hydrates the previous shell alongside requested later pages', () => {
    const harness = createControllerHarness()

    expect(harness.controller.hydratePageBreakShells(harness.editor, [3])).toBe(true)

    expect(harness.windowedRenderer.hydratePageBreakShells).toHaveBeenCalledWith(
      expect.objectContaining({
        editorDom: harness.view.dom,
        pageNumbers: [2, 3],
        options: harness.runtimeOptions,
        storage: harness.storage
      })
    )
  })
})

describe('requestViewportPageFocus', () => {
  it('scrolls to the proportional position of a page inside a spacer range', () => {
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const spacer = document.createElement('div')
    const scrollSpy = jest.fn()

    viewport.className = 'document-editor-viewport'
    viewport.appendChild(editorDom)
    editorDom.appendChild(paginationRoot)
    paginationRoot.dataset.rmPagination = 'true'
    spacer.className = 'rm-page-spacer'
    spacer.dataset.rmPageRangeStart = '10'
    spacer.dataset.rmPageRangeEnd = '19'
    paginationRoot.appendChild(spacer)

    Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: 200 })
    Object.defineProperty(viewport, 'scrollTop', { configurable: true, writable: true, value: 0 })
    jest.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      left: 0,
      bottom: 200,
      right: 500,
      width: 500,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => ({})
    } as DOMRect)
    jest.spyOn(spacer, 'getBoundingClientRect').mockReturnValue({
      top: 300,
      left: 0,
      bottom: 1300,
      right: 500,
      width: 500,
      height: 1000,
      x: 0,
      y: 300,
      toJSON: () => ({})
    } as DOMRect)
    viewport.addEventListener('scroll', scrollSpy)

    expect(requestViewportPageFocus(editorDom, 15)).toBe(true)
    expect(viewport.scrollTop).toBe(750)
    expect(scrollSpy).toHaveBeenCalledTimes(1)
  })
})
