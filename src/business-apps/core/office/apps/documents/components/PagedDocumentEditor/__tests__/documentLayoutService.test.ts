import {
  createLegacyDomPaginationLayoutService,
  resolveCurrentPageFromLayoutNavigation,
  resolveObservableLayoutRoot
} from '../documentLayoutService'
import { createIncrementalDocumentLayoutService } from '../incrementalDocumentLayoutService'

function createMeasurementRequest(
  generation: number,
  reason: 'initial-load' | 'viewport-resize' | 'legacy-dom-structure',
  scope: 'full-document' | 'viewport' | 'structure',
  pageRange: { startPage: number; endPage: number } | null = null
) {
  return {
    generation,
    reason,
    scope,
    pageRange
  } as const
}

function createPage(documentRef: Document, pageNumber: number): HTMLElement {
  const pageBreak = documentRef.createElement('div')
  pageBreak.className = 'rm-page-break'

  const page = documentRef.createElement('div')
  page.className = 'page'
  page.dataset.rmPageNumber = String(pageNumber)

  const breaker = documentRef.createElement('div')
  breaker.className = 'breaker'
  pageBreak.append(page, breaker)

  return pageBreak
}

function setRect(element: HTMLElement, rect: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right' | 'width' | 'height'>) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () =>
      ({
        x: rect.left,
        y: rect.top,
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
        toJSON: () => ({})
      }) as DOMRect
  })
}

function mountPaginationRoot(pageCount: number, options?: { wrapInChrome?: boolean }): HTMLDivElement {
  const container = document.createElement('div')
  const paginationChrome = document.createElement('div')
  const paginationRoot = document.createElement('div')
  paginationRoot.setAttribute('data-rm-pagination', '')
  paginationChrome.dataset.rmPaginationChrome = 'true'

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    paginationRoot.appendChild(createPage(document, pageNumber))
  }

  if (options?.wrapInChrome) {
    paginationChrome.appendChild(paginationRoot)
    container.appendChild(paginationChrome)
  } else {
    container.appendChild(paginationRoot)
  }

  return container
}

