import {
  collectPageChromeRegions,
  parkChromeRegion,
  resolveEffectiveChromeActivePageNumbers,
  restoreChromeRegion,
  useApplyDocumentLayoutWindowedChrome
} from '../hooks/useApplyDocumentLayoutWindowedChrome'
import { renderHook } from '@testing-library/react'
import type { MutableRefObject } from 'react'

function createChromeRegion(className: string, pageNumber: number, contentHtml: string) {
  const region = document.createElement('div')
  region.className = className
  region.dataset.rmPageNumber = String(pageNumber)
  region.dataset.rmEditorType = className.includes('footer') ? 'footer' : 'header'

  const shell = document.createElement('div')
  shell.className = className.includes('footer') ? 'rm-page-footer' : 'rm-page-header'
  const layout = document.createElement('div')
  layout.className = 'rm-page-region-layout'
  layout.dataset.rmPageNumberLayout = 'true'

  const content = document.createElement('div')
  content.className = className.includes('footer') ? 'rm-page-footer-content' : 'rm-page-header-content'
  content.innerHTML = contentHtml

  const slot = document.createElement('div')
  slot.dataset.rmPageNumberSlot = 'true'
  slot.textContent = '1'

  layout.append(content, slot)
  shell.append(layout)
  region.append(shell)
  return { region, content, slot }
}

function createPageBreak(pageNumber: number) {
  const pageBreak = document.createElement('div')
  pageBreak.className = 'rm-page-break'

  const page = document.createElement('div')
  page.className = 'page'
  page.dataset.rmPageNumber = String(pageNumber)

  const footer = createChromeRegion('rm-page-footer-region', pageNumber, `<p>Footer ${pageNumber}</p>`)
  const nextHeader = createChromeRegion('rm-page-header-region', pageNumber + 1, `<p>Header ${pageNumber + 1}</p>`)
  const breaker = document.createElement('div')
  breaker.className = 'breaker'
  breaker.append(footer.region, nextHeader.region)

  pageBreak.append(page, breaker)
  return { pageBreak, footer, nextHeader }
}

describe('resolveEffectiveChromeActivePageNumbers', () => {
  it('includes page 1 when page 1 remains mounted', () => {
    const active = resolveEffectiveChromeActivePageNumbers({
      activePageNumbers: [2],
      mountedPageNumbers: [1, 2]
    })
    expect(active.has(1)).toBe(true)
    expect(active.has(2)).toBe(true)
  })

  it('does not add page 1 when page 1 is not mounted', () => {
    const active = resolveEffectiveChromeActivePageNumbers({
      activePageNumbers: [2],
      mountedPageNumbers: [2]
    })
    expect(active.has(1)).toBe(false)
  })
})

describe('collectPageChromeRegions', () => {
  it('indexes footer, next-page header, and first page header by logical page number', () => {
    const first = createPageBreak(1)
    const second = createPageBreak(2)
    const firstPageHeader = createChromeRegion('rm-first-page-header', 1, '<p>First page header</p>')

    const result = collectPageChromeRegions([first.pageBreak, second.pageBreak], firstPageHeader.region)

    expect(result.get(1)).toEqual([first.footer.region, firstPageHeader.region])
    expect(result.get(2)).toEqual([first.nextHeader.region, second.footer.region])
    expect(result.get(3)).toEqual([second.nextHeader.region])
  })
})

describe('parkChromeRegion and restoreChromeRegion', () => {
  it('detaches heavy content and restores it later', () => {
    const parkedRegions = new WeakMap()
    const { region, content, slot } = createChromeRegion('rm-page-header-region', 2, '<p>Header 2</p>')
    Object.defineProperty(region, 'offsetHeight', {
      configurable: true,
      value: 48
    })

    parkChromeRegion(region, parkedRegions)

    expect(region.dataset.layoutChromeMounted).toBe('false')
    expect(region.style.height).toBe('48px')
    expect(content.childNodes).toHaveLength(0)
    expect(slot.isConnected).toBe(false)

    restoreChromeRegion(region, parkedRegions)

    expect(region.dataset.layoutChromeMounted).toBeUndefined()
    expect(region.style.height).toBe('')
    expect(content.innerHTML).toContain('Header 2')
    expect(region.querySelector('[data-rm-page-number-slot="true"]')).toBe(slot)
  })

  it('does not park an active overlay region', () => {
    const parkedRegions = new WeakMap()
    const { region, content } = createChromeRegion('rm-page-footer-region', 2, '<p>Footer 2</p>')
    region.dataset.rmOverlayActive = 'true'

    parkChromeRegion(region, parkedRegions)

    expect(region.dataset.layoutChromeMounted).toBeUndefined()
    expect(content.innerHTML).toContain('Footer 2')
  })

  it('does not park the first-page header region', () => {
    const parkedRegions = new WeakMap()
    const { region, content } = createChromeRegion('rm-first-page-header', 1, '<p>First</p>')

    parkChromeRegion(region, parkedRegions)

    expect(region.dataset.layoutChromeMounted).toBeUndefined()
    expect(content.innerHTML).toContain('First')
  })
})

