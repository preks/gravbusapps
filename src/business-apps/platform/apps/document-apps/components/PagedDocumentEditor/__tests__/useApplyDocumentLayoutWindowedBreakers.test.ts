import {
  collectPageBreakers,
  isPlaceholderPageBreaker,
  parkPageBreaker,
  restorePageBreaker,
  shouldMountPageBreaker,
  useApplyDocumentLayoutWindowedBreakers
} from '../hooks/useApplyDocumentLayoutWindowedBreakers'
import { renderHook } from '@testing-library/react'
import type { MutableRefObject } from 'react'

function createPageBreak(pageNumber: number) {
  const pageBreak = document.createElement('div')
  pageBreak.className = 'rm-page-break'

  const page = document.createElement('div')
  page.className = 'page'
  page.dataset.rmPageNumber = String(pageNumber)

  const breaker = document.createElement('div')
  breaker.className = 'breaker'

  const footer = document.createElement('div')
  footer.className = 'rm-page-footer-region'
  footer.dataset.rmPageNumber = String(pageNumber)
  footer.textContent = `Footer ${pageNumber}`

  const gap = document.createElement('div')
  gap.className = 'rm-page-gap'

  const header = document.createElement('div')
  header.className = 'rm-page-header-region'
  header.dataset.rmPageNumber = String(pageNumber + 1)
  header.textContent = `Header ${pageNumber + 1}`

  breaker.append(footer, gap, header)
  pageBreak.append(page, breaker)

  return { pageBreak, breaker, footer, gap, header }
}

describe('collectPageBreakers', () => {
  it('indexes page break elements by their page number', () => {
    const first = createPageBreak(1)
    const second = createPageBreak(2)

    const result = collectPageBreakers([first.pageBreak, second.pageBreak])

    expect(result.get(1)).toBe(first.pageBreak)
    expect(result.get(2)).toBe(second.pageBreak)
  })
})

describe('shouldMountPageBreaker', () => {
  it('keeps a breaker mounted when its next page is active', () => {
    expect(shouldMountPageBreaker(1, new Set([2, 3]))).toBe(true)
  })

  it('parks a breaker only when both its current and next pages are inactive', () => {
    expect(shouldMountPageBreaker(1, new Set([3, 4]))).toBe(false)
  })
})

describe('parkPageBreaker and restorePageBreaker', () => {
  it('parks breaker children and restores them later', () => {
    const parkedBreakers = new WeakMap()
    const { pageBreak, breaker, footer, gap, header } = createPageBreak(3)
    Object.defineProperty(breaker, 'offsetHeight', {
      configurable: true,
      value: 96
    })

    parkPageBreaker(pageBreak, parkedBreakers)

    expect(breaker.dataset.layoutBreakerMounted).toBe('false')
    expect(breaker.style.height).toBe('96px')
    expect(breaker.childNodes).toHaveLength(0)

    restorePageBreaker(pageBreak, parkedBreakers)

    expect(breaker.dataset.layoutBreakerMounted).toBeUndefined()
    expect(breaker.style.height).toBe('')
    expect(Array.from(breaker.childNodes)).toEqual([footer, gap, header])
  })

  it('does not park a breaker containing an active overlay region', () => {
    const parkedBreakers = new WeakMap()
    const { pageBreak, breaker } = createPageBreak(3)
    const activeRegion = breaker.querySelector('.rm-page-footer-region') as HTMLElement
    activeRegion.dataset.rmOverlayActive = 'true'

    parkPageBreaker(pageBreak, parkedBreakers)

    expect(breaker.dataset.layoutBreakerMounted).toBeUndefined()
    expect(breaker.childNodes.length).toBe(3)
  })
})

describe('isPlaceholderPageBreaker', () => {
  it('detects lightweight placeholder breakers', () => {
    const { pageBreak, breaker } = createPageBreak(4)
    breaker.dataset.rmBreakerMode = 'placeholder'

    expect(isPlaceholderPageBreaker(pageBreak)).toBe(true)
  })
})