function runSharedLayoutServiceContract(label: string, createService: typeof createLegacyDomPaginationLayoutService) {
  describe(label, () => {
    it('reuses cached layout for viewport requests', () => {
      const service = createService()
      const container = mountPaginationRoot(3)

      const initialMeasurement = service.measureLayout(
        container,
        createMeasurementRequest(1, 'initial-load', 'full-document')
      )

      const paginationRoot = container.querySelector('[data-rm-pagination]')
      expect(paginationRoot).not.toBeNull()

      paginationRoot?.replaceChildren(createPage(document, 1))

      const viewportMeasurement = service.measureLayout(
        container,
        createMeasurementRequest(2, 'viewport-resize', 'viewport', { startPage: 2, endPage: 3 })
      )

      expect(initialMeasurement.layout.pageCount).toBe(3)
      expect(initialMeasurement.layout.activePages.map(page => page.pageNumber)).toEqual([1, 2, 3])
      expect(initialMeasurement.layout.mountedRange).toEqual({ startPage: 1, endPage: 3 })
      expect(initialMeasurement.layout.pages).toEqual([
        { pageNumber: 1, flowIndex: 0, mountedIndex: 0, isMounted: true },
        { pageNumber: 2, flowIndex: 1, mountedIndex: 1, isMounted: true },
        { pageNumber: 3, flowIndex: 2, mountedIndex: 2, isMounted: true }
      ])
      expect(viewportMeasurement.layout.pageCount).toBe(3)
      expect(viewportMeasurement.navigationState.boundaryEls).toHaveLength(2)
      expect(viewportMeasurement.navigationState.activeRange).toEqual({ startPage: 2, endPage: 3 })
      expect(viewportMeasurement.layout.activePages.map(page => page.pageNumber)).toEqual([2, 3])
    })

    it('refreshes the cached layout for structure requests', () => {
      const service = createService()
      const container = mountPaginationRoot(3)

      service.measureLayout(container, createMeasurementRequest(1, 'initial-load', 'full-document'))

      const paginationRoot = container.querySelector('[data-rm-pagination]')
      expect(paginationRoot).not.toBeNull()

      paginationRoot?.replaceChildren(createPage(document, 1))

      service.measureLayout(container, createMeasurementRequest(2, 'viewport-resize', 'viewport'))

      const structureMeasurement = service.measureLayout(
        container,
        createMeasurementRequest(3, 'legacy-dom-structure', 'structure')
      )

      expect(structureMeasurement.layout.pageCount).toBe(1)
      expect(structureMeasurement.navigationState.boundaryEls).toHaveLength(0)
      expect(structureMeasurement.navigationState.activeRange).toEqual({ startPage: 1, endPage: 1 })
      expect(structureMeasurement.layout.activePages.map(page => page.pageNumber)).toEqual([1])
    })

    it('rebuilds the viewport window when the requested page range changes', () => {
      const service = createService()
      const container = mountPaginationRoot(5)

      service.measureLayout(container, createMeasurementRequest(1, 'initial-load', 'full-document'))

      const firstViewportMeasurement = service.measureLayout(
        container,
        createMeasurementRequest(2, 'viewport-resize', 'viewport', { startPage: 2, endPage: 3 })
      )
      const secondViewportMeasurement = service.measureLayout(
        container,
        createMeasurementRequest(3, 'viewport-resize', 'viewport', { startPage: 4, endPage: 5 })
      )

      expect(firstViewportMeasurement.layout.activePages.map(page => page.pageNumber)).toEqual([2, 3])
      expect(secondViewportMeasurement.layout.activePages.map(page => page.pageNumber)).toEqual([4, 5])
      expect(secondViewportMeasurement.navigationState.activeRange).toEqual({ startPage: 4, endPage: 5 })
    })

    it('keeps the total page count from sparse pagination metadata', () => {
      const service = createService()
      const container = document.createElement('div')
      const paginationRoot = document.createElement('div')
      const topSpacer = document.createElement('div')
      const bottomSpacer = document.createElement('div')

      paginationRoot.dataset.rmPagination = ''
      paginationRoot.dataset.rmTotalPages = '500'
      topSpacer.className = 'rm-page-spacer'
      topSpacer.dataset.rmPageRangeStart = '1'
      topSpacer.dataset.rmPageRangeEnd = '196'
      bottomSpacer.className = 'rm-page-spacer'
      bottomSpacer.dataset.rmPageRangeStart = '204'
      bottomSpacer.dataset.rmPageRangeEnd = '500'
      paginationRoot.append(
        topSpacer,
        createPage(document, 197),
        createPage(document, 198),
        createPage(document, 199),
        createPage(document, 200),
        createPage(document, 201),
        createPage(document, 202),
        createPage(document, 203),
        bottomSpacer
      )
      container.appendChild(paginationRoot)

      const measurement = service.measureLayout(
        container,
        createMeasurementRequest(1, 'viewport-resize', 'viewport', { startPage: 197, endPage: 203 })
      )

      expect(measurement.layout.pageCount).toBe(500)
      expect(measurement.layout.activePages.map(page => page.pageNumber)).toEqual([197, 198, 199, 200, 201, 202, 203])
      expect(measurement.layout.mountedRange).toEqual({ startPage: 197, endPage: 203 })
      expect(measurement.layout.pages[0]).toEqual({
        pageNumber: 1,
        flowIndex: 0,
        mountedIndex: null,
        isMounted: false
      })
      expect(measurement.layout.pages[196]).toEqual({
        pageNumber: 197,
        flowIndex: 1,
        mountedIndex: 0,
        isMounted: true
      })
      expect(measurement.layout.pages[202]).toEqual({
        pageNumber: 203,
        flowIndex: 7,
        mountedIndex: 6,
        isMounted: true
      })
      expect(measurement.layout.pages[499]).toEqual({
        pageNumber: 500,
        flowIndex: 8,
        mountedIndex: null,
        isMounted: false
      })
      expect(measurement.layout.flow).toEqual([
        {
          flowIndex: 0,
          pageRange: { startPage: 1, endPage: 196 },
          kind: 'spacer',
          isMounted: false
        },
        {
          flowIndex: 1,
          pageRange: { startPage: 197, endPage: 197 },
          kind: 'page-break',
          isMounted: true
        },
        {
          flowIndex: 2,
          pageRange: { startPage: 198, endPage: 198 },
          kind: 'page-break',
          isMounted: true
        },
        {
          flowIndex: 3,
          pageRange: { startPage: 199, endPage: 199 },
          kind: 'page-break',
          isMounted: true
        },
        {
          flowIndex: 4,
          pageRange: { startPage: 200, endPage: 200 },
          kind: 'page-break',
          isMounted: true
        },
        {
          flowIndex: 5,
          pageRange: { startPage: 201, endPage: 201 },
          kind: 'page-break',
          isMounted: true
        },
        {
          flowIndex: 6,
          pageRange: { startPage: 202, endPage: 202 },
          kind: 'page-break',
          isMounted: true
        },
        {
          flowIndex: 7,
          pageRange: { startPage: 203, endPage: 203 },
          kind: 'page-break',
          isMounted: true
        },
        {
          flowIndex: 8,
          pageRange: { startPage: 204, endPage: 500 },
          kind: 'spacer',
          isMounted: false
        }
      ])
      expect(measurement.navigationState.pageBreakEls).toHaveLength(7)
      expect(measurement.navigationState.flowEls).toHaveLength(9)
    })

    it('reads pagination state from a chrome-wrapped root', () => {
      const service = createService()
      const container = mountPaginationRoot(3, { wrapInChrome: true })

      const measurement = service.measureLayout(container, createMeasurementRequest(1, 'initial-load', 'full-document'))

      expect(measurement.layout.pageCount).toBe(3)
      expect(measurement.layout.mountedRange).toEqual({ startPage: 1, endPage: 3 })
      expect(measurement.navigationState.pageBreakEls).toHaveLength(3)
      expect(measurement.navigationState.flowEls).toHaveLength(3)
      expect(measurement.layout.activePages.map(page => page.pageNumber)).toEqual([1, 2, 3])
    })

    it('reads pagination state when the pagination root is nested inside viewport shell wrappers', () => {
      const service = createService()
      const container = document.createElement('div')
      const viewportShell = document.createElement('div')
      const contextMenuTrigger = document.createElement('div')
      const paginationChrome = document.createElement('div')
      const paginationRoot = document.createElement('div')

      paginationChrome.dataset.rmPaginationChrome = 'true'
      paginationRoot.dataset.rmPagination = ''
      paginationRoot.dataset.rmTotalPages = '7'

      for (let pageNumber = 2; pageNumber <= 6; pageNumber += 1) {
        paginationRoot.appendChild(createPage(document, pageNumber))
      }

      paginationChrome.appendChild(paginationRoot)
      contextMenuTrigger.appendChild(paginationChrome)
      viewportShell.appendChild(contextMenuTrigger)
      container.appendChild(viewportShell)

      const measurement = service.measureLayout(
        container,
        createMeasurementRequest(1, 'viewport-resize', 'viewport', { startPage: 2, endPage: 6 })
      )

      expect(measurement.layout.pageCount).toBe(7)
      expect(measurement.layout.mountedRange).toEqual({ startPage: 2, endPage: 6 })
      expect(measurement.navigationState.pageBreakEls).toHaveLength(5)
      expect(measurement.navigationState.flowEls).toHaveLength(5)
      expect(measurement.layout.activePages.map(page => page.pageNumber)).toEqual([2, 3, 4, 5, 6])
    })

    it('captures mounted page body bounds in the layout measurement', () => {
      const service = createService()
      const container = mountPaginationRoot(2)
      const firstPage = container.querySelector('.page[data-rm-page-number="1"]') as HTMLElement
      const secondPage = container.querySelector('.page[data-rm-page-number="2"]') as HTMLElement

      setRect(firstPage, { top: 100, bottom: 180, left: 10, right: 110, width: 100, height: 80 })
      setRect(secondPage, { top: 200, bottom: 280, left: 10, right: 110, width: 100, height: 80 })

      const measurement = service.measureLayout(container, createMeasurementRequest(1, 'initial-load', 'full-document'))

      expect(measurement.layout.mountedPageBodyBounds).toEqual([
        { pageNumber: 1, top: 100, bottom: 180, left: 10, right: 110 },
        { pageNumber: 2, top: 200, bottom: 280, left: 10, right: 110 }
      ])
    })
  })
}

