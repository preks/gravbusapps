import {
  applyWindowAttributesToPageBreak,
  createPageBreakElement,
  createHeaderFooterRegion,
  createPaginationWrapper,
  ensurePagesStyles,
  findPaginationPageBreakElement,
  hydratePageBreakElement,
  refreshHeaderFooterRegionDisplay,
  resolvePageBreakerPlaceholderMetrics,
  resolvePaginationWindowRange,
  resolveWindowedPaginationRendererState,
  renderHeaderFooterDisplayContent
} from '../dom'
import { createStorageFromOptions, resolvePageFormat, setStoredVariantContent } from '../utils'

function createTestOptions() {
  return {
    pageFormat: 'A4',
    pageGap: 24,
    headerHeight: 64,
    footerHeight: 64
  }
}

describe('renderHeaderFooterDisplayContent', () => {
  it('preserves trailing empty paragraphs as visible blank lines', () => {
    const content = document.createElement('div')

    renderHeaderFooterDisplayContent(content, '<p>Header text</p><p></p>', 'Header')

    expect(content.dataset.rmEmpty).toBe('false')
    expect(content.querySelectorAll('p')).toHaveLength(2)
    expect(content.querySelectorAll('br[data-rm-display-empty-line="true"]')).toHaveLength(1)
  })

  it('keeps empty content collapsed', () => {
    const content = document.createElement('div')

    renderHeaderFooterDisplayContent(content, '', 'Header')

    expect(content.dataset.rmEmpty).toBe('true')
    expect(content.innerHTML).toBe('')
  })
})

describe('ensurePagesStyles', () => {
  it('includes shared header footer table wrapper, theme, and inline resize styles', () => {
    const targetDocument = document.implementation.createHTMLDocument('pagination-styles')

    ensurePagesStyles(targetDocument)

    const style = targetDocument.head.querySelector('style[data-rm-pages-style]')

    expect(style?.textContent).toContain('.rm-pages-root .rm-page-header-content .tableWrapper')
    expect(style?.textContent).toContain('.rm-pages-root .rm-page-header-content table[data-table-theme="blue"]')
    expect(style?.textContent).toContain('table[data-table-style-header-row="true"] > tbody > tr:first-child > td')
    expect(style?.textContent).toContain('.rm-pages-root .rm-page-header-region[contenteditable="true"]')
    expect(style?.textContent).toContain('.rm-pages-root .rm-first-page-header > .rm-page-header')
    expect(style?.textContent).toContain('.rm-pages-root .rm-page-inline-editor .ProseMirror .tableWrapper')
    expect(style?.textContent).toContain('.rm-pages-root .rm-page-inline-editor .ProseMirror .column-resize-handle')
    expect(style?.textContent).toContain('.rm-pages-root .rm-page-inline-editor .ProseMirror .selectedCell:after')
  })
})

describe('refreshHeaderFooterRegionDisplay', () => {
  it('refreshes an existing region from stored content', () => {
    const options = createTestOptions()
    const storage = createStorageFromOptions(options)
    const region = createHeaderFooterRegion({
      type: 'header',
      pageNumber: 1,
      totalPages: 3,
      pageFormat: resolvePageFormat(options.pageFormat),
      options,
      storage,
      extensions: []
    })

    setStoredVariantContent(storage, 'header', 'default', {
      html: '<p>Updated header</p>',
      json: null
    })

    refreshHeaderFooterRegionDisplay({
      region,
      type: 'header',
      pageNumber: 1,
      totalPages: 3,
      options,
      storage,
      extensions: []
    })

    expect(region.dataset.rmHasVisibleContent).toBe('true')
    expect(region.querySelector('.rm-page-header-content')?.innerHTML).toContain('Updated header')
  })

  it('does not replace the active overlay region content', () => {
    const options = createTestOptions()
    const storage = createStorageFromOptions(options)
    const region = createHeaderFooterRegion({
      type: 'header',
      pageNumber: 1,
      totalPages: 3,
      pageFormat: resolvePageFormat(options.pageFormat),
      options,
      storage,
      extensions: []
    })
    const content = region.querySelector('.rm-page-header-content') as HTMLElement

    content.innerHTML = '<div class="rm-page-inline-editor">Editing</div>'
    region.dataset.rmOverlayActive = 'true'
    setStoredVariantContent(storage, 'header', 'default', {
      html: '<p>Updated header</p>',
      json: null
    })

    refreshHeaderFooterRegionDisplay({
      region,
      type: 'header',
      pageNumber: 1,
      totalPages: 3,
      options,
      storage,
      extensions: []
    })

    expect(content.innerHTML).toContain('rm-page-inline-editor')
    expect(content.innerHTML).not.toContain('Updated header')
  })
})

