import { renderHook } from '@testing-library/react'
import type { DocumentLayoutSnapshot } from '../../../types'
import { useDocumentLayoutViewportModel } from '../hooks/useDocumentLayoutViewportModel'

describe('useDocumentLayoutViewportModel', () => {
  it('derives mounted-page metadata and sparse-flow state from the layout snapshot', () => {
    const layoutSnapshot: DocumentLayoutSnapshot = {
      documentVersion: 1,
      layoutVersion: 3,
      source: 'incremental-layout-engine',
      pageCount: 6,
      pages: [
        { pageNumber: 1, flowIndex: 0, mountedIndex: null, isMounted: false },
        { pageNumber: 2, flowIndex: 1, mountedIndex: 0, isMounted: true },
        { pageNumber: 3, flowIndex: 2, mountedIndex: 1, isMounted: true },
        { pageNumber: 4, flowIndex: 3, mountedIndex: 2, isMounted: true },
        { pageNumber: 5, flowIndex: 4, mountedIndex: null, isMounted: false },
        { pageNumber: 6, flowIndex: 4, mountedIndex: null, isMounted: false }
      ],
      flow: [
        { flowIndex: 0, pageRange: { startPage: 1, endPage: 1 }, kind: 'spacer', isMounted: false },
        { flowIndex: 1, pageRange: { startPage: 2, endPage: 2 }, kind: 'page-break', isMounted: true },
        { flowIndex: 2, pageRange: { startPage: 3, endPage: 3 }, kind: 'page-break', isMounted: true },
        { flowIndex: 3, pageRange: { startPage: 4, endPage: 4 }, kind: 'page-break', isMounted: true },
        { flowIndex: 4, pageRange: { startPage: 5, endPage: 6 }, kind: 'spacer', isMounted: false }
      ],
      mountedRange: { startPage: 2, endPage: 4 },
      pageBounds: [
        { pageNumber: 2, top: 100, bottom: 200, left: 10, right: 110 },
        { pageNumber: 3, top: 210, bottom: 310, left: 10, right: 110 },
        { pageNumber: 4, top: 320, bottom: 420, left: 10, right: 110 }
      ],
      mountedPageBodyBounds: [
        { pageNumber: 2, top: 100, bottom: 200, left: 10, right: 110 },
        { pageNumber: 3, top: 210, bottom: 310, left: 10, right: 110 },
        { pageNumber: 4, top: 320, bottom: 420, left: 10, right: 110 }
      ],
      pageSpans: [],
      retainedPageSpans: [],
      pagePositionRanges: [
        { pageNumber: 2, startPos: 20, endPos: 39 },
        { pageNumber: 3, startPos: 40, endPos: 59 },
        { pageNumber: 4, startPos: 60, endPos: 79 }
      ],
      pageChromeMetrics: [],
      anchors: {
        comments: [],
        images: [],
        links: [],
        tables: []
      },
      tableFragments: [],
      activeRange: { startPage: 2, endPage: 4 },
      activePages: [
        { pageNumber: 2, flowIndex: 1, mountedIndex: 0, isMounted: true },
        { pageNumber: 3, flowIndex: 2, mountedIndex: 1, isMounted: true },
        { pageNumber: 4, flowIndex: 3, mountedIndex: 2, isMounted: true }
      ]
    }

    const { result } = renderHook(() => useDocumentLayoutViewportModel(layoutSnapshot, 3))

    expect(result.current).toEqual({
      documentVersion: 1,
      layoutVersion: 3,
      source: 'incremental-layout-engine',
      totalPages: 6,
      activeRange: { startPage: 2, endPage: 4 },
      activePageNumbers: [2, 3, 4],
      activePageCount: 3,
      mountedRange: { startPage: 2, endPage: 4 },
      mountedPageNumbers: [2, 3, 4],
      mountedPageCount: 3,
      pageBounds: [
        { pageNumber: 2, top: 100, bottom: 200, left: 10, right: 110 },
        { pageNumber: 3, top: 210, bottom: 310, left: 10, right: 110 },
        { pageNumber: 4, top: 320, bottom: 420, left: 10, right: 110 }
      ],
      mountedPageBodyBounds: [
        { pageNumber: 2, top: 100, bottom: 200, left: 10, right: 110 },
        { pageNumber: 3, top: 210, bottom: 310, left: 10, right: 110 },
        { pageNumber: 4, top: 320, bottom: 420, left: 10, right: 110 }
      ],
      pagePositionRanges: [
        { pageNumber: 2, startPos: 20, endPos: 39 },
        { pageNumber: 3, startPos: 40, endPos: 59 },
        { pageNumber: 4, startPos: 60, endPos: 79 }
      ],
      activePageBodyBounds: [
        { pageNumber: 2, top: 100, bottom: 200, left: 10, right: 110 },
        { pageNumber: 3, top: 210, bottom: 310, left: 10, right: 110 },
        { pageNumber: 4, top: 320, bottom: 420, left: 10, right: 110 }
      ],
      activePagePositionRanges: [
        { pageNumber: 2, startPos: 20, endPos: 39 },
        { pageNumber: 3, startPos: 40, endPos: 59 },
        { pageNumber: 4, startPos: 60, endPos: 79 }
      ],
      pageSpans: [],
      retainedPageSpans: [],
      pageChromeMetrics: [],
      anchors: {
        comments: [],
        images: [],
        links: [],
        tables: []
      },
      tableFragments: [],
      hasSparseFlow: true,
      isWindowed: true,
      containsCurrentPage: true,
      rangeLabel: '2-4',
      windowKey: 'incremental-layout-engine:2-4:3:2-4:sparse'
    })
  })

  it('changes the window key when the mounted sparse state changes under the same active range', () => {
    const sparseSnapshot: DocumentLayoutSnapshot = {
      documentVersion: 1,
      layoutVersion: 4,
      source: 'incremental-layout-engine',
      pageCount: 6,
      pages: [
        { pageNumber: 1, flowIndex: 0, mountedIndex: null, isMounted: false },
        { pageNumber: 2, flowIndex: 1, mountedIndex: 0, isMounted: true },
        { pageNumber: 3, flowIndex: 2, mountedIndex: 1, isMounted: true },
        { pageNumber: 4, flowIndex: 3, mountedIndex: 2, isMounted: true },
        { pageNumber: 5, flowIndex: 4, mountedIndex: null, isMounted: false },
        { pageNumber: 6, flowIndex: 5, mountedIndex: null, isMounted: false }
      ],
      flow: [
        { flowIndex: 0, pageRange: { startPage: 1, endPage: 1 }, kind: 'spacer', isMounted: false },
        { flowIndex: 1, pageRange: { startPage: 2, endPage: 2 }, kind: 'page-break', isMounted: true },
        { flowIndex: 2, pageRange: { startPage: 3, endPage: 3 }, kind: 'page-break', isMounted: true },
        { flowIndex: 3, pageRange: { startPage: 4, endPage: 4 }, kind: 'page-break', isMounted: true },
        { flowIndex: 4, pageRange: { startPage: 5, endPage: 5 }, kind: 'spacer', isMounted: false },
        { flowIndex: 5, pageRange: { startPage: 6, endPage: 6 }, kind: 'spacer', isMounted: false }
      ],
      mountedRange: { startPage: 2, endPage: 4 },
      pageBounds: [
        { pageNumber: 2, top: 100, bottom: 200, left: 10, right: 110 },
        { pageNumber: 3, top: 210, bottom: 310, left: 10, right: 110 },
        { pageNumber: 4, top: 320, bottom: 420, left: 10, right: 110 }
      ],
      mountedPageBodyBounds: [
        { pageNumber: 2, top: 100, bottom: 200, left: 10, right: 110 },
        { pageNumber: 3, top: 210, bottom: 310, left: 10, right: 110 },
        { pageNumber: 4, top: 320, bottom: 420, left: 10, right: 110 }
      ],
      pageSpans: [],
      retainedPageSpans: [],
      pagePositionRanges: [
        { pageNumber: 2, startPos: 20, endPos: 39 },
        { pageNumber: 3, startPos: 40, endPos: 59 },
        { pageNumber: 4, startPos: 60, endPos: 79 }
      ],
      pageChromeMetrics: [],
      anchors: {
        comments: [],
        images: [],
        links: [],
        tables: []
      },
      tableFragments: [],
      activeRange: { startPage: 2, endPage: 4 },
      activePages: [
        { pageNumber: 2, flowIndex: 1, mountedIndex: 0, isMounted: true },
        { pageNumber: 3, flowIndex: 2, mountedIndex: 1, isMounted: true },
        { pageNumber: 4, flowIndex: 3, mountedIndex: 2, isMounted: true }
      ]
    }
    const fullSnapshot: DocumentLayoutSnapshot = {
      ...sparseSnapshot,
      pages: sparseSnapshot.pages.map((page, index) => ({
        pageNumber: page.pageNumber,
        flowIndex: index,
        mountedIndex: index,
        isMounted: true
      })),
      flow: sparseSnapshot.flow.map((flowEntry, index) => ({
        flowIndex: index,
        pageRange: flowEntry.pageRange,
        kind: 'page-break' as const,
        isMounted: true
      })),
      mountedRange: { startPage: 1, endPage: 6 },
      mountedPageBodyBounds: [
        { pageNumber: 1, top: 0, bottom: 90, left: 10, right: 110 },
        { pageNumber: 2, top: 100, bottom: 190, left: 10, right: 110 },
        { pageNumber: 3, top: 200, bottom: 290, left: 10, right: 110 },
        { pageNumber: 4, top: 300, bottom: 390, left: 10, right: 110 },
        { pageNumber: 5, top: 400, bottom: 490, left: 10, right: 110 },
        { pageNumber: 6, top: 500, bottom: 590, left: 10, right: 110 }
      ],
      pagePositionRanges: [
        { pageNumber: 1, startPos: 1, endPos: 19 },
        { pageNumber: 2, startPos: 20, endPos: 39 },
        { pageNumber: 3, startPos: 40, endPos: 59 },
        { pageNumber: 4, startPos: 60, endPos: 79 },
        { pageNumber: 5, startPos: 80, endPos: 99 },
        { pageNumber: 6, startPos: 100, endPos: 119 }
      ]
    }

    const sparse = renderHook(() => useDocumentLayoutViewportModel(sparseSnapshot, 2))
    const full = renderHook(() => useDocumentLayoutViewportModel(fullSnapshot, 2))

    expect(sparse.result.current.windowKey).toBe('incremental-layout-engine:2-4:3:2-4:sparse')
    expect(full.result.current.windowKey).toBe('incremental-layout-engine:2-4:3:1-6:full')
  })

  it('reuses mounted bounds and position ranges when the active range already covers them', () => {
    const layoutSnapshot: DocumentLayoutSnapshot = {
      documentVersion: 2,
      layoutVersion: 5,
      source: 'incremental-layout-engine',
      pageCount: 5,
      pages: [
        { pageNumber: 1, flowIndex: 0, mountedIndex: null, isMounted: false },
        { pageNumber: 2, flowIndex: 1, mountedIndex: 0, isMounted: true },
        { pageNumber: 3, flowIndex: 2, mountedIndex: 1, isMounted: true },
        { pageNumber: 4, flowIndex: 3, mountedIndex: 2, isMounted: true },
        { pageNumber: 5, flowIndex: 4, mountedIndex: null, isMounted: false }
      ],
      flow: [
        { flowIndex: 0, pageRange: { startPage: 1, endPage: 1 }, kind: 'spacer', isMounted: false },
        { flowIndex: 1, pageRange: { startPage: 2, endPage: 2 }, kind: 'page-break', isMounted: true },
        { flowIndex: 2, pageRange: { startPage: 3, endPage: 3 }, kind: 'page-break', isMounted: true },
        { flowIndex: 3, pageRange: { startPage: 4, endPage: 4 }, kind: 'page-break', isMounted: true },
        { flowIndex: 4, pageRange: { startPage: 5, endPage: 5 }, kind: 'spacer', isMounted: false }
      ],
      mountedRange: { startPage: 2, endPage: 4 },
      pageBounds: [
        { pageNumber: 2, top: 100, bottom: 200, left: 10, right: 110 },
        { pageNumber: 3, top: 210, bottom: 310, left: 10, right: 110 },
        { pageNumber: 4, top: 320, bottom: 420, left: 10, right: 110 }
      ],
      mountedPageBodyBounds: [
        { pageNumber: 2, top: 100, bottom: 200, left: 10, right: 110 },
        { pageNumber: 3, top: 210, bottom: 310, left: 10, right: 110 },
        { pageNumber: 4, top: 320, bottom: 420, left: 10, right: 110 }
      ],
      pageSpans: [],
      retainedPageSpans: [],
      pagePositionRanges: [
        { pageNumber: 2, startPos: 20, endPos: 39 },
        { pageNumber: 3, startPos: 40, endPos: 59 },
        { pageNumber: 4, startPos: 60, endPos: 79 }
      ],
      pageChromeMetrics: [],
      anchors: {
        comments: [],
        images: [],
        links: [],
        tables: []
      },
      tableFragments: [],
      activeRange: { startPage: 2, endPage: 4 },
      activePages: [
        { pageNumber: 2, flowIndex: 1, mountedIndex: 0, isMounted: true },
        { pageNumber: 3, flowIndex: 2, mountedIndex: 1, isMounted: true },
        { pageNumber: 4, flowIndex: 3, mountedIndex: 2, isMounted: true }
      ]
    }

    const { result } = renderHook(() => useDocumentLayoutViewportModel(layoutSnapshot, 3))

    expect(result.current.activePageBodyBounds).toBe(layoutSnapshot.mountedPageBodyBounds)
    expect(result.current.activePagePositionRanges).toBe(layoutSnapshot.pagePositionRanges)
  })
})
