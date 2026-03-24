import { createHeaderFooterRegion, createPageBreakElement, createPaginationWrapper } from '../dom'
import { createStorageFromOptions, resolvePageFormat, setStoredVariantContent } from '../utils'
import {
  createWindowedPaginationRenderer,
  createWindowedHeaderFooterChromeController,
  hydrateWindowedPageBreakShells,
  renderWindowedPaginationChrome,
  renderWindowedFirstPageHeader,
  renderWindowedPaginationWrapper
} from '../windowedRenderer'

function createTestOptions() {
  return {
    pageFormat: 'A4',
    pageGap: 24,
    headerHeight: 64,
    footerHeight: 64
  }
}

describe('createWindowedHeaderFooterChromeController', () => {
  it('refreshes active regions immediately and defers off-window regions', () => {
    const options = createTestOptions()
    const storage = createStorageFromOptions(options)
    storage.pageCount = 2
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    const activeRegion = createHeaderFooterRegion({
      type: 'header',
      pageNumber: 1,
      totalPages: 2,
      pageFormat: resolvePageFormat(options.pageFormat),
      options,
      storage,
      extensions: []
    })
    const deferredRegion = createHeaderFooterRegion({
      type: 'header',
      pageNumber: 2,
      totalPages: 2,
      pageFormat: resolvePageFormat(options.pageFormat),
      options,
      storage,
      extensions: []
    })

    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutWindowMode = 'windowed'
    viewport.dataset.layoutWindowStart = '1'
    viewport.dataset.layoutWindowEnd = '1'
    viewport.appendChild(editorDom)
    editorDom.append(activeRegion, deferredRegion)
    document.body.appendChild(viewport)

    setStoredVariantContent(storage, 'header', 'default', {
      html: '<p>Updated header</p>',
      json: null
    })

    const scheduledCallbacks: FrameRequestCallback[] = []
    const controller = createWindowedHeaderFooterChromeController({
      scheduleFrame: callback => {
        scheduledCallbacks.push(callback)
        return scheduledCallbacks.length
      },
      cancelScheduledFrame: () => undefined
    })

    controller.refresh({
      editorDom,
      options,
      storage,
      shouldRunDeferredRefresh: () => true
    })

    expect(activeRegion.querySelector('.rm-page-header-content')?.innerHTML).toContain('Updated header')
    expect(deferredRegion.querySelector('.rm-page-header-content')?.innerHTML).not.toContain('Updated header')
    expect(scheduledCallbacks).toHaveLength(1)

    scheduledCallbacks[0](0)

    expect(deferredRegion.querySelector('.rm-page-header-content')?.innerHTML).toContain('Updated header')
  })

  it('defers the global region scan until the scheduled off-window refresh', () => {
    const options = createTestOptions()
    const storage = createStorageFromOptions(options)
    storage.pageCount = 2
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    const activeRegion = createHeaderFooterRegion({
      type: 'header',
      pageNumber: 1,
      totalPages: 2,
      pageFormat: resolvePageFormat(options.pageFormat),
      options,
      storage,
      extensions: []
    })
    const deferredRegion = createHeaderFooterRegion({
      type: 'header',
      pageNumber: 2,
      totalPages: 2,
      pageFormat: resolvePageFormat(options.pageFormat),
      options,
      storage,
      extensions: []
    })

    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutWindowMode = 'windowed'
    viewport.dataset.layoutWindowStart = '1'
    viewport.dataset.layoutWindowEnd = '1'
    viewport.appendChild(editorDom)
    editorDom.append(activeRegion, deferredRegion)
    document.body.appendChild(viewport)

    setStoredVariantContent(storage, 'header', 'default', {
      html: '<p>Updated header</p>',
      json: null
    })

    const scheduledCallbacks: FrameRequestCallback[] = []
    const querySelectorAllSpy = jest.spyOn(editorDom, 'querySelectorAll')
    const controller = createWindowedHeaderFooterChromeController({
      scheduleFrame: callback => {
        scheduledCallbacks.push(callback)
        return scheduledCallbacks.length
      },
      cancelScheduledFrame: () => undefined
    })

    controller.refresh({
      editorDom,
      options,
      storage,
      shouldRunDeferredRefresh: () => true
    })

    expect(querySelectorAllSpy).not.toHaveBeenCalledWith('[data-rm-editor-type][data-rm-page-number]')

    scheduledCallbacks[0](0)

    expect(querySelectorAllSpy).toHaveBeenCalledWith('[data-rm-editor-type][data-rm-page-number]')
  })

  it('refreshes active window regions without per-page selector scans when page shells are mounted', () => {
    const options = createTestOptions()
    const storage = createStorageFromOptions(options)
    storage.pageCount = 2
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    const chrome = renderWindowedPaginationChrome({
      editorDom,
      options,
      storage
    })

    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutWindowMode = 'windowed'
    viewport.dataset.layoutWindowStart = '1'
    viewport.dataset.layoutWindowEnd = '1'
    viewport.dataset.layoutWindowKey = 'window-1'
    viewport.appendChild(editorDom)
    editorDom.appendChild(chrome)
    document.body.appendChild(viewport)

    setStoredVariantContent(storage, 'header', 'default', {
      html: '<p>Updated header</p>',
      json: null
    })

    const scheduledCallbacks: FrameRequestCallback[] = []
    const querySelectorAllSpy = jest.spyOn(editorDom, 'querySelectorAll')
    const controller = createWindowedHeaderFooterChromeController({
      scheduleFrame: callback => {
        scheduledCallbacks.push(callback)
        return scheduledCallbacks.length
      },
      cancelScheduledFrame: () => undefined
    })

    controller.refresh({
      editorDom,
      options,
      storage,
      shouldRunDeferredRefresh: () => true
    })

    expect(querySelectorAllSpy).not.toHaveBeenCalledWith('[data-rm-editor-type][data-rm-page-number="1"]')
    expect(querySelectorAllSpy).not.toHaveBeenCalledWith('[data-rm-pagination] > .rm-page-break')
    expect(scheduledCallbacks).toHaveLength(1)

    scheduledCallbacks[0](0)

    expect(querySelectorAllSpy).not.toHaveBeenCalledWith('[data-rm-editor-type][data-rm-page-number]')
  })

  it('refreshes sparse mounted shell regions immediately before the deferred pass with spacers present', () => {
    const options = createTestOptions()
    const storage = createStorageFromOptions(options)
    storage.pageCount = 4
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    const mountedRegion = createHeaderFooterRegion({
      type: 'footer',
      pageNumber: 2,
      totalPages: 4,
      pageFormat: resolvePageFormat(options.pageFormat),
      options,
      storage,
      extensions: []
    })
    const trailingMountedRegion = createHeaderFooterRegion({
      type: 'header',
      pageNumber: 3,
      totalPages: 4,
      pageFormat: resolvePageFormat(options.pageFormat),
      options,
      storage,
      extensions: []
    })
    const deferredRegion = createHeaderFooterRegion({
      type: 'footer',
      pageNumber: 4,
      totalPages: 4,
      pageFormat: resolvePageFormat(options.pageFormat),
      options,
      storage,
      extensions: []
    })
    const paginationRoot = document.createElement('div')
    const pageBreak = document.createElement('div')
    const spacer = document.createElement('div')

    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutWindowMode = 'windowed'
    viewport.dataset.layoutWindowStart = '1'
    viewport.dataset.layoutWindowEnd = '1'
    viewport.appendChild(editorDom)
    document.body.appendChild(viewport)

    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.dataset.rmTotalPages = '4'
    paginationRoot.dataset.rmMountedStartPage = '2'
    paginationRoot.dataset.rmMountedEndPage = '2'
    pageBreak.className = 'rm-page-break'
    spacer.className = 'rm-page-spacer'
    spacer.dataset.rmPageRangeStart = '3'
    spacer.dataset.rmPageRangeEnd = '4'
    paginationRoot.append(pageBreak, spacer)
    editorDom.append(mountedRegion, trailingMountedRegion, deferredRegion, paginationRoot)

    setStoredVariantContent(storage, 'header', 'default', {
      html: '<p>Mounted shell header</p>',
      json: null
    })
    setStoredVariantContent(storage, 'footer', 'default', {
      html: '<p>Mounted shell footer</p>',
      json: null
    })

    const scheduledCallbacks: FrameRequestCallback[] = []
    const controller = createWindowedHeaderFooterChromeController({
      scheduleFrame: callback => {
        scheduledCallbacks.push(callback)
        return scheduledCallbacks.length
      },
      cancelScheduledFrame: () => undefined
    })

    controller.refresh({
      editorDom,
      options,
      storage,
      shouldRunDeferredRefresh: () => true
    })

    expect(mountedRegion.querySelector('.rm-page-footer-content')?.innerHTML).toContain('Mounted shell footer')
    expect(trailingMountedRegion.querySelector('.rm-page-header-content')?.innerHTML).toContain('Mounted shell header')
    expect(deferredRegion.querySelector('.rm-page-footer-content')?.innerHTML).not.toContain('Mounted shell footer')
    expect(scheduledCallbacks).toHaveLength(1)

    scheduledCallbacks[0](0)

    expect(deferredRegion.querySelector('.rm-page-footer-content')?.innerHTML).toContain('Mounted shell footer')
  })

  it('uses viewport mounted-range metadata when sparse shell DOM lags during refresh', () => {
    const options = createTestOptions()
    const storage = createStorageFromOptions(options)
    storage.pageCount = 3
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    const existingWrapper = createPaginationWrapper({
      totalPages: 3,
      pageFormat: resolvePageFormat(options.pageFormat),
      options,
      storage,
      extensions: [],
      rendererState: {
        activeRange: { startPage: 1, endPage: 1 },
        mountedRange: { startPage: 1, endPage: 1 },
        windowKey: 'window-1',
        placeholderBreakerMetricsByPage: new Map(),
        spacerHeightsByRange: new Map()
      }
    })
    const mountedNextHeader = existingWrapper.querySelector(
      '.rm-page-header-region[data-rm-page-number="2"][data-rm-editor-type="header"]'
    ) as HTMLElement

    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutWindowMode = 'windowed'
    viewport.dataset.layoutWindowStart = '1'
    viewport.dataset.layoutWindowEnd = '1'
    viewport.dataset.layoutMountedStart = '1'
    viewport.dataset.layoutMountedEnd = '2'
    viewport.appendChild(editorDom)
    editorDom.appendChild(existingWrapper)
    document.body.appendChild(viewport)

    setStoredVariantContent(storage, 'header', 'default', {
      html: '<p>Mounted page two header</p>',
      json: null
    })

    const scheduledCallbacks: FrameRequestCallback[] = []
    const controller = createWindowedHeaderFooterChromeController({
      scheduleFrame: callback => {
        scheduledCallbacks.push(callback)
        return scheduledCallbacks.length
      },
      cancelScheduledFrame: () => undefined
    })

    controller.refresh({
      editorDom,
      options,
      storage,
      shouldRunDeferredRefresh: () => true
    })

    expect(mountedNextHeader.querySelector('.rm-page-header-content')?.innerHTML).toContain('Mounted page two header')
    expect(scheduledCallbacks).toHaveLength(1)
  })
})

