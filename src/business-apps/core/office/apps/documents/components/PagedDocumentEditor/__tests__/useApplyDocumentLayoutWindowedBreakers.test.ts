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
  pageBreak.dataset.rmPageNumber = String(pageNumber)
  pageBreak.dataset.rmPageShellState = 'hydrated'

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
    document.body.innerHTML = ''
  })

  it('updates mounted-range metadata and parks off-window page shells in place', () => {
    const container = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const firstPage = createPageBreak(1)
    const secondPage = createPageBreak(2)
    const thirdPage = createPageBreak(3)

    paginationRoot.dataset.rmPagination = 'true'
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

    expect(paginationRoot.dataset.rmMountedStartPage).toBe('1')
    expect(paginationRoot.dataset.rmMountedEndPage).toBe('1')
    expect(firstPage.pageBreak.dataset.rmPageShellState).toBe('hydrated')
    expect(secondPage.pageBreak.dataset.rmPageShellState).toBe('placeholder')
    expect(secondPage.breaker.dataset.rmBreakerMode).toBe('placeholder')
    expect(secondPage.breaker.dataset.layoutBreakerMounted).toBe('false')
    expect(secondPage.breaker.childNodes).toHaveLength(0)
    expect(thirdPage.pageBreak.dataset.rmPageShellState).toBe('placeholder')
  })

  it('restores parked breakers when they re-enter the hydrated window', () => {
    const container = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const firstPage = createPageBreak(1)
    const secondPage = createPageBreak(2)
    const thirdPage = createPageBreak(3)

    paginationRoot.dataset.rmPagination = 'true'
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
    }

    const { rerender } = renderHook(currentProps => useApplyDocumentLayoutWindowedBreakers(currentProps), {
      initialProps: props
    })

    expect(secondPage.breaker.dataset.layoutBreakerMounted).toBe('false')
    expect(secondPage.breaker.childNodes).toHaveLength(0)

    rerender({
      ...props,
      layoutNavigationState: {
        ...props.layoutNavigationState,
        activeRange: { startPage: 2, endPage: 2 }
      },
      viewportModel: {
        ...props.viewportModel,
        activeRange: { startPage: 2, endPage: 2 },
        activePageNumbers: [2],
        activePageCount: 1,
        mountedRange: { startPage: 1, endPage: 2 },
        mountedPageNumbers: [1, 2],
        mountedPageCount: 2,
        rangeLabel: '2-2',
        windowKey: 'incremental-layout-engine:2-2:1'
      }
    })

    expect(paginationRoot.dataset.rmMountedStartPage).toBe('1')
    expect(paginationRoot.dataset.rmMountedEndPage).toBe('2')
    expect(secondPage.pageBreak.dataset.rmPageShellState).toBe('hydrated')
    expect(secondPage.breaker.dataset.layoutBreakerMounted).toBeUndefined()
    expect(secondPage.breaker.dataset.rmBreakerMode).toBeUndefined()
    expect(secondPage.breaker.childNodes).toHaveLength(3)
    expect(thirdPage.pageBreak.dataset.rmPageShellState).toBe('placeholder')
  })

  it('hydrates only placeholder shells that enter the desired window', () => {
    const container = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const firstPage = createPageBreak(1)
    const secondPage = createPageBreak(2)
    const thirdPage = createPageBreak(3)

    secondPage.pageBreak.dataset.rmPageShellState = 'placeholder'
    secondPage.breaker.dataset.rmBreakerMode = 'placeholder'
    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.append(firstPage.pageBreak, secondPage.pageBreak, thirdPage.pageBreak)
    container.appendChild(paginationRoot)
    document.body.appendChild(container)

    const props = {
      editor: {
        commands: {
          hydratePageBreakShells: jest.fn(() => true)
        }
      } as never,
      editorContainerRef: { current: container } as MutableRefObject<HTMLDivElement | null>,
      layoutNavigationState: {
        boundaryEls: [],
        activeRange: { startPage: 2, endPage: 2 },
        pageBreakEls: [firstPage.pageBreak, secondPage.pageBreak, thirdPage.pageBreak],
        flowEls: [firstPage.pageBreak, secondPage.pageBreak, thirdPage.pageBreak]
      },
      viewportModel: {
        source: 'incremental-layout-engine' as const,
        totalPages: 3,
        activeRange: { startPage: 2, endPage: 2 },
        activePageNumbers: [2],
        activePageCount: 1,
        mountedRange: { startPage: 1, endPage: 3 },
        mountedPageNumbers: [1, 2, 3],
        mountedPageCount: 3,
        mountedPageBodyBounds: [],
        activePageBodyBounds: [],
        hasSparseFlow: false,
        isWindowed: true,
        containsCurrentPage: true,
        rangeLabel: '2-2',
        windowKey: 'incremental-layout-engine:2-2:1'
      }
    }

    const { rerender } = renderHook(currentProps => useApplyDocumentLayoutWindowedBreakers(currentProps), {
      initialProps: props
    })

    const hydratePageBreakShells = (
      props.editor as {
        commands: { hydratePageBreakShells: jest.Mock }
      }
    ).commands.hydratePageBreakShells

    expect(hydratePageBreakShells).toHaveBeenCalledTimes(1)
    expect(hydratePageBreakShells).toHaveBeenCalledWith([2])
    expect(thirdPage.pageBreak.dataset.rmPageShellState).toBe('placeholder')

    rerender(props)

    expect(hydratePageBreakShells).toHaveBeenCalledTimes(1)
  })

  it('restores parked breakers and hydrates remaining placeholders when leaving windowed mode', () => {
    const container = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const firstPage = createPageBreak(1)
    const secondPage = createPageBreak(2)
    const thirdPage = createPageBreak(3)

    thirdPage.pageBreak.dataset.rmPageShellState = 'placeholder'
    thirdPage.breaker.dataset.rmBreakerMode = 'placeholder'
    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.append(firstPage.pageBreak, secondPage.pageBreak, thirdPage.pageBreak)
    container.appendChild(paginationRoot)
    document.body.appendChild(container)

    const hydratePageBreakShells = jest.fn(() => true)
    const props = {
      editor: {
        commands: {
          hydratePageBreakShells
        }
      } as never,
      editorContainerRef: { current: container } as MutableRefObject<HTMLDivElement | null>,
      layoutNavigationState: {
        boundaryEls: [],
        activeRange: { startPage: 1, endPage: 1 },
        pageBreakEls: [firstPage.pageBreak, secondPage.pageBreak, thirdPage.pageBreak],
        flowEls: [firstPage.pageBreak, secondPage.pageBreak, thirdPage.pageBreak]
      },
      viewportModel: {
        source: 'incremental-layout-engine' as const,
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
    }

    const { rerender } = renderHook(currentProps => useApplyDocumentLayoutWindowedBreakers(currentProps), {
      initialProps: props
    })

    expect(secondPage.breaker.dataset.layoutBreakerMounted).toBe('false')
    expect(hydratePageBreakShells).toHaveBeenCalledTimes(0)

    rerender({
      ...props,
      viewportModel: {
        ...props.viewportModel,
        isWindowed: false,
        windowKey: 'incremental-layout-engine:full:3'
      }
    })

    expect(paginationRoot.dataset.rmMountedStartPage).toBe('1')
    expect(paginationRoot.dataset.rmMountedEndPage).toBe('3')
    expect(secondPage.pageBreak.dataset.rmPageShellState).toBe('hydrated')
    expect(secondPage.breaker.dataset.layoutBreakerMounted).toBeUndefined()
    expect(secondPage.breaker.childNodes).toHaveLength(3)
    expect(hydratePageBreakShells).toHaveBeenCalledTimes(1)
    expect(hydratePageBreakShells).toHaveBeenCalledWith([3])
  })
})
