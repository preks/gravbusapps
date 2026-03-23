import { createHeaderFooterRegion, createPaginationWrapper } from '../dom'
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
})

describe('hydrateWindowedPageBreakShells', () => {
  it('hydrates requested placeholder shells and reapplies renderer window attributes', () => {
    const options = createTestOptions()
    const storage = createStorageFromOptions(options)
    storage.pageCount = 3
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    const wrapper = createPaginationWrapper({
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
        ])
      }
    })

    viewport.className = 'document-editor-viewport'
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

    const secondPageBreak = wrapper.children[1] as HTMLElement
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
  it('builds a wrapper using renderer state derived from the live viewport DOM', () => {
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
        ])
      }
    })

    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutWindowStart = '1'
    viewport.dataset.layoutWindowEnd = '1'
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

    expect(firstBreaker.dataset.rmBreakerMode).toBeUndefined()
    expect(secondBreaker.dataset.rmBreakerMode).toBe('placeholder')
    expect(secondBreaker.dataset.rmBreakerPlaceholderHeight).toBe('144')
    expect(secondBreaker.dataset.rmBreakerFooterHeight).toBe('18')
    expect(secondBreaker.dataset.rmBreakerNextHeaderHeight).toBe('24')
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
        ])
      }
    })

    setStoredVariantContent(storage, 'header', 'default', {
      html: '<p>Header title</p>',
      json: null
    })

    viewport.className = 'document-editor-viewport'
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
        ])
      }
    })

    setStoredVariantContent(storage, 'header', 'default', {
      html: '<p>Header title</p>',
      json: null
    })

    viewport.className = 'document-editor-viewport'
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
