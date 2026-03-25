import type { MutableRefObject } from 'react'
import { renderHook } from '@testing-library/react'
import type { DocumentLayoutMeasurementRequest, DocumentLayoutPageSnapshot } from '../../../types'
import type { DocumentLayoutService } from '../documentLayoutService'
import {
  mergeDocumentLayoutPagePositionRanges,
  resolveCurrentPageFromPageBounds,
  resolveMountedPagePositionRanges,
  resolveSpacerPageBodyBounds,
  resolveSpacerPagePositionRanges,
  shouldScheduleDocumentHydrationRefresh,
  usePaginationLayoutSnapshot
} from '../hooks/usePaginationLayoutSnapshot'

function createPageSnapshots(pageCount: number): DocumentLayoutPageSnapshot[] {
  return Array.from({ length: pageCount }, (_, index) => ({
    pageNumber: index + 1,
    flowIndex: index,
    mountedIndex: index,
    isMounted: true
  }))
}

function createLayoutServiceStub(pageCount = 30) {
  const pages = createPageSnapshots(pageCount)
  const measureLayout = jest.fn((_container: HTMLDivElement, request: DocumentLayoutMeasurementRequest) => ({
    layout: {
      pageCount,
      pages,
      flow: pages.map((page, index) => ({
        flowIndex: index,
        pageRange: { startPage: page.pageNumber, endPage: page.pageNumber },
        kind: 'page-break' as const,
        isMounted: true
      })),
      mountedRange: { startPage: 1, endPage: pageCount },
      mountedPageBodyBounds: pages.map(page => ({
        pageNumber: page.pageNumber,
        top: page.pageNumber * 100,
        bottom: page.pageNumber * 100 + 80,
        left: 10,
        right: 110
      })),
      pageChromeMetrics: pages.map(page => ({
        pageNumber: page.pageNumber,
        headerHeight: 40,
        footerHeight: 40
      })),
      activeRange: request.pageRange,
      activePages: request.pageRange ? pages.slice(request.pageRange.startPage - 1, request.pageRange.endPage) : pages
    },
    navigationState: {
      boundaryEls: [],
      activeRange: request.pageRange,
      pageBreakEls: [],
      flowEls: []
    }
  }))

  const service: DocumentLayoutService = {
    source: 'incremental-layout-engine',
    measureLayout,
    resolveCurrentPage: jest.fn(() => 1),
    observeLayout: jest.fn(() => () => {
      return undefined
    })
  }

  return {
    measureLayout,
    service
  }
}