describe('createPaginationWrapper', () => {
  it('collapses off-window page runs into spacers around the mounted shell range', () => {
    const options = createTestOptions()
    const storage = createStorageFromOptions(options)
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
        ]),
        spacerHeightsByRange: new Map()
      }
    })

    const firstBreaker = wrapper.children[0]?.querySelector('.breaker') as HTMLElement
    const trailingSpacer = wrapper.children[1] as HTMLElement

    expect(wrapper.dataset.rmTotalPages).toBe('3')
    expect(wrapper.dataset.rmMountedStartPage).toBe('1')
    expect(wrapper.dataset.rmMountedEndPage).toBe('1')
    expect(wrapper.querySelectorAll('.rm-page-break')).toHaveLength(1)
    expect(wrapper.querySelectorAll('.rm-page-spacer')).toHaveLength(1)
    expect(firstBreaker.childNodes.length).toBeGreaterThan(0)
    expect(trailingSpacer.className).toBe('rm-page-spacer')
    expect(trailingSpacer.dataset.rmPageRangeStart).toBe('2')
    expect(trailingSpacer.dataset.rmPageRangeEnd).toBe('3')
    expect(trailingSpacer.dataset.rmPageSegmentHeights).toBeTruthy()
    expect(Number.parseFloat(trailingSpacer.style.height)).toBeGreaterThan(144)
  })

  it('hydrates a placeholder breaker into full chrome in place', () => {
    const options = createTestOptions()
    const storage = createStorageFromOptions(options)
    const pageBreak = createPageBreakElement({
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

    expect(pageBreak.dataset.rmPageNumber).toBe('2')

    const didHydrate = hydratePageBreakElement({
      pageContainer: pageBreak,
      pageNumber: 2,
      totalPages: 3,
      pageFormat: resolvePageFormat(options.pageFormat),
      options,
      storage,
      extensions: []
    })

    const secondBreaker = pageBreak.querySelector('.breaker') as HTMLElement

    expect(didHydrate).toBe(true)
    expect(secondBreaker.dataset.rmBreakerMode).toBeUndefined()
    expect(secondBreaker.querySelector('.rm-page-footer-region[data-rm-page-number="2"]')).not.toBeNull()
    expect(secondBreaker.querySelector('.rm-page-header-region[data-rm-page-number="3"]')).not.toBeNull()
  })

  it('creates behind, floating, and front image overlay layers inside each page shell', () => {
    const options = createTestOptions()
    const storage = createStorageFromOptions(options)
    const pageBreak = createPageBreakElement({
      pageNumber: 1,
      totalPages: 2,
      pageFormat: resolvePageFormat(options.pageFormat),
      options,
      storage,
      extensions: [],
      activeRange: { startPage: 1, endPage: 1 },
      placeholderBreakerMetrics: null
    })

    expect(pageBreak.querySelector('.rm-page-image-overlay-layer[data-rm-image-layer="behind"]')).not.toBeNull()
    expect(pageBreak.querySelector('.rm-page-image-overlay-layer[data-rm-image-layer="floating"]')).not.toBeNull()
    expect(pageBreak.querySelector('.rm-page-image-overlay-layer[data-rm-image-layer="front"]')).not.toBeNull()
  })

  it('renders leading and trailing spacers when the mounted window sits in the middle', () => {
    const options = createTestOptions()
    const storage = createStorageFromOptions(options)
    const wrapper = createPaginationWrapper({
      totalPages: 5,
      pageFormat: resolvePageFormat(options.pageFormat),
      options,
      storage,
      extensions: [],
      rendererState: {
        activeRange: { startPage: 3, endPage: 3 },
        windowKey: 'window-3',
        placeholderBreakerMetricsByPage: new Map(),
        spacerHeightsByRange: new Map()
      }
    })

    const pageBreaks = wrapper.querySelectorAll('.rm-page-break')
    const spacers = wrapper.querySelectorAll('.rm-page-spacer')

    expect(wrapper.dataset.rmMountedStartPage).toBe('2')
    expect(wrapper.dataset.rmMountedEndPage).toBe('3')
    expect(pageBreaks).toHaveLength(2)
    expect(spacers).toHaveLength(2)
    expect((spacers[0] as HTMLElement).dataset.rmPageRangeStart).toBe('1')
    expect((spacers[0] as HTMLElement).dataset.rmPageRangeEnd).toBe('1')
    expect((spacers[1] as HTMLElement).dataset.rmPageRangeStart).toBe('4')
    expect((spacers[1] as HTMLElement).dataset.rmPageRangeEnd).toBe('5')
  })

  it('prefers explicit mounted-range metadata over the active-range fallback', () => {
    const options = createTestOptions()
    const storage = createStorageFromOptions(options)
    const wrapper = createPaginationWrapper({
      totalPages: 5,
      pageFormat: resolvePageFormat(options.pageFormat),
      options,
      storage,
      extensions: [],
      rendererState: {
        activeRange: { startPage: 3, endPage: 3 },
        mountedRange: { startPage: 2, endPage: 4 },
        windowKey: 'window-3',
        placeholderBreakerMetricsByPage: new Map(),
        spacerHeightsByRange: new Map()
      }
    })

    const pageBreaks = wrapper.querySelectorAll('.rm-page-break')
    const spacers = wrapper.querySelectorAll('.rm-page-spacer')

    expect(wrapper.dataset.rmMountedStartPage).toBe('2')
    expect(wrapper.dataset.rmMountedEndPage).toBe('4')
    expect(pageBreaks).toHaveLength(3)
    expect(spacers).toHaveLength(2)
    expect((pageBreaks[2]?.querySelector('.breaker') as HTMLElement | null)?.dataset.rmBreakerMode).toBeUndefined()
    expect((spacers[0] as HTMLElement).dataset.rmPageRangeStart).toBe('1')
    expect((spacers[0] as HTMLElement).dataset.rmPageRangeEnd).toBe('1')
    expect((spacers[1] as HTMLElement).dataset.rmPageRangeStart).toBe('5')
    expect((spacers[1] as HTMLElement).dataset.rmPageRangeEnd).toBe('5')
  })
})