runSharedLayoutServiceContract('createLegacyDomPaginationLayoutService', createLegacyDomPaginationLayoutService)
runSharedLayoutServiceContract('createIncrementalDocumentLayoutService', createIncrementalDocumentLayoutService)

describe('resolveObservableLayoutRoot', () => {
  it('falls back to the container root when tiptap view access throws before mount', () => {
    const container = document.createElement('div')
    const proseMirrorRoot = document.createElement('div')
    proseMirrorRoot.className = 'ProseMirror'
    container.appendChild(proseMirrorRoot)

    const editor = {
      get view() {
        throw new Error("view['dom'] not available")
      }
    } as never

    expect(resolveObservableLayoutRoot(editor, container)).toBe(proseMirrorRoot)
  })
})

describe('createIncrementalDocumentLayoutService.observeLayout', () => {
  const OriginalMutationObserver = global.MutationObserver

  class FakeMutationObserver {
    callback: MutationCallback
    observe = jest.fn()
    disconnect = jest.fn()
    takeRecords = jest.fn(() => [])

    constructor(callback: MutationCallback) {
      this.callback = callback
      fakeObservers.push(this)
    }
  }

  let fakeObservers: FakeMutationObserver[]

  beforeEach(() => {
    fakeObservers = []
    global.MutationObserver = FakeMutationObserver as unknown as typeof MutationObserver
  })

  afterEach(() => {
    global.MutationObserver = OriginalMutationObserver
  })

  it('ignores unrelated root child mutations when the page registry is unchanged', () => {
    const service = createIncrementalDocumentLayoutService()
    const container = mountPaginationRoot(2)
    const onInvalidated = jest.fn()

    const unsubscribe = service.observeLayout({
      editor: {
        view: {
          dom: container
        }
      } as never,
      container,
      onInvalidated
    })

    expect(fakeObservers).toHaveLength(2)

    container.appendChild(document.createElement('div'))
    fakeObservers[1]?.callback([], fakeObservers[1] as unknown as MutationObserver)

    expect(onInvalidated).not.toHaveBeenCalled()

    unsubscribe()
  })

  it('still invalidates when pagination flow children change', async () => {
    const service = createIncrementalDocumentLayoutService()
    const container = mountPaginationRoot(2)
    const onInvalidated = jest.fn()
    const paginationRoot = container.querySelector('[data-rm-pagination]') as HTMLElement

    service.observeLayout({
      editor: {
        view: {
          dom: container
        }
      } as never,
      container,
      onInvalidated
    })

    expect(fakeObservers).toHaveLength(2)

    paginationRoot.appendChild(createPage(document, 3))
    fakeObservers[0]?.callback([], fakeObservers[0] as unknown as MutationObserver)

    await new Promise<void>(resolve => {
      requestAnimationFrame(() => resolve())
    })

    expect(onInvalidated).toHaveBeenCalledWith('legacy-dom-structure')
  })

  it('downgrades mounted-window-only pagination changes to viewport invalidations', async () => {
    const service = createIncrementalDocumentLayoutService()
    const container = mountPaginationRoot(2)
    const onInvalidated = jest.fn()
    const paginationRoot = container.querySelector('[data-rm-pagination]') as HTMLElement
    paginationRoot.dataset.rmTotalPages = '5'

    service.observeLayout({
      editor: {
        view: {
          dom: container
        }
      } as never,
      container,
      onInvalidated
    })

    expect(fakeObservers).toHaveLength(2)

    paginationRoot.replaceChildren(createPage(document, 2), createPage(document, 3))
    fakeObservers[0]?.callback([], fakeObservers[0] as unknown as MutationObserver)

    await new Promise<void>(resolve => {
      requestAnimationFrame(() => resolve())
    })

    expect(onInvalidated).toHaveBeenCalledWith('viewport-resize')
  })
})

