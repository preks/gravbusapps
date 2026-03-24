import type { MutableRefObject } from 'react'
import { renderHook } from '@testing-library/react'
import type { DocumentLayoutRuntimeState, DocumentLayoutSnapshot } from '../../../types'
import type { DocumentLayoutNavigationState } from '../documentLayoutService'
import type { DocumentLayoutViewportModel } from '../hooks/useDocumentLayoutViewportModel'
import { useApplyDocumentLayoutViewportMarkers } from '../hooks/useApplyDocumentLayoutViewportMarkers'
import { useApplyDocumentLayoutWindowedBreakers } from '../hooks/useApplyDocumentLayoutWindowedBreakers'
import { useApplyDocumentLayoutWindowedChrome } from '../hooks/useApplyDocumentLayoutWindowedChrome'
import { useDocumentLayoutViewportModel } from '../hooks/useDocumentLayoutViewportModel'
import { usePagedDocumentLayoutState } from '../hooks/usePagedDocumentLayoutState'
import { usePaginationLayoutSnapshot } from '../hooks/usePaginationLayoutSnapshot'

jest.mock('../hooks/usePaginationLayoutSnapshot', () => ({
  usePaginationLayoutSnapshot: jest.fn()
}))

jest.mock('../hooks/useDocumentLayoutViewportModel', () => ({
  useDocumentLayoutViewportModel: jest.fn()
}))

jest.mock('../hooks/useApplyDocumentLayoutViewportMarkers', () => ({
  useApplyDocumentLayoutViewportMarkers: jest.fn()
}))

jest.mock('../hooks/useApplyDocumentLayoutWindowedBreakers', () => ({
  useApplyDocumentLayoutWindowedBreakers: jest.fn()
}))

jest.mock('../hooks/useApplyDocumentLayoutWindowedChrome', () => ({
  useApplyDocumentLayoutWindowedChrome: jest.fn()
}))

const mockedUsePaginationLayoutSnapshot = usePaginationLayoutSnapshot as jest.MockedFunction<
  typeof usePaginationLayoutSnapshot
>
const mockedUseDocumentLayoutViewportModel = useDocumentLayoutViewportModel as jest.MockedFunction<
  typeof useDocumentLayoutViewportModel
>
const mockedUseApplyDocumentLayoutViewportMarkers = useApplyDocumentLayoutViewportMarkers as jest.MockedFunction<
  typeof useApplyDocumentLayoutViewportMarkers
>
const mockedUseApplyDocumentLayoutWindowedBreakers = useApplyDocumentLayoutWindowedBreakers as jest.MockedFunction<
  typeof useApplyDocumentLayoutWindowedBreakers
>
const mockedUseApplyDocumentLayoutWindowedChrome = useApplyDocumentLayoutWindowedChrome as jest.MockedFunction<
  typeof useApplyDocumentLayoutWindowedChrome
>