describe('usePaginationLayoutSnapshot', () => {
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

  it('requires a document id, sync readiness, and an initialized layout before scheduling hydration', () => {
    expect(
      shouldScheduleDocumentHydrationRefresh({
        documentId: undefined,
        isYjsSynced: true,
        hasInitializedLayout: true
      })
    ).toBe(false)
    expect(
      shouldScheduleDocumentHydrationRefresh({
        documentId: 'doc-1',
        isYjsSynced: false,
        hasInitializedLayout: true
      })
    ).toBe(false)
    expect(
      shouldScheduleDocumentHydrationRefresh({
        documentId: 'doc-1',
        isYjsSynced: true,
        hasInitializedLayout: false
      })
    ).toBe(false)
    expect(
      shouldScheduleDocumentHydrationRefresh({
        documentId: 'doc-1',
        isYjsSynced: true,
        hasInitializedLayout: true
      })
    ).toBe(true)
  })

  it('avoids duplicating hydration work on the initial synced mount', () => {
    const { service, measureLayout } = createLayoutServiceStub()
    const editorContainerRef = {
      current: document.createElement('div')
    } as MutableRefObject<HTMLDivElement | null>

    renderHook(
      props =>
        usePaginationLayoutSnapshot({
          editor: null,
          editorContainerRef,
          layoutService: service,
          ...props
        }),
      {
        initialProps: {
          documentId: 'doc-1',
          isYjsSynced: true,
          layoutInputsKey: 'layout-1'
        }
      }
    )

    expect(measureLayout).toHaveBeenCalledTimes(1)
    expect(measureLayout.mock.calls[0]?.[1].reason).toBe('initial-load')
  })

  it('resolves mounted page position ranges from sampled page body coordinates', () => {
    const ranges = resolveMountedPagePositionRanges(
      {
        view: {
          posAtCoords: ({ top }: { left: number; top: number }) =>
            top < 200
              ? {
                  pos: 12
                }
              : {
                  pos: 38
                }
        }
      } as never,
      [{ pageNumber: 2, top: 100, bottom: 220, left: 20, right: 140 }]
    )

    expect(ranges).toEqual([{ pageNumber: 2, startPos: 12, endPos: 38 }])
  })

  it('resolves spacer page position ranges from page-segment metadata', () => {
    const spacer = document.createElement('div')
    spacer.className = 'rm-page-spacer'
    spacer.dataset.rmPageRangeStart = '7'
    spacer.dataset.rmPageRangeEnd = '8'
    spacer.dataset.rmPageSegmentHeights = '80,120'
    spacer.getBoundingClientRect = () =>
      ({
        left: 40,
        right: 160,
        top: 400,
        bottom: 600
      }) as DOMRect

    const ranges = resolveSpacerPagePositionRanges(
      {
        view: {
          posAtCoords: ({ top }: { left: number; top: number }) =>
            top < 480
              ? {
                  pos: top < 440 ? 70 : 79
                }
              : {
                  pos: top < 540 ? 80 : 99
                }
        }
      } as never,
      [spacer]
    )

    expect(ranges).toEqual([
      { pageNumber: 7, startPos: 70, endPos: 79 },
      { pageNumber: 8, startPos: 80, endPos: 99 }
    ])
  })

  it('resolves spacer page body bounds from page-segment metadata', () => {
    const spacer = document.createElement('div')
    spacer.className = 'rm-page-spacer'
    spacer.dataset.rmPageRangeStart = '7'
    spacer.dataset.rmPageRangeEnd = '8'
    spacer.dataset.rmPageSegmentHeights = '80,120'
    spacer.getBoundingClientRect = () =>
      ({
        left: 40,
        right: 160,
        top: 400,
        bottom: 600
      }) as DOMRect

    expect(resolveSpacerPageBodyBounds([spacer])).toEqual([
      { pageNumber: 7, top: 400, bottom: 480, left: 40, right: 160 },
      { pageNumber: 8, top: 480, bottom: 600, left: 40, right: 160 }
    ])
  })

  it('derives current page from snapshot page bounds without DOM navigation state', () => {
    const spacer = document.createElement('div')
    spacer.className = 'rm-page-spacer'
    spacer.dataset.rmPageRangeStart = '1'
    spacer.dataset.rmPageRangeEnd = '30'
    spacer.dataset.rmPageSegmentHeights = Array.from({ length: 30 }, () => '100').join(',')
    spacer.getBoundingClientRect = () =>
      ({
        left: 40,
        right: 160,
        top: 0,
        bottom: 3000
      }) as DOMRect

    const pageBounds = resolveSpacerPageBodyBounds([spacer])
    const container = document.createElement('div')
    container.getBoundingClientRect = () =>
      ({
        top: 1400,
        bottom: 1600
      }) as DOMRect

    expect(pageBounds).toHaveLength(30)
    expect(resolveCurrentPageFromPageBounds(container, pageBounds, 1)).toBe(15)
  })

  it('merges page position ranges across viewport window refreshes and drops out-of-range pages', () => {
    expect(
      mergeDocumentLayoutPagePositionRanges(
        [
          { pageNumber: 1, startPos: 1, endPos: 19 },
          { pageNumber: 4, startPos: 60, endPos: 79 }
        ],
        [
          { pageNumber: 2, startPos: 20, endPos: 39 },
          { pageNumber: 4, startPos: 62, endPos: 81 }
        ],
        4,
        true
      )
    ).toEqual([
      { pageNumber: 1, startPos: 1, endPos: 19 },
      { pageNumber: 2, startPos: 20, endPos: 39 },
      { pageNumber: 4, startPos: 62, endPos: 81 }
    ])
    expect(mergeDocumentLayoutPagePositionRanges([{ pageNumber: 5, startPos: 80, endPos: 99 }], [], 4)).toEqual([])
  })

  it('drops previously retained page position ranges after non-viewport invalidations', () => {
    expect(
      mergeDocumentLayoutPagePositionRanges(
        [
          { pageNumber: 1, startPos: 1, endPos: 19 },
          { pageNumber: 4, startPos: 60, endPos: 79 }
        ],
        [{ pageNumber: 2, startPos: 20, endPos: 39 }],
        4,
        false
      )
    ).toEqual([{ pageNumber: 2, startPos: 20, endPos: 39 }])
  })
})