describe('useApplyDocumentLayoutWindowedBreakers', () => {
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

  it('requests a pagination refresh when the mounted sparse shell range is stale', () => {
    const container = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const firstPage = createPageBreak(1)

    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.appendChild(firstPage.pageBreak)
    container.appendChild(paginationRoot)
    document.body.appendChild(container)

    const refreshPages = jest.fn(() => true)
    const editor = {
      commands: {
        refreshPages
      }
    } as never

    renderHook(() =>
      useApplyDocumentLayoutWindowedBreakers({
        editor,
        editorContainerRef: { current: container } as MutableRefObject<HTMLDivElement | null>,
        layoutNavigationState: {
          boundaryEls: [],
          activeRange: { startPage: 3, endPage: 5 },
          pageBreakEls: [firstPage.pageBreak],
          flowEls: [firstPage.pageBreak]
        },
        viewportModel: {
          source: 'incremental-layout-engine',
          totalPages: 10,
          activeRange: { startPage: 3, endPage: 5 },
          activePageNumbers: [3, 4, 5],
          activePageCount: 3,
          mountedRange: { startPage: 1, endPage: 1 },
          mountedPageNumbers: [1],
          mountedPageCount: 1,
          mountedPageBodyBounds: [],
          activePageBodyBounds: [],
          hasSparseFlow: true,
          isWindowed: true,
          containsCurrentPage: true,
          rangeLabel: '3-5',
          windowKey: 'incremental-layout-engine:3-5:3'
        }
      })
    )

    expect(refreshPages).toHaveBeenCalledTimes(1)
  })

  it('re-requests a stale mounted range even when the window key stays the same', () => {
    const container = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const firstPage = createPageBreak(2)

    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.appendChild(firstPage.pageBreak)
    container.appendChild(paginationRoot)
    document.body.appendChild(container)

    const refreshPages = jest.fn(() => true)
    const editor = {
      commands: {
        refreshPages
      }
    } as never

    const props = {
      editor,
      editorContainerRef: { current: container } as MutableRefObject<HTMLDivElement | null>,
      layoutNavigationState: {
        boundaryEls: [],
        activeRange: { startPage: 3, endPage: 5 },
        pageBreakEls: [firstPage.pageBreak],
        flowEls: [firstPage.pageBreak]
      },
      viewportModel: {
        source: 'incremental-layout-engine' as const,
        totalPages: 10,
        activeRange: { startPage: 3, endPage: 5 },
        activePageNumbers: [3, 4, 5],
        activePageCount: 3,
        mountedRange: { startPage: 2, endPage: 5 },
        mountedPageNumbers: [2, 3, 4, 5],
        mountedPageCount: 4,
        mountedPageBodyBounds: [],
        activePageBodyBounds: [],
        hasSparseFlow: true,
        isWindowed: true,
        containsCurrentPage: true,
        rangeLabel: '3-5',
        windowKey: 'incremental-layout-engine:3-5:3'
      }
    }

    const { rerender } = renderHook(currentProps => useApplyDocumentLayoutWindowedBreakers(currentProps), {
      initialProps: props
    })

    expect(refreshPages).toHaveBeenCalledTimes(0)

    rerender({
      ...props,
      viewportModel: {
        ...props.viewportModel,
        mountedRange: { startPage: 1, endPage: 1 },
        mountedPageNumbers: [1],
        mountedPageCount: 1
      }
    })

    expect(refreshPages).toHaveBeenCalledTimes(1)

    rerender({
      ...props,
      viewportModel: {
        ...props.viewportModel,
        mountedRange: { startPage: 1, endPage: 1 },
        mountedPageNumbers: [1],
        mountedPageCount: 1
      }
    })

    expect(refreshPages).toHaveBeenCalledTimes(1)
  })

  it('keeps all breaker content mounted when the renderer already has full page shells', () => {
    const container = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const firstPage = createPageBreak(1)
    const secondPage = createPageBreak(2)
    const thirdPage = createPageBreak(3)

    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.dataset.rmMountedStartPage = '1'
    paginationRoot.dataset.rmMountedEndPage = '1'
    paginationRoot.append(firstPage.pageBreak, secondPage.pageBreak, thirdPage.pageBreak)
    container.appendChild(paginationRoot)
    document.body.appendChild(container)

    renderHook(() =>
      useApplyDocumentLayoutWindowedBreakers({
        editor: null,
        editorContainerRef: { current: container } as MutableRefObject<HTMLDivElement | null>,
        layoutNavigationState: {
          boundaryEls: [],
          activeRange: { startPage: 1, endPage: 1 },
          pageBreakEls: [firstPage.pageBreak, secondPage.pageBreak, thirdPage.pageBreak],
          flowEls: [firstPage.pageBreak, secondPage.pageBreak, thirdPage.pageBreak]
        },
        viewportModel: {
          source: 'incremental-layout-engine',
          totalPages: 3,
          activeRange: { startPage: 1, endPage: 1 },
          activePageNumbers: [1],
          activePageCount: 1,
          mountedRange: { startPage: 1, endPage: 3 },
          mountedPageNumbers: [1, 2, 3],
          mountedPageCount: 3,
          mountedPageBodyBounds: [],
          activePageBodyBounds: [],
          hasSparseFlow: false,
          isWindowed: true,
          containsCurrentPage: true,
          rangeLabel: '1-1',
          windowKey: 'incremental-layout-engine:1-1:1'
        }
      })
    )

    expect(secondPage.breaker.dataset.layoutBreakerMounted).toBeUndefined()
    expect(secondPage.breaker.childNodes).toHaveLength(3)
    expect(secondPage.gap.isConnected).toBe(true)
    expect(thirdPage.breaker.dataset.layoutBreakerMounted).toBeUndefined()
  })

  it('restores parked breakers when total page count catches up with full page shells', () => {
    const container = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const firstPage = createPageBreak(1)
    const secondPage = createPageBreak(2)
    const thirdPage = createPageBreak(3)

    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.dataset.rmMountedStartPage = '1'
    paginationRoot.dataset.rmMountedEndPage = '1'
    paginationRoot.append(firstPage.pageBreak, secondPage.pageBreak, thirdPage.pageBreak)
    container.appendChild(paginationRoot)
    document.body.appendChild(container)

    const props = {
      editor: null as never,
      editorContainerRef: { current: container } as MutableRefObject<HTMLDivElement | null>,
      layoutNavigationState: {
        boundaryEls: [],
        activeRange: { startPage: 1, endPage: 1 },
        pageBreakEls: [firstPage.pageBreak, secondPage.pageBreak, thirdPage.pageBreak],
        flowEls: [firstPage.pageBreak, secondPage.pageBreak, thirdPage.pageBreak]
      },
      viewportModel: {
        source: 'incremental-layout-engine' as const,
        totalPages: 4,
        activeRange: { startPage: 1, endPage: 1 },
        activePageNumbers: [1],
        activePageCount: 1,
        mountedRange: { startPage: 1, endPage: 1 },
        mountedPageNumbers: [1, 2, 3],
        mountedPageCount: 3,
        mountedPageBodyBounds: [],
        activePageBodyBounds: [],
        hasSparseFlow: true,
        isWindowed: true,
        containsCurrentPage: true,
        rangeLabel: '1-1',
        windowKey: 'incremental-layout-engine:1-1:1'
      }
    }

    const { rerender } = renderHook(currentProps => useApplyDocumentLayoutWindowedBreakers(currentProps), {
      initialProps: props
    })

    expect(secondPage.breaker.dataset.layoutBreakerMounted).toBe('false')

    rerender({
      ...props,
      viewportModel: {
        ...props.viewportModel,
        totalPages: 3,
        hasSparseFlow: false
      }
    })

    expect(secondPage.breaker.dataset.layoutBreakerMounted).toBeUndefined()
    expect(secondPage.breaker.childNodes).toHaveLength(3)
  })

  it('retries placeholder hydration after a stale mounted-range refresh under the same window key', () => {
    const container = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const firstPage = createPageBreak(1)

    firstPage.breaker.dataset.rmBreakerMode = 'placeholder'
    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.appendChild(firstPage.pageBreak)
    container.appendChild(paginationRoot)
    document.body.appendChild(container)

    const refreshPages = jest.fn(() => true)
    const hydratePageBreakShells = jest.fn(() => true)
    const editor = {
      commands: {
        refreshPages,
        hydratePageBreakShells
      }
    } as never

    const props = {
      editor,
      editorContainerRef: { current: container } as MutableRefObject<HTMLDivElement | null>,
      layoutNavigationState: {
        boundaryEls: [],
        activeRange: { startPage: 1, endPage: 1 },
        pageBreakEls: [firstPage.pageBreak],
        flowEls: [firstPage.pageBreak]
      },
      viewportModel: {
        source: 'incremental-layout-engine' as const,
        totalPages: 4,
        activeRange: { startPage: 1, endPage: 1 },
        activePageNumbers: [1],
        activePageCount: 1,
        mountedRange: { startPage: 1, endPage: 1 },
        mountedPageNumbers: [1],
        mountedPageCount: 1,
        mountedPageBodyBounds: [],
        activePageBodyBounds: [],
        hasSparseFlow: true,
        isWindowed: true,
        containsCurrentPage: true,
        rangeLabel: '1-1',
        windowKey: 'incremental-layout-engine:1-1:1'
      }
    }

    const { rerender } = renderHook(currentProps => useApplyDocumentLayoutWindowedBreakers(currentProps), {
      initialProps: props
    })

    expect(hydratePageBreakShells).toHaveBeenCalledTimes(1)

    rerender({
      ...props,
      viewportModel: {
        ...props.viewportModel,
        mountedRange: { startPage: 1, endPage: 2 },
        mountedPageNumbers: [1, 2],
        mountedPageCount: 2
      }
    })

    expect(refreshPages).toHaveBeenCalledTimes(1)

    rerender(props)

    expect(hydratePageBreakShells).toHaveBeenCalledTimes(2)
  })
})
