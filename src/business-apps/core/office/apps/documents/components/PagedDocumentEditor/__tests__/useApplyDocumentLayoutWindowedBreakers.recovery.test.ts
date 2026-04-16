import { renderHook } from '@testing-library/react'
import type { MutableRefObject } from 'react'
import { useApplyDocumentLayoutWindowedBreakers } from '../hooks/useApplyDocumentLayoutWindowedBreakers'

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
  pageBreak.append(page, breaker)

  return { pageBreak, breaker }
}

describe('useApplyDocumentLayoutWindowedBreakers recovery', () => {
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

  it('rebuilds the desired mounted window when the reported mounted range no longer covers the active range', () => {
    const container = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const pageBreaks = Array.from({ length: 41 }, (_unused, index) => createPageBreak(index + 1))
    const hydratePageBreakShells = jest.fn(() => true)

    paginationRoot.dataset.rmPagination = 'true'
    pageBreaks.forEach(({ pageBreak, breaker }, index) => {
      if (index >= 21) {
        pageBreak.dataset.rmPageShellState = 'placeholder'
        breaker.dataset.rmBreakerMode = 'placeholder'
      }
      paginationRoot.appendChild(pageBreak)
    })
    container.appendChild(paginationRoot)
    document.body.appendChild(container)

    renderHook(() =>
      useApplyDocumentLayoutWindowedBreakers({
        editor: { commands: { hydratePageBreakShells } } as never,
        editorContainerRef: { current: container } as MutableRefObject<HTMLDivElement | null>,
        layoutNavigationState: {
          boundaryEls: [],
          activeRange: { startPage: 36, endPage: 40 },
          pageBreakEls: pageBreaks.map(entry => entry.pageBreak),
          flowEls: pageBreaks.map(entry => entry.pageBreak)
        },
        viewportModel: {
          source: 'incremental-layout-engine',
          totalPages: 41,
          activeRange: { startPage: 36, endPage: 40 },
          activePageNumbers: [36, 37, 38, 39, 40],
          activePageCount: 5,
          mountedRange: { startPage: 1, endPage: 21 },
          mountedPageNumbers: Array.from({ length: 21 }, (_unused, index) => index + 1),
          mountedPageCount: 21,
          mountedPageBodyBounds: [],
          activePageBodyBounds: [],
          hasSparseFlow: true,
          isWindowed: true,
          containsCurrentPage: true,
          rangeLabel: '36-40',
          windowKey: 'incremental-layout-engine:36-40:5:1-21:sparse'
        }
      })
    )

    expect(paginationRoot.dataset.rmMountedStartPage).toBe('35')
    expect(paginationRoot.dataset.rmMountedEndPage).toBe('40')
    expect(hydratePageBreakShells).toHaveBeenCalledWith([34, 35, 36, 37, 38, 39, 40])
  })
})
