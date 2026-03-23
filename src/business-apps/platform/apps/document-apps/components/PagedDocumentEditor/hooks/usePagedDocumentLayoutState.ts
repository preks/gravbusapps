import type { DocumentLayoutRuntimeState, DocumentLayoutSnapshot } from '../../../types'
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
  runtimeState: DocumentLayoutRuntimeState
}

export function usePagedDocumentLayoutState(
  params: UsePaginationLayoutSnapshotProps
): UsePagedDocumentLayoutStateResult {
  const { currentPage, handleScroll, layoutNavigationState, layoutSnapshot, runtimeState } =
    usePaginationLayoutSnapshot(params)
  const layoutViewportModel = useDocumentLayoutViewportModel(layoutSnapshot, currentPage)

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
    layoutViewportModel,
    runtimeState
  }
}