describe('usePagedDocumentLayoutState', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('composes pagination layout snapshot, viewport model, and presentation hooks', () => {
    const editorContainerRef = {
      current: document.createElement('div')
    } as MutableRefObject<HTMLDivElement | null>
    const handleScroll = jest.fn()
    const layoutSnapshot: DocumentLayoutSnapshot = {
      documentVersion: 1,
      layoutVersion: 2,
      source: 'incremental-layout-engine',
      pageCount: 4,
      pages: [
        { pageNumber: 1, flowIndex: 0, mountedIndex: 0, isMounted: true },
        { pageNumber: 2, flowIndex: 1, mountedIndex: 1, isMounted: true },
        { pageNumber: 3, flowIndex: 2, mountedIndex: 2, isMounted: true },
        { pageNumber: 4, flowIndex: 3, mountedIndex: 3, isMounted: true }
      ],
      flow: [
        { flowIndex: 0, pageRange: { startPage: 1, endPage: 1 }, kind: 'page-break', isMounted: true },
        { flowIndex: 1, pageRange: { startPage: 2, endPage: 2 }, kind: 'page-break', isMounted: true },
        { flowIndex: 2, pageRange: { startPage: 3, endPage: 3 }, kind: 'page-break', isMounted: true },
        { flowIndex: 3, pageRange: { startPage: 4, endPage: 4 }, kind: 'page-break', isMounted: true }
      ],
      mountedRange: { startPage: 1, endPage: 4 },
      pageBounds: [
        { pageNumber: 1, top: 0, bottom: 90, left: 10, right: 110 },
        { pageNumber: 2, top: 100, bottom: 190, left: 10, right: 110 },
        { pageNumber: 3, top: 200, bottom: 290, left: 10, right: 110 },
        { pageNumber: 4, top: 300, bottom: 390, left: 10, right: 110 }
      ],
      mountedPageBodyBounds: [
        { pageNumber: 1, top: 0, bottom: 90, left: 10, right: 110 },
        { pageNumber: 2, top: 100, bottom: 190, left: 10, right: 110 },
        { pageNumber: 3, top: 200, bottom: 290, left: 10, right: 110 },
        { pageNumber: 4, top: 300, bottom: 390, left: 10, right: 110 }
      ],
      pageSpans: [],
      retainedPageSpans: [],
      pagePositionRanges: [],
      pageChromeMetrics: [],
      anchors: {
        comments: [],
        images: [],
        links: [],
        tables: []
      },
      tableFragments: [],
      activeRange: { startPage: 2, endPage: 3 },
      activePages: [
        { pageNumber: 2, flowIndex: 1, mountedIndex: 1, isMounted: true },
        { pageNumber: 3, flowIndex: 2, mountedIndex: 2, isMounted: true }
      ]
    }
    const layoutNavigationState: DocumentLayoutNavigationState = {
      boundaryEls: [],
      activeRange: { startPage: 2, endPage: 3 },
      pageBreakEls: [document.createElement('div')],
      flowEls: []
    }
    const runtimeState: DocumentLayoutRuntimeState = {
      source: 'incremental-layout-engine',
      requestedGeneration: 2,
      resolvedGeneration: 2,
      status: 'idle',
      pendingScope: null,
      pendingRange: null,
      lastRequestedReason: 'initial-load',
      lastRequestedScope: 'full-document',
      lastRequestedRange: { startPage: 1, endPage: 4 },
      lastResolvedReason: 'initial-load',
      lastResolvedScope: 'full-document',
      lastResolvedRange: { startPage: 1, endPage: 4 }
    }
    const layoutViewportModel: DocumentLayoutViewportModel = {
      documentVersion: 1,
      layoutVersion: 2,
      source: 'incremental-layout-engine',
      totalPages: 4,
      activeRange: { startPage: 2, endPage: 3 },
      activePageNumbers: [2, 3],
      activePageCount: 2,
      mountedRange: { startPage: 1, endPage: 4 },
      mountedPageNumbers: [1, 2, 3, 4],
      mountedPageCount: 4,
      pageBounds: [
        { pageNumber: 1, top: 0, bottom: 90, left: 10, right: 110 },
        { pageNumber: 2, top: 100, bottom: 190, left: 10, right: 110 },
        { pageNumber: 3, top: 200, bottom: 290, left: 10, right: 110 },
        { pageNumber: 4, top: 300, bottom: 390, left: 10, right: 110 }
      ],
      mountedPageBodyBounds: [
        { pageNumber: 1, top: 0, bottom: 90, left: 10, right: 110 },
        { pageNumber: 2, top: 100, bottom: 190, left: 10, right: 110 },
        { pageNumber: 3, top: 200, bottom: 290, left: 10, right: 110 },
        { pageNumber: 4, top: 300, bottom: 390, left: 10, right: 110 }
      ],
      activePageBodyBounds: [
        { pageNumber: 2, top: 100, bottom: 190, left: 10, right: 110 },
        { pageNumber: 3, top: 200, bottom: 290, left: 10, right: 110 }
      ],
      pageSpans: [],
      retainedPageSpans: [],
      pagePositionRanges: [],
      activePagePositionRanges: [],
      pageChromeMetrics: [],
      anchors: {
        comments: [],
        images: [],
        links: [],
        tables: []
      },
      tableFragments: [],
      hasSparseFlow: false,
      isWindowed: true,
      containsCurrentPage: true,
      rangeLabel: '2-3',
      windowKey: 'incremental-layout-engine:2-3:2'
    }

    mockedUsePaginationLayoutSnapshot.mockReturnValue({
      currentPage: 2,
      handleScroll,
      layoutNavigationState,
      layoutSnapshot,
      runtimeState
    })
    mockedUseDocumentLayoutViewportModel.mockReturnValue(layoutViewportModel)

    const { result } = renderHook(() =>
      usePagedDocumentLayoutState({
        editor: null,
        editorContainerRef,
        documentId: 'doc-1',
        isYjsSynced: true,
        layoutInputsKey: 'layout-key'
      })
    )

    expect(mockedUsePaginationLayoutSnapshot).toHaveBeenCalledWith({
      editor: null,
      editorContainerRef,
      documentId: 'doc-1',
      isYjsSynced: true,
      layoutInputsKey: 'layout-key'
    })
    expect(mockedUseDocumentLayoutViewportModel).toHaveBeenCalledWith(layoutSnapshot, 2)
    expect(mockedUseApplyDocumentLayoutViewportMarkers).toHaveBeenCalledWith({
      editorContainerRef,
      layoutNavigationState,
      viewportModel: layoutViewportModel
    })
    expect(mockedUseApplyDocumentLayoutWindowedBreakers).toHaveBeenCalledWith({
      editor: null,
      editorContainerRef,
      layoutNavigationState,
      viewportModel: layoutViewportModel
    })
    expect(mockedUseApplyDocumentLayoutWindowedChrome).toHaveBeenCalledWith({
      editorContainerRef,
      layoutNavigationState,
      viewportModel: layoutViewportModel
    })
    expect(result.current).toEqual({
      currentPage: 2,
      handleScroll,
      layoutSnapshot,
      layoutViewportModel,
      runtimeState
    })
  })
})
