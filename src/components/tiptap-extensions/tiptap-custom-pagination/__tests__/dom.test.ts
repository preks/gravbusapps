import {
  applyWindowAttributesToPageBreak,
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
  it('creates lightweight placeholder breakers for off-window pages when height hints exist', () => {
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
        ])
      }
    })

    const firstBreaker = wrapper.children[0]?.querySelector('.breaker') as HTMLElement
    const secondBreaker = wrapper.children[1]?.querySelector('.breaker') as HTMLElement

    expect(firstBreaker.childNodes.length).toBeGreaterThan(0)
    expect(secondBreaker.dataset.rmBreakerMode).toBe('placeholder')
    expect(secondBreaker.childNodes).toHaveLength(0)
    expect(secondBreaker.style.height).toBe('144px')
    expect(secondBreaker.dataset.rmBreakerFooterHeight).toBe('18')
    expect(secondBreaker.dataset.rmBreakerNextHeaderHeight).toBe('24')
  })

  it('hydrates a placeholder breaker into full chrome in place', () => {
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
        ])
      }
    })

    const secondPageBreak = wrapper.children[1] as HTMLElement
    const didHydrate = hydratePageBreakElement({
      pageContainer: secondPageBreak,
      pageNumber: 2,
      totalPages: 3,
      pageFormat: resolvePageFormat(options.pageFormat),
      options,
      storage,
      extensions: []
    })

    const secondBreaker = secondPageBreak.querySelector('.breaker') as HTMLElement

    expect(didHydrate).toBe(true)
    expect(secondBreaker.dataset.rmBreakerMode).toBeUndefined()
    expect(secondBreaker.querySelector('.rm-page-footer-region[data-rm-page-number="2"]')).not.toBeNull()
    expect(secondBreaker.querySelector('.rm-page-header-region[data-rm-page-number="3"]')).not.toBeNull()
  })
})

describe('windowed pagination renderer state', () => {
  it('resolves window range and placeholder metrics from the existing pagination DOM', () => {
    const viewport = document.createElement('div')
    const editorDom = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const pageBreak = document.createElement('div')
    const page = document.createElement('div')
    const breaker = document.createElement('div')

    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutWindowStart = '2'
    viewport.dataset.layoutWindowEnd = '4'
    viewport.dataset.layoutWindowKey = 'window-42'
    paginationRoot.dataset.rmPagination = 'true'
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
    editorDom.appendChild(paginationRoot)
    viewport.appendChild(editorDom)
    document.body.appendChild(viewport)

    expect(resolvePaginationWindowRange(editorDom)).toEqual({ startPage: 2, endPage: 4 })
    expect(findPaginationPageBreakElement(editorDom, 2)).toBe(pageBreak)
    expect(resolvePageBreakerPlaceholderMetrics(editorDom).get(2)).toEqual({
      breakerHeight: 144,
      footerHeight: 18,
      nextHeaderHeight: 24
    })
    expect(resolveWindowedPaginationRendererState(editorDom)).toEqual({
      activeRange: { startPage: 2, endPage: 4 },
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
      ])
    })
  })

  it('applies window attributes to the page shell and hydrated regions', () => {
    const pageBreak = document.createElement('div')
    const page = document.createElement('div')
    const body = document.createElement('div')
    const footer = document.createElement('div')
    const header = document.createElement('div')

    pageBreak.className = 'rm-page-break'
    page.className = 'page'
    page.dataset.rmPageNumber = '2'
    body.className = 'rm-page-body-layer'
    body.dataset.rmPageNumber = '2'
    footer.className = 'rm-page-footer-region'
    footer.dataset.rmPageNumber = '2'
    header.className = 'rm-page-header-region'
    header.dataset.rmPageNumber = '3'

    pageBreak.append(page, body, footer, header)

    applyWindowAttributesToPageBreak(pageBreak, { startPage: 2, endPage: 2 }, 'window-7')

    expect(pageBreak.dataset.layoutWindowActive).toBe('true')
    expect(pageBreak.dataset.layoutWindowPosition).toBe('inside')
    expect(pageBreak.dataset.layoutWindowKey).toBe('window-7')
    expect(body.dataset.layoutWindowActive).toBe('true')
    expect(footer.dataset.layoutWindowActive).toBe('true')
    expect(header.dataset.layoutWindowActive).toBe('false')
    expect(header.dataset.layoutWindowPosition).toBe('after')
  })
})
