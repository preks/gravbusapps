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
      layoutVersion: 2,
      source: 'incremental-layout-engine',
      pageCount: 4,
      pages: [{ pageNumber: 1 }, { pageNumber: 2 }, { pageNumber: 3 }, { pageNumber: 4 }],
      activeRange: { startPage: 2, endPage: 3 },
      activePages: [{ pageNumber: 2 }, { pageNumber: 3 }]
    }
    const layoutNavigationState: DocumentLayoutNavigationState = {
      boundaryEls: [],
      activeRange: { startPage: 2, endPage: 3 },
      pageBreakEls: [document.createElement('div')]
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
      source: 'incremental-layout-engine',
      totalPages: 4,
      activeRange: { startPage: 2, endPage: 3 },
      activePageNumbers: [2, 3],
      activePageCount: 2,
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