describe('useApplyDocumentLayoutWindowedChrome', () => {
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

  it('keeps chrome content mounted when full page shells are still present', () => {
    const container = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const first = createPageBreak(1)
    const second = createPageBreak(2)
    const third = createPageBreak(3)

    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.append(first.pageBreak, second.pageBreak, third.pageBreak)
    container.appendChild(paginationRoot)
    document.body.appendChild(container)

    renderHook(() =>
      useApplyDocumentLayoutWindowedChrome({
        editorContainerRef: { current: container } as MutableRefObject<HTMLDivElement | null>,
        layoutNavigationState: {
          boundaryEls: [],
          activeRange: { startPage: 1, endPage: 1 },
          pageBreakEls: [first.pageBreak, second.pageBreak, third.pageBreak],
          flowEls: [first.pageBreak, second.pageBreak, third.pageBreak]
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

    expect(first.footer.region.dataset.layoutChromeMounted).toBeUndefined()
    expect(second.footer.content.innerHTML).toContain('Footer 2')
    expect(second.nextHeader.region.dataset.layoutChromeMounted).toBeUndefined()
    expect(third.footer.content.innerHTML).toContain('Footer 3')
  })

  it('restores parked chrome when total page count catches up with full page shells', () => {
    const container = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const first = createPageBreak(1)
    const second = createPageBreak(2)
    const third = createPageBreak(3)

    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.append(first.pageBreak, second.pageBreak, third.pageBreak)
    container.appendChild(paginationRoot)
    document.body.appendChild(container)

    const props = {
      editorContainerRef: { current: container } as MutableRefObject<HTMLDivElement | null>,
      layoutNavigationState: {
        boundaryEls: [],
        activeRange: { startPage: 1, endPage: 1 },
        pageBreakEls: [first.pageBreak, second.pageBreak, third.pageBreak],
        flowEls: [first.pageBreak, second.pageBreak, third.pageBreak]
      },
      viewportModel: {
        source: 'incremental-layout-engine' as const,
        totalPages: 4,
        activeRange: { startPage: 1, endPage: 1 },
        activePageNumbers: [1],
        activePageCount: 1,
        mountedRange: { startPage: 1, endPage: 3 },
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

    const { rerender } = renderHook(currentProps => useApplyDocumentLayoutWindowedChrome(currentProps), {
      initialProps: props
    })

    expect(second.footer.region.dataset.layoutChromeMounted).toBe('false')

    rerender({
      ...props,
      viewportModel: {
        ...props.viewportModel,
        totalPages: 3,
        hasSparseFlow: false
      }
    })

    expect(second.footer.region.dataset.layoutChromeMounted).toBeUndefined()
    expect(second.footer.content.innerHTML).toContain('Footer 2')
  })

  it('restores parked chrome when sparse flow clears under the same window key', () => {
    const container = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const first = createPageBreak(1)
    const second = createPageBreak(2)
    const third = createPageBreak(3)

    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.append(first.pageBreak, second.pageBreak, third.pageBreak)
    container.appendChild(paginationRoot)
    document.body.appendChild(container)

    const props = {
      editorContainerRef: { current: container } as MutableRefObject<HTMLDivElement | null>,
      layoutNavigationState: {
        boundaryEls: [],
        activeRange: { startPage: 1, endPage: 1 },
        pageBreakEls: [first.pageBreak, second.pageBreak, third.pageBreak],
        flowEls: [first.pageBreak, second.pageBreak, third.pageBreak]
      },
      viewportModel: {
        source: 'incremental-layout-engine' as const,
        totalPages: 3,
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

    const { rerender } = renderHook(currentProps => useApplyDocumentLayoutWindowedChrome(currentProps), {
      initialProps: props
    })

    expect(second.footer.region.dataset.layoutChromeMounted).toBe('false')

    rerender({
      ...props,
      viewportModel: {
        ...props.viewportModel,
        mountedRange: { startPage: 1, endPage: 3 },
        mountedPageNumbers: [1, 2, 3],
        mountedPageCount: 3,
        hasSparseFlow: false
      }
    })

    expect(second.footer.region.dataset.layoutChromeMounted).toBeUndefined()
    expect(second.footer.content.innerHTML).toContain('Footer 2')
  })

  it('keeps first-page header chrome mounted when outside the numeric active window', () => {
    const container = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const first = createPageBreak(1)
    const second = createPageBreak(2)
    const firstPageHeader = createChromeRegion('rm-first-page-header', 1, '<p>First page header</p>')

    paginationRoot.dataset.rmPagination = 'true'
    paginationRoot.append(first.pageBreak, second.pageBreak)
    container.appendChild(paginationRoot)
    document.body.appendChild(container)

    const props = {
      editorContainerRef: { current: container } as MutableRefObject<HTMLDivElement | null>,
      layoutNavigationState: {
        boundaryEls: [],
        activeRange: { startPage: 2, endPage: 2 },
        pageBreakEls: [first.pageBreak, second.pageBreak],
        flowEls: [first.pageBreak, second.pageBreak]
      },
      viewportModel: {
        source: 'incremental-layout-engine' as const,
        totalPages: 2,
        activeRange: { startPage: 2, endPage: 2 },
        activePageNumbers: [2],
        activePageCount: 1,
        mountedRange: { startPage: 1, endPage: 2 },
        mountedPageNumbers: [1, 2],
        mountedPageCount: 2,
        mountedPageBodyBounds: [],
        activePageBodyBounds: [],
        hasSparseFlow: true,
        isWindowed: true,
        containsCurrentPage: true,
        rangeLabel: '2-2',
        windowKey: 'incremental-layout-engine:2-2:1'
      }
    }

    const { rerender } = renderHook(currentProps => useApplyDocumentLayoutWindowedChrome(currentProps), {
      initialProps: props
    })

    container.appendChild(firstPageHeader.region)

    rerender({
      ...props,
      viewportModel: {
        ...props.viewportModel,
        mountedRange: { startPage: 1, endPage: 2 }
      }
    })

    expect(firstPageHeader.region.dataset.layoutChromeMounted).toBeUndefined()
    expect(firstPageHeader.content.innerHTML).toContain('First page header')
  })

  it('rebuilds chrome regions when placeholder page-break chrome hydrates in place', () => {
    const container = document.createElement('div')
    const paginationRoot = document.createElement('div')
    const first = createPageBreak(1)
    const second = createPageBreak(2)

    paginationRoot.dataset.rmPagination = 'true'
    first.pageBreak.querySelector('.breaker')?.replaceChildren()
    paginationRoot.append(first.pageBreak, second.pageBreak)
    container.appendChild(paginationRoot)
    document.body.appendChild(container)

    const props = {
      editorContainerRef: { current: container } as MutableRefObject<HTMLDivElement | null>,
      layoutNavigationState: {
        boundaryEls: [],
        activeRange: { startPage: 2, endPage: 2 },
        pageBreakEls: [first.pageBreak, second.pageBreak],
        flowEls: [first.pageBreak, second.pageBreak]
      },
      viewportModel: {
        source: 'incremental-layout-engine' as const,
        totalPages: 2,
        activeRange: { startPage: 2, endPage: 2 },
        activePageNumbers: [2],
        activePageCount: 1,
        mountedRange: { startPage: 1, endPage: 2 },
        mountedPageNumbers: [1, 2],
        mountedPageCount: 2,
        mountedPageBodyBounds: [],
        activePageBodyBounds: [],
        hasSparseFlow: true,
        isWindowed: true,
        containsCurrentPage: true,
        rangeLabel: '2-2',
        windowKey: 'incremental-layout-engine:2-2:1'
      }
    }

    const { rerender } = renderHook(currentProps => useApplyDocumentLayoutWindowedChrome(currentProps), {
      initialProps: props
    })

    const breaker = first.pageBreak.querySelector('.breaker')
    breaker?.append(first.footer.region, first.nextHeader.region)

    rerender({
      ...props,
      viewportModel: {
        ...props.viewportModel,
        mountedRange: { startPage: 1, endPage: 2 }
      }
    })

    expect(first.footer.region.dataset.layoutChromeMounted).toBeUndefined()
    expect(first.nextHeader.region.dataset.layoutChromeMounted).toBeUndefined()
  })
})