describe('hydrateWindowedPageBreakShells', () => {
  it('hydrates requested placeholder shells and reapplies renderer window attributes', () => {
    const options = createTestOptions()
    const storage = createStorageFromOptions(options)
    storage.pageCount = 3
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    const wrapper = document.createElement('div')
    wrapper.dataset.rmPagination = 'true'
    wrapper.dataset.rmTotalPages = '3'
    wrapper.appendChild(
      createPageBreakElement({
        pageNumber: 2,
        totalPages: 3,
        pageFormat: resolvePageFormat(options.pageFormat),
        options,
        storage,
        extensions: [],
        activeRange: { startPage: 1, endPage: 1 },
        placeholderBreakerMetrics: {
          breakerHeight: 144,
          footerHeight: 18,
          nextHeaderHeight: 24
        }
      })
    )

    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutWindowMode = 'windowed'
    viewport.dataset.layoutWindowStart = '1'
    viewport.dataset.layoutWindowEnd = '1'
    viewport.dataset.layoutWindowKey = 'window-1'
    viewport.appendChild(editorDom)
    editorDom.appendChild(wrapper)
    document.body.appendChild(viewport)

    const didHydrate = hydrateWindowedPageBreakShells({
      editorDom,
      pageNumbers: [2, 2, 5],
      options,
      storage
    })

    const secondPageBreak = wrapper.firstElementChild as HTMLElement
    const secondBreaker = secondPageBreak.querySelector('.breaker') as HTMLElement
    const footer = secondBreaker.querySelector('.rm-page-footer-region[data-rm-page-number="2"]') as HTMLElement

    expect(didHydrate).toBe(true)
    expect(secondBreaker.dataset.rmBreakerMode).toBeUndefined()
    expect(secondPageBreak.dataset.layoutWindowActive).toBe('false')
    expect(secondPageBreak.dataset.layoutWindowPosition).toBe('after')
    expect(secondPageBreak.dataset.layoutWindowKey).toBe('window-1')
    expect(footer.dataset.layoutWindowActive).toBe('false')
    expect(footer.dataset.layoutWindowPosition).toBe('after')
    expect(footer.dataset.layoutWindowKey).toBe('window-1')
  })
})

