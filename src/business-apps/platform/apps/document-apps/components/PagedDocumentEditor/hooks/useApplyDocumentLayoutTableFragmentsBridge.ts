import { useEffect, type MutableRefObject } from 'react'
import { writePaginationLayoutTableFragments } from '@/components/tiptap-extensions/tiptap-custom-pagination/layoutTableFragmentsBridge'
import type { DocumentLayoutViewportModel } from './useDocumentLayoutViewportModel'

interface UseApplyDocumentLayoutTableFragmentsBridgeParams {
  editorContainerRef: MutableRefObject<HTMLDivElement | null>
  layoutDocument: object | null
  viewportModel: Pick<DocumentLayoutViewportModel, 'tableFragments'>
}

export function useApplyDocumentLayoutTableFragmentsBridge({
  editorContainerRef,
  layoutDocument,
  viewportModel
}: UseApplyDocumentLayoutTableFragmentsBridgeParams): void {
  useEffect(() => {
    writePaginationLayoutTableFragments(
      editorContainerRef.current,
      viewportModel.tableFragments.map(fragment => ({
        tablePos: fragment.tablePos,
        pageNumbers: fragment.pageNumbers,
        rowCount: fragment.rowCount,
        paginationChainKey: fragment.paginationChainKey,
        paginationSplitId: fragment.paginationSplitId,
        fragmentIndex: fragment.fragmentIndex,
        fragmentCount: fragment.fragmentCount
      })),
      layoutDocument
    )
  }, [editorContainerRef, layoutDocument, viewportModel.tableFragments])
}