describe('windowed pagination renderer state', () => {
  it('resolves window range and placeholder metrics from the existing pagination DOM', () => {
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    const paginationChrome = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const pageBreak = document.createElement('div')
    const page = document.createElement('div')
    const breaker = document.createElement('div')
    const querySelectorSpy = jest.spyOn(editorDom, 'querySelector')
    const querySelectorAllSpy = jest.spyOn(editorDom, 'querySelectorAll')
    const pageBreakQuerySelectorSpy = jest.spyOn(pageBreak, 'querySelector')

    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutWindowMode = 'windowed'
    viewport.dataset.layoutWindowStart = '2'
    viewport.dataset.layoutWindowEnd = '4'
    viewport.dataset.layoutMountedStart = '2'
    viewport.dataset.layoutMountedEnd = '2'
    viewport.dataset.layoutWindowKey = 'window-42'
    paginationChrome.dataset.rmPaginationChrome = 'true'
    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.dataset.rmMountedStartPage = '2'
    paginationRoot.dataset.rmMountedEndPage = '2'
    pageBreak.className = 'rm-page-break'
    page.className = 'page'
    page.dataset.rmPageNumber = '2'
    breaker.className = 'breaker'
    breaker.dataset.rmBreakerMode = 'placeholder'
    breaker.dataset.rmBreakerPlaceholderHeight = '144'
    breaker.dataset.rmBreakerFooterHeight = '18'
    breaker.dataset.rmBreakerNextHeaderHeight = '24'

    pageBreak.append(page, breaker)
    paginationRoot.appendChild(pageBreak)
    paginationChrome.appendChild(paginationRoot)
    editorDom.appendChild(paginationChrome)
    viewport.appendChild(editorDom)
    document.body.appendChild(viewport)

    expect(resolvePaginationWindowRange(editorDom)).toEqual({ startPage: 2, endPage: 4 })
    expect(findPaginationPageBreakElement(editorDom, 2)).toBe(pageBreak)
    querySelectorAllSpy.mockClear()
    pageBreakQuerySelectorSpy.mockClear()
    expect(resolvePageBreakerPlaceholderMetrics(editorDom).get(2)).toEqual({
      breakerHeight: 144,
      footerHeight: 18,
      nextHeaderHeight: 24
    })
    expect(resolveWindowedPaginationRendererState(editorDom)).toEqual({
      activeRange: { startPage: 2, endPage: 4 },
      mountedRange: { startPage: 2, endPage: 2 },
      windowKey: 'window-42',
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
    })
    expect(querySelectorAllSpy).not.toHaveBeenCalledWith('[data-rm-pagination] > .rm-page-break')
    expect(querySelectorSpy).not.toHaveBeenCalledWith('[data-rm-pagination]')
    expect(pageBreakQuerySelectorSpy).not.toHaveBeenCalledWith(
      '[data-rm-editor-type="footer"][data-rm-page-number="2"]'
    )
    expect(pageBreakQuerySelectorSpy).not.toHaveBeenCalledWith(
      '[data-rm-editor-type="header"][data-rm-page-number="3"]'
    )
  })

  it('ignores viewport window bounds when the viewport is in full mode', () => {
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')

    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutWindowMode = 'full'
    viewport.dataset.layoutWindowStart = '2'
    viewport.dataset.layoutWindowEnd = '4'
    viewport.appendChild(editorDom)
    document.body.appendChild(viewport)

    expect(resolvePaginationWindowRange(editorDom)).toBeNull()
  })

  it('reads existing spacer heights into the renderer state', () => {
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const spacer = document.createElement('div')

    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutWindowMode = 'windowed'
    viewport.dataset.layoutWindowStart = '1'
    viewport.dataset.layoutWindowEnd = '1'
    viewport.dataset.layoutMountedStart = '1'
    viewport.dataset.layoutMountedEnd = '1'
    viewport.appendChild(editorDom)
    document.body.appendChild(viewport)

    paginationRoot.dataset.rmPagination = 'true'
    spacer.className = 'rm-page-spacer'
    spacer.dataset.rmPageRangeStart = '2'
    spacer.dataset.rmPageRangeEnd = '4'
    spacer.dataset.rmPageRangeHeight = '1234'
    spacer.style.height = '1234px'
    paginationRoot.appendChild(spacer)
    editorDom.appendChild(paginationRoot)

    expect(resolveWindowedPaginationRendererState(editorDom).spacerHeightsByRange).toEqual(new Map([['2-4', 1234]]))
  })

  it('uses ordered pagination children when resolving a page break', () => {
    const editorDom = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const firstPageBreak = document.createElement('div')
    const firstPage = document.createElement('div')
    const secondPageBreak = document.createElement('div')
    const secondPage = document.createElement('div')
    const querySelectorAllSpy = jest.spyOn(editorDom, 'querySelectorAll')

    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.dataset.rmTotalPages = '2'
    paginationRoot.dataset.rmMountedStartPage = '1'
    paginationRoot.dataset.rmMountedEndPage = '2'
    firstPageBreak.className = 'rm-page-break'
    firstPage.className = 'page'
    firstPage.dataset.rmPageNumber = '1'
    secondPageBreak.className = 'rm-page-break'
    secondPage.className = 'page'
    secondPage.dataset.rmPageNumber = '2'

    firstPageBreak.appendChild(firstPage)
    secondPageBreak.appendChild(secondPage)
    paginationRoot.append(firstPageBreak, secondPageBreak)
    editorDom.appendChild(paginationRoot)

    expect(findPaginationPageBreakElement(editorDom, 2)).toBe(secondPageBreak)
    expect(querySelectorAllSpy).not.toHaveBeenCalledWith('[data-rm-pagination] > .rm-page-break')
  })

  it('uses viewport mounted-range metadata when direct shell DOM is still catching up', () => {
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const firstPageBreak = document.createElement('div')
    const firstPage = document.createElement('div')
    const secondPageBreak = document.createElement('div')
    const secondPage = document.createElement('div')
    const firstPageBreakQuerySelectorSpy = jest.spyOn(firstPageBreak, 'querySelector')
    const secondPageBreakQuerySelectorSpy = jest.spyOn(secondPageBreak, 'querySelector')

    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutMountedStart = '2'
    viewport.dataset.layoutMountedEnd = '4'
    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.dataset.rmMountedStartPage = '2'
    paginationRoot.dataset.rmMountedEndPage = '4'
    firstPageBreak.className = 'rm-page-break'
    firstPage.className = 'page'
    firstPage.dataset.rmPageNumber = '2'
    secondPageBreak.className = 'rm-page-break'
    secondPage.className = 'page'
    secondPage.dataset.rmPageNumber = '3'

    firstPageBreak.appendChild(firstPage)
    secondPageBreak.appendChild(secondPage)
    paginationRoot.append(firstPageBreak, secondPageBreak)
    editorDom.appendChild(paginationRoot)
    viewport.appendChild(editorDom)

    expect(findPaginationPageBreakElement(editorDom, 3)).toBe(secondPageBreak)
    expect(firstPageBreakQuerySelectorSpy).not.toHaveBeenCalledWith('.page[data-rm-page-number]')
    expect(secondPageBreakQuerySelectorSpy).toHaveBeenCalledWith('.page[data-rm-page-number]')
  })

  it('applies window attributes to the page shell and hydrated regions', () => {
    const pageBreak = document.createElement('div')
    const page = document.createElement('div')
    const body = document.createElement('div')
    const imageOverlay = document.createElement('div')
    const footer = document.createElement('div')
    const header = document.createElement('div')

    pageBreak.className = 'rm-page-break'
    page.className = 'page'
    page.dataset.rmPageNumber = '2'
    body.className = 'rm-page-body-layer'
    body.dataset.rmPageNumber = '2'
    imageOverlay.className = 'rm-page-image-overlay-layer'
    imageOverlay.dataset.rmPageNumber = '2'
    imageOverlay.dataset.rmImageLayer = 'behind'
    footer.className = 'rm-page-footer-region'
    footer.dataset.rmPageNumber = '2'
    header.className = 'rm-page-header-region'
    header.dataset.rmPageNumber = '3'

    pageBreak.append(page, body, imageOverlay, footer, header)

    applyWindowAttributesToPageBreak(pageBreak, { startPage: 2, endPage: 2 }, 'window-7')

    expect(pageBreak.dataset.layoutWindowActive).toBe('true')
    expect(pageBreak.dataset.layoutWindowPosition).toBe('inside')
    expect(pageBreak.dataset.layoutWindowKey).toBe('window-7')
    expect(body.dataset.layoutWindowActive).toBe('true')
    expect(imageOverlay.dataset.layoutWindowActive).toBe('true')
    expect(footer.dataset.layoutWindowActive).toBe('true')
    expect(header.dataset.layoutWindowActive).toBe('false')
    expect(header.dataset.layoutWindowPosition).toBe('after')
  })
})