describe('renderWindowedPaginationWrapper', () => {
  it('builds a sparse wrapper with mounted page shells and off-window spacers', () => {
    const options = createTestOptions()
    const storage = createStorageFromOptions(options)
    storage.pageCount = 3
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    const existingWrapper = createPaginationWrapper({
      totalPages: 3,
      pageFormat: resolvePageFormat(options.pageFormat),
      options,
      storage,
      extensions: [],
      rendererState: {
        activeRange: { startPage: 1, endPage: 1 },
        mountedRange: { startPage: 1, endPage: 1 },
        windowKey: 'window-1',
        placeholderBreakerMetricsByPage: new Map([
          [
            2,
            {
              breakerHeight: 144,
              footerHeight: 18,
              nextHeaderHeight: 24
            }
          ]
        ]),
        spacerHeightsByRange: new Map()
      }
    })

    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutWindowMode = 'windowed'
    viewport.dataset.layoutWindowStart = '1'
    viewport.dataset.layoutWindowEnd = '1'
    viewport.dataset.layoutMountedStart = '1'
    viewport.dataset.layoutMountedEnd = '2'
    viewport.dataset.layoutWindowKey = 'window-1'
    viewport.appendChild(editorDom)
    editorDom.appendChild(existingWrapper)
    document.body.appendChild(viewport)

    const wrapper = renderWindowedPaginationWrapper({
      editorDom,
      options,
      storage
    })

    const firstBreaker = wrapper.children[0]?.querySelector('.breaker') as HTMLElement
    const secondBreaker = wrapper.children[1]?.querySelector('.breaker') as HTMLElement
    const trailingSpacer = wrapper.querySelector('.rm-page-spacer[data-rm-page-range-start="3"]') as HTMLElement

    expect(wrapper.dataset.rmTotalPages).toBe('3')
    expect(wrapper.dataset.rmMountedStartPage).toBe('1')
    expect(wrapper.dataset.rmMountedEndPage).toBe('2')
    expect(wrapper.querySelectorAll('.rm-page-break')).toHaveLength(2)
    expect(wrapper.querySelectorAll('.rm-page-spacer')).toHaveLength(1)
    expect(firstBreaker.dataset.rmBreakerMode).toBeUndefined()
    expect(secondBreaker.dataset.rmBreakerMode).toBeUndefined()
    expect(trailingSpacer.dataset.rmPageRangeStart).toBe('3')
    expect(trailingSpacer.dataset.rmPageRangeEnd).toBe('3')
  })

  it('preserves an existing spacer height when rerendering the same sparse range', () => {
    const options = createTestOptions()
    const storage = createStorageFromOptions(options)
    storage.pageCount = 3
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    const existingWrapper = createPaginationWrapper({
      totalPages: 3,
      pageFormat: resolvePageFormat(options.pageFormat),
      options,
      storage,
      extensions: [],
      rendererState: {
        activeRange: { startPage: 1, endPage: 1 },
        mountedRange: { startPage: 1, endPage: 1 },
        windowKey: 'window-1',
        placeholderBreakerMetricsByPage: new Map(),
        spacerHeightsByRange: new Map()
      }
    })
    const existingSpacer = existingWrapper.querySelector('.rm-page-spacer[data-rm-page-range-start="2"]') as HTMLElement

    existingSpacer.style.height = '1234px'
    existingSpacer.dataset.rmPageRangeHeight = '1234'

    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutWindowMode = 'windowed'
    viewport.dataset.layoutWindowStart = '1'
    viewport.dataset.layoutWindowEnd = '1'
    viewport.dataset.layoutMountedStart = '1'
    viewport.dataset.layoutMountedEnd = '1'
    viewport.dataset.layoutWindowKey = 'window-1'
    viewport.appendChild(editorDom)
    editorDom.appendChild(existingWrapper)
    document.body.appendChild(viewport)

    const wrapper = renderWindowedPaginationWrapper({
      editorDom,
      options,
      storage
    })
    const trailingSpacer = wrapper.querySelector('.rm-page-spacer[data-rm-page-range-start="2"]') as HTMLElement

    expect(trailingSpacer.style.height).toBe('1234px')
    expect(trailingSpacer.dataset.rmPageRangeHeight).toBe('1234')
  })
})

