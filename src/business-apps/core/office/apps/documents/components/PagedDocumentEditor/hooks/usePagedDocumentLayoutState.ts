import type { DocumentLayoutSnapshot } from '../../../types'
import { useApplyDocumentLayoutTableFragmentsBridge } from './useApplyDocumentLayoutTableFragmentsBridge'
import { useApplyDocumentLayoutViewportMarkers } from './useApplyDocumentLayoutViewportMarkers'
import { useApplyDocumentLayoutWindowedBreakers } from './useApplyDocumentLayoutWindowedBreakers'
import { useApplyDocumentLayoutWindowedChrome } from './useApplyDocumentLayoutWindowedChrome'
import { useDocumentLayoutViewportModel, type DocumentLayoutViewportModel } from './useDocumentLayoutViewportModel'
import {
  usePaginationLayoutSnapshot,
  type UsePaginationLayoutSnapshotProps,
  type UsePaginationLayoutSnapshotResult
} from './usePaginationLayoutSnapshot'

export interface UsePagedDocumentLayoutStateResult {
  currentPage: number
  handleScroll: UsePaginationLayoutSnapshotResult['handleScroll']
  layoutSnapshot: DocumentLayoutSnapshot
  layoutViewportModel: DocumentLayoutViewportModel
}

export function usePagedDocumentLayoutState(
  params: UsePaginationLayoutSnapshotProps
): UsePagedDocumentLayoutStateResult {
  const { currentPage, handleScroll, layoutNavigationState, layoutSnapshot } = usePaginationLayoutSnapshot(params)
  const layoutViewportModel = useDocumentLayoutViewportModel(layoutSnapshot, currentPage)

  useApplyDocumentLayoutTableFragmentsBridge({
    editorContainerRef: params.editorContainerRef,
    layoutDocument: params.editor?.state.doc ?? null,
    viewportModel: layoutViewportModel
  })
  useApplyDocumentLayoutViewportMarkers({
    editorContainerRef: params.editorContainerRef,
    layoutNavigationState,
    viewportModel: layoutViewportModel
  })
  useApplyDocumentLayoutWindowedBreakers({
    editor: params.editor,
    editorContainerRef: params.editorContainerRef,
    layoutNavigationState,
    viewportModel: layoutViewportModel
  })
  useApplyDocumentLayoutWindowedChrome({
    editorContainerRef: params.editorContainerRef,
    layoutNavigationState,
    viewportModel: layoutViewportModel
  })

  return {
    currentPage,
    handleScroll,
    layoutSnapshot,
    layoutViewportModel
  }
}