describe('resolveCurrentPageFromLayoutNavigation', () => {
  it('resolves the current page from ordered page-break flow elements', () => {
    const container = document.createElement('div')
    const pageOne = createPage(document, 1)
    const pageTwo = createPage(document, 2)
    const pageThree = createPage(document, 3)

    setRect(container, { top: 0, bottom: 200, left: 0, right: 100, width: 100, height: 200 })
    setRect(pageOne, { top: 0, bottom: 90, left: 0, right: 100, width: 100, height: 90 })
    setRect(pageTwo, { top: 90, bottom: 180, left: 0, right: 100, width: 100, height: 90 })
    setRect(pageThree, { top: 180, bottom: 270, left: 0, right: 100, width: 100, height: 90 })

    expect(
      resolveCurrentPageFromLayoutNavigation(container, {
        boundaryEls: [],
        activeRange: null,
        pageBreakEls: [pageOne, pageTwo, pageThree],
        flowEls: [pageOne, pageTwo, pageThree]
      })
    ).toBe(2)
  })

  it('resolves sparse spacer ranges without scanning every element linearly', () => {
    const container = document.createElement('div')
    const leadingSpacer = document.createElement('div')
    const mountedPage = createPage(document, 197)
    const trailingSpacer = document.createElement('div')

    leadingSpacer.className = 'rm-page-spacer'
    leadingSpacer.dataset.rmPageRangeStart = '1'
    leadingSpacer.dataset.rmPageRangeEnd = '196'
    trailingSpacer.className = 'rm-page-spacer'
    trailingSpacer.dataset.rmPageRangeStart = '198'
    trailingSpacer.dataset.rmPageRangeEnd = '201'

    setRect(container, { top: 200, bottom: 400, left: 0, right: 100, width: 100, height: 200 })
    setRect(leadingSpacer, { top: 0, bottom: 60, left: 0, right: 100, width: 100, height: 60 })
    setRect(mountedPage, { top: 60, bottom: 120, left: 0, right: 100, width: 100, height: 60 })
    setRect(trailingSpacer, { top: 120, bottom: 520, left: 0, right: 100, width: 100, height: 400 })

    expect(
      resolveCurrentPageFromLayoutNavigation(container, {
        boundaryEls: [],
        activeRange: null,
        pageBreakEls: [mountedPage],
        flowEls: [leadingSpacer, mountedPage, trailingSpacer]
      })
    ).toBe(199)
  })

  it('uses stored spacer segment heights for uneven sparse page ranges', () => {
    const container = document.createElement('div')
    const spacer = document.createElement('div')

    spacer.className = 'rm-page-spacer'
    spacer.dataset.rmPageRangeStart = '10'
    spacer.dataset.rmPageRangeEnd = '12'
    spacer.dataset.rmPageSegmentHeights = '40,120,40'

    setRect(container, { top: 0, bottom: 200, left: 0, right: 100, width: 100, height: 200 })
    setRect(spacer, { top: 0, bottom: 200, left: 0, right: 100, width: 100, height: 200 })

    expect(
      resolveCurrentPageFromLayoutNavigation(container, {
        boundaryEls: [],
        activeRange: null,
        pageBreakEls: [],
        flowEls: [spacer]
      })
    ).toBe(11)
  })

  it('uses binary search over boundary elements for legacy pagination navigation', () => {
    const container = document.createElement('div')
    const boundaryOne = document.createElement('div')
    const boundaryTwo = document.createElement('div')
    const boundaryThree = document.createElement('div')

    setRect(container, { top: 0, bottom: 260, left: 0, right: 100, width: 100, height: 260 })
    setRect(boundaryOne, { top: 40, bottom: 40, left: 0, right: 100, width: 100, height: 0 })
    setRect(boundaryTwo, { top: 120, bottom: 120, left: 0, right: 100, width: 100, height: 0 })
    setRect(boundaryThree, { top: 220, bottom: 220, left: 0, right: 100, width: 100, height: 0 })

    expect(
      resolveCurrentPageFromLayoutNavigation(container, {
        boundaryEls: [boundaryOne, boundaryTwo, boundaryThree],
        activeRange: null,
        pageBreakEls: [],
        flowEls: []
      })
    ).toBe(3)
  })
})