describe('renderWindowedFirstPageHeader', () => {
  it('renders the standalone first-page header through the renderer path', () => {
    const options = createTestOptions()
    const storage = createStorageFromOptions(options)
    storage.pageCount = 3

    setStoredVariantContent(storage, 'header', 'default', {
      html: '<p>Header title</p>',
      json: null
    })

    const header = renderWindowedFirstPageHeader({
      editorDom: document.createElement('div'),
      options,
      storage
    })

    expect(header.className).toBe('rm-first-page-header')
    expect(header.dataset.rmPageNumber).toBe('1')
    expect(header.querySelector('.rm-page-header-content')?.innerHTML).toContain('Header title')
  })
})

describe('renderWindowedPaginationChrome', () => {
  it('renders the wrapper and standalone first-page header together', () => {
    const options = createTestOptions()
    const storage = createStorageFromOptions(options)
    storage.pageCount = 3
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    const existingWrapper = createPaginationWrapper({
      totalPages: 3,
      pageFormat: resolvePageFormat(options.pageFormat),
      options,
      storage,
      extensions: [],
      rendererState: {
        activeRange: { startPage: 1, endPage: 1 },
        mountedRange: { startPage: 1, endPage: 1 },
        windowKey: 'window-1',
        placeholderBreakerMetricsByPage: new Map([
          [
            2,
            {
              breakerHeight: 144,
              footerHeight: 18,
              nextHeaderHeight: 24
            }
          ]
        ]),
        spacerHeightsByRange: new Map()
      }
    })

    setStoredVariantContent(storage, 'header', 'default', {
      html: '<p>Header title</p>',
      json: null
    })

    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutWindowMode = 'windowed'
    viewport.dataset.layoutWindowStart = '1'
    viewport.dataset.layoutWindowEnd = '1'
    viewport.dataset.layoutWindowKey = 'window-1'
    viewport.appendChild(editorDom)
    editorDom.appendChild(existingWrapper)
    document.body.appendChild(viewport)

    const chrome = renderWindowedPaginationChrome({
      editorDom,
      options,
      storage
    })

    expect(chrome.dataset.rmPaginationChrome).toBe('true')
    expect(chrome.style.display).toBe('contents')
    expect(chrome.querySelector('[data-rm-pagination]')).not.toBeNull()
    expect(chrome.querySelector('.rm-first-page-header')).not.toBeNull()
    expect(chrome.querySelector('.rm-page-header-content')?.innerHTML).toContain('Header title')
    expect(chrome.querySelectorAll('.rm-page-gap')).toHaveLength(1)
    expect(chrome.querySelectorAll('.rm-page-spacer')).toHaveLength(1)
  })
})

