import {
  applyViewportMarkerAttributes,
  collectViewportMarkerTargets,
  resolveViewportMarkerRefreshRange,
  useApplyDocumentLayoutViewportMarkers
} from '../hooks/useApplyDocumentLayoutViewportMarkers'
import { renderHook } from '@testing-library/react'
import type { MutableRefObject } from 'react'

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
      mountedRange: { startPage: 2, endPage: 4 },
      mountedPageNumbers: [2, 3, 4],
      mountedPageCount: 3,
      mountedPageBodyBounds: [{ pageNumber: 3, top: 120, bottom: 220, left: 10, right: 110 }],
      activePageBodyBounds: [{ pageNumber: 3, top: 120, bottom: 220, left: 10, right: 110 }],
      hasSparseFlow: false,
      isWindowed: true,
      containsCurrentPage: true,
      rangeLabel: '2-4',
      windowKey: 'incremental-layout-engine:2-4:3'
    })

    targets.forEach(target => {
      expect(target.dataset.layoutWindowActive).toBe('true')
      expect(target.dataset.layoutWindowPosition).toBe('inside')
      expect(target.dataset.layoutWindowKey).toBe('incremental-layout-engine:2-4:3')
      expect(target.dataset.layoutBodyTop).toBe('120')
      expect(target.dataset.layoutBodyBottom).toBe('220')
      expect(target.dataset.layoutBodyLeft).toBe('10')
      expect(target.dataset.layoutBodyRight).toBe('110')
    })
  })
})

describe('useApplyDocumentLayoutViewportMarkers', () => {
  const originalRequestAnimationFrame = global.requestAnimationFrame
  const originalCancelAnimationFrame = global.cancelAnimationFrame

  beforeEach(() => {
    global.requestAnimationFrame = callback => {
      callback(0)
      return 1
    }
    global.cancelAnimationFrame = () => undefined
  })

  afterEach(() => {
    global.requestAnimationFrame = originalRequestAnimationFrame
    global.cancelAnimationFrame = originalCancelAnimationFrame
  })

  it('rebuilds marker targets when the first-page header remounts under the same window key', () => {
    const container = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const firstPage = createPageBreak(1)

    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.appendChild(firstPage.pageBreak)
    container.appendChild(paginationRoot)
    document.body.appendChild(container)

    const props = {
      editorContainerRef: { current: container } as MutableRefObject<HTMLDivElement | null>,
      layoutNavigationState: {
        boundaryEls: [],
        activeRange: { startPage: 1, endPage: 1 },
        pageBreakEls: [firstPage.pageBreak],
        flowEls: [firstPage.pageBreak]
      },
      viewportModel: {
        source: 'incremental-layout-engine' as const,
        totalPages: 2,
        activeRange: { startPage: 1, endPage: 1 },
        activePageNumbers: [1],
        activePageCount: 1,
        mountedRange: { startPage: 1, endPage: 1 },
        mountedPageNumbers: [1],
        mountedPageCount: 1,
        mountedPageBodyBounds: [{ pageNumber: 1, top: 100, bottom: 200, left: 10, right: 110 }],
        activePageBodyBounds: [{ pageNumber: 1, top: 100, bottom: 200, left: 10, right: 110 }],
        hasSparseFlow: true,
        isWindowed: true,
        containsCurrentPage: true,
        rangeLabel: '1-1',
        windowKey: 'incremental-layout-engine:1-1:1'
      }
    }

    const { rerender } = renderHook(currentProps => useApplyDocumentLayoutViewportMarkers(currentProps), {
      initialProps: props
    })

    const firstPageHeader = document.createElement('div')
    firstPageHeader.className = 'rm-first-page-header'
    firstPageHeader.dataset.rmPageNumber = '1'
    container.appendChild(firstPageHeader)

    rerender({
      ...props,
      viewportModel: {
        ...props.viewportModel,
        mountedRange: { startPage: 1, endPage: 2 },
        mountedPageNumbers: [1, 2],
        mountedPageCount: 2,
        mountedPageBodyBounds: [{ pageNumber: 1, top: 110, bottom: 210, left: 10, right: 110 }],
        activePageBodyBounds: [{ pageNumber: 1, top: 110, bottom: 210, left: 10, right: 110 }],
        hasSparseFlow: false
      }
    })

    expect(firstPageHeader.dataset.layoutWindowActive).toBe('true')
    expect(firstPageHeader.dataset.layoutWindowPosition).toBe('inside')
    expect(firstPageHeader.dataset.layoutWindowKey).toBe('incremental-layout-engine:1-1:1')
    expect(firstPageHeader.dataset.layoutBodyTop).toBe('110')
  })

  it('rebuilds marker targets when placeholder page-break chrome hydrates in place', () => {
    const container = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const firstPage = createPageBreak(1)

    paginationRoot.dataset.rmPagination = 'true'
    firstPage.header.remove()
    firstPage.footer.remove()
    paginationRoot.appendChild(firstPage.pageBreak)
    container.appendChild(paginationRoot)
    document.body.appendChild(container)

    const props = {
      editorContainerRef: { current: container } as MutableRefObject<HTMLDivElement | null>,
      layoutNavigationState: {
        boundaryEls: [],
        activeRange: { startPage: 1, endPage: 1 },
        pageBreakEls: [firstPage.pageBreak],
        flowEls: [firstPage.pageBreak]
      },
      viewportModel: {
        source: 'incremental-layout-engine' as const,
        totalPages: 2,
        activeRange: { startPage: 1, endPage: 1 },
        activePageNumbers: [1],
        activePageCount: 1,
        mountedRange: { startPage: 1, endPage: 1 },
        mountedPageNumbers: [1],
        mountedPageCount: 1,
        mountedPageBodyBounds: [{ pageNumber: 1, top: 100, bottom: 200, left: 10, right: 110 }],
        activePageBodyBounds: [{ pageNumber: 1, top: 100, bottom: 200, left: 10, right: 110 }],
        hasSparseFlow: true,
        isWindowed: true,
        containsCurrentPage: true,
        rangeLabel: '1-1',
        windowKey: 'incremental-layout-engine:1-1:1'
      }
    }

    const { rerender } = renderHook(currentProps => useApplyDocumentLayoutViewportMarkers(currentProps), {
      initialProps: props
    })

    firstPage.pageBreak.append(firstPage.header, firstPage.footer)

    rerender({
      ...props,
      viewportModel: {
        ...props.viewportModel,
        mountedRange: { startPage: 1, endPage: 2 },
        mountedPageNumbers: [1, 2],
        mountedPageCount: 2,
        mountedPageBodyBounds: [{ pageNumber: 1, top: 130, bottom: 230, left: 10, right: 110 }],
        activePageBodyBounds: [{ pageNumber: 1, top: 130, bottom: 230, left: 10, right: 110 }],
        hasSparseFlow: false
      }
    })

    expect(firstPage.header.dataset.layoutWindowActive).toBe('true')
    expect(firstPage.header.dataset.layoutWindowPosition).toBe('inside')
    expect(firstPage.footer.dataset.layoutWindowKey).toBe('incremental-layout-engine:1-1:1')
    expect(firstPage.footer.dataset.layoutBodyTop).toBe('130')
  })
})
