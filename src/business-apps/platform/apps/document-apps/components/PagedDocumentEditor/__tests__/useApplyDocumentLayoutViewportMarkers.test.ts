import {
  applyViewportMarkerAttributes,
  collectViewportMarkerTargets,
  resolveViewportMarkerRefreshRange
} from '../hooks/useApplyDocumentLayoutViewportMarkers'

function createPageBreak(pageNumber: number) {
  const pageBreak = document.createElement('div')
  pageBreak.className = 'rm-page-break'

  const page = document.createElement('div')
  page.className = 'page'
  page.dataset.rmPageNumber = String(pageNumber)

  const bodyLayer = document.createElement('div')
  bodyLayer.className = 'rm-page-body-layer'
  bodyLayer.dataset.rmPageNumber = String(pageNumber)

  const header = document.createElement('div')
  header.className = 'rm-page-header-region'
  header.dataset.rmPageNumber = String(pageNumber)

  const footer = document.createElement('div')
  footer.className = 'rm-page-footer-region'
  footer.dataset.rmPageNumber = String(pageNumber)

  pageBreak.append(page, bodyLayer, header, footer)
  return { pageBreak, page, bodyLayer, header, footer }
}

describe('collectViewportMarkerTargets', () => {
  it('indexes marker targets by page number from page break elements', () => {
    const firstPage = createPageBreak(1)
    const secondPage = createPageBreak(2)
    const firstPageHeader = document.createElement('div')
    firstPageHeader.className = 'rm-first-page-header'
    firstPageHeader.dataset.rmPageNumber = '1'

    const result = collectViewportMarkerTargets([firstPage.pageBreak, secondPage.pageBreak], firstPageHeader)

    expect(result.get(1)).toEqual([
      firstPage.pageBreak,
      firstPage.page,
      firstPage.bodyLayer,
      firstPage.header,
      firstPage.footer,
      firstPageHeader
    ])
    expect(result.get(2)).toEqual([
      secondPage.pageBreak,
      secondPage.page,
      secondPage.bodyLayer,
      secondPage.header,
      secondPage.footer
    ])
  })
})

describe('resolveViewportMarkerRefreshRange', () => {
  it('returns null when the active range did not change', () => {
    expect(resolveViewportMarkerRefreshRange({ startPage: 2, endPage: 4 }, { startPage: 2, endPage: 4 })).toBeNull()
  })

  it('returns the combined changed band between previous and next active ranges', () => {
    expect(resolveViewportMarkerRefreshRange({ startPage: 2, endPage: 4 }, { startPage: 5, endPage: 7 })).toEqual({
      startPage: 2,
      endPage: 7
    })
  })
})

describe('applyViewportMarkerAttributes', () => {
  it('applies active state, position, and window key to page targets', () => {
    const { pageBreak, page } = createPageBreak(3)
    const targets = [pageBreak, page]

    applyViewportMarkerAttributes(targets, 3, {
      source: 'incremental-layout-engine',
      totalPages: 10,
      activeRange: { startPage: 2, endPage: 4 },
      activePageNumbers: [2, 3, 4],
      activePageCount: 3,
      isWindowed: true,
      containsCurrentPage: true,
      rangeLabel: '2-4',
      windowKey: 'incremental-layout-engine:2-4:3'
    })

    targets.forEach(target => {
      expect(target.dataset.layoutWindowActive).toBe('true')
      expect(target.dataset.layoutWindowPosition).toBe('inside')
      expect(target.dataset.layoutWindowKey).toBe('incremental-layout-engine:2-4:3')
    })
  })
})