describe('createWindowedPaginationRenderer', () => {
  it('coordinates deferred chrome refresh through a single renderer object', () => {
    const options = createTestOptions()
    const storage = createStorageFromOptions(options)
    storage.pageCount = 2
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    const activeRegion = createHeaderFooterRegion({
      type: 'header',
      pageNumber: 1,
      totalPages: 2,
      pageFormat: resolvePageFormat(options.pageFormat),
      options,
      storage,
      extensions: []
    })
    const deferredRegion = createHeaderFooterRegion({
      type: 'header',
      pageNumber: 2,
      totalPages: 2,
      pageFormat: resolvePageFormat(options.pageFormat),
      options,
      storage,
      extensions: []
    })
    const paginationRoot = document.createElement('div')
    const pageBreak = document.createElement('div')
    const breaker = document.createElement('div')

    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutWindowMode = 'windowed'
    viewport.dataset.layoutWindowStart = '1'
    viewport.dataset.layoutWindowEnd = '1'
    paginationRoot.dataset.rmPagination = 'true'
    pageBreak.className = 'rm-page-break'
    breaker.className = 'breaker'
    Object.defineProperty(breaker, 'offsetTop', { configurable: true, value: 120 })
    Object.defineProperty(breaker, 'offsetHeight', { configurable: true, value: 30 })
    pageBreak.appendChild(breaker)
    paginationRoot.appendChild(pageBreak)
    viewport.appendChild(editorDom)
    editorDom.append(activeRegion, deferredRegion, paginationRoot)
    document.body.appendChild(viewport)

    setStoredVariantContent(storage, 'header', 'default', {
      html: '<p>Updated header</p>',
      json: null
    })

    const scheduledCallbacks: FrameRequestCallback[] = []
    const renderer = createWindowedPaginationRenderer({
      scheduleFrame: callback => {
        scheduledCallbacks.push(callback)
        return scheduledCallbacks.length
      },
      cancelScheduledFrame: () => undefined,
      resolveCurrentEditorDom: () => editorDom
    })

    renderer.refreshPresentation({
      editorDom,
      options,
      storage
    })

    expect(activeRegion.querySelector('.rm-page-header-content')?.innerHTML).toContain('Updated header')
    expect(deferredRegion.querySelector('.rm-page-header-content')?.innerHTML).not.toContain('Updated header')
    expect(editorDom.style.minHeight).toBe('152px')
    expect(scheduledCallbacks).toHaveLength(1)

    scheduledCallbacks[0](0)

    expect(deferredRegion.querySelector('.rm-page-header-content')?.innerHTML).toContain('Updated header')
  })

  it('skips deferred refresh when a different editor DOM becomes current', () => {
    const options = createTestOptions()
    const storage = createStorageFromOptions(options)
    storage.pageCount = 2
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    const nextEditorDom = document.createElement('div')
    const deferredRegion = createHeaderFooterRegion({
      type: 'header',
      pageNumber: 2,
      totalPages: 2,
      pageFormat: resolvePageFormat(options.pageFormat),
      options,
      storage,
      extensions: []
    })

    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutWindowMode = 'windowed'
    viewport.dataset.layoutWindowStart = '1'
    viewport.dataset.layoutWindowEnd = '1'
    viewport.appendChild(editorDom)
    editorDom.appendChild(deferredRegion)
    document.body.appendChild(viewport)

    setStoredVariantContent(storage, 'header', 'default', {
      html: '<p>Updated header</p>',
      json: null
    })

    let currentEditorDom: HTMLElement | null = editorDom
    const scheduledCallbacks: FrameRequestCallback[] = []
    const renderer = createWindowedPaginationRenderer({
      scheduleFrame: callback => {
        scheduledCallbacks.push(callback)
        return scheduledCallbacks.length
      },
      cancelScheduledFrame: () => undefined,
      resolveCurrentEditorDom: () => currentEditorDom
    })

    renderer.refreshPresentation({
      editorDom,
      options,
      storage
    })

    currentEditorDom = nextEditorDom
    scheduledCallbacks[0](0)

    expect(deferredRegion.querySelector('.rm-page-header-content')?.innerHTML).not.toContain('Updated header')
  })

  it('refreshes page min-height through the renderer facade', () => {
    const editorDom = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const pageBreak = document.createElement('div')
    const breaker = document.createElement('div')

    paginationRoot.dataset.rmPagination = 'true'
    pageBreak.className = 'rm-page-break'
    breaker.className = 'breaker'
    Object.defineProperty(breaker, 'offsetTop', { configurable: true, value: 90 })
    Object.defineProperty(breaker, 'offsetHeight', { configurable: true, value: 40 })
    pageBreak.appendChild(breaker)
    paginationRoot.appendChild(pageBreak)
    editorDom.appendChild(paginationRoot)

    const renderer = createWindowedPaginationRenderer()

    renderer.refreshLayoutBounds(editorDom)

    expect(editorDom.style.minHeight).toBe('132px')
  })

  it('syncs root presentation styles through the renderer facade', () => {
    const options = createTestOptions()
    const storage = createStorageFromOptions(options)
    const targetDocument = document.implementation.createHTMLDocument('renderer-root')
    const editorDom = targetDocument.createElement('div')
    targetDocument.body.appendChild(editorDom)
    const renderer = createWindowedPaginationRenderer()

    renderer.syncRootPresentation({
      editorDom,
      options,
      storage
    })

    expect(editorDom.classList.contains('rm-pages-root')).toBe(true)
    expect(editorDom.style.width).toBe(`${storage.pageFormat.width}px`)
    expect(editorDom.style.getPropertyValue('--rm-page-height')).toBe(`${storage.pageFormat.height}px`)
    expect(targetDocument.head.querySelector('style[data-rm-pages-style]')).not.toBeNull()
  })

  it('renders combined chrome through the shared renderer facade', () => {
    const options = createTestOptions()
    const storage = createStorageFromOptions(options)
    storage.pageCount = 3
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    const existingWrapper = createPaginationWrapper({
      totalPages: 3,
      pageFormat: resolvePageFormat(options.pageFormat),
      options,
      storage,
      extensions: [],
      rendererState: {
        activeRange: { startPage: 1, endPage: 1 },
        windowKey: 'window-1',
        placeholderBreakerMetricsByPage: new Map([
          [
            2,
            {
              breakerHeight: 144,
              footerHeight: 18,
              nextHeaderHeight: 24
            }
          ]
        ]),
        spacerHeightsByRange: new Map()
      }
    })

    setStoredVariantContent(storage, 'header', 'default', {
      html: '<p>Header title</p>',
      json: null
    })

    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutWindowMode = 'windowed'
    viewport.dataset.layoutWindowStart = '1'
    viewport.dataset.layoutWindowEnd = '1'
    viewport.dataset.layoutWindowKey = 'window-1'
    viewport.appendChild(editorDom)
    editorDom.appendChild(existingWrapper)
    document.body.appendChild(viewport)

    const renderer = createWindowedPaginationRenderer()
    const chrome = renderer.renderChrome({
      editorDom,
      options,
      storage
    })

    expect(chrome.dataset.rmPaginationChrome).toBe('true')
    expect(chrome.querySelector('[data-rm-pagination]')).not.toBeNull()
    expect(chrome.querySelector('.rm-first-page-header')).not.toBeNull()
  })
})
