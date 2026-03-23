import { useEffect, type MutableRefObject } from 'react'
import { writePaginationLayoutTableFragments } from '@/components/tiptap-extensions/tiptap-custom-pagination/layoutTableFragmentsBridge'
import type { DocumentLayoutViewportModel } from './useDocumentLayoutViewportModel'

interface UseApplyDocumentLayoutTableFragmentsBridgeParams {
  editorContainerRef: MutableRefObject<HTMLDivElement | null>
  layoutDocument: object | null
  viewportModel: Pick<DocumentLayoutViewportModel, 'documentVersion' | 'layoutVersion' | 'tableFragments'>
}

export function useApplyDocumentLayoutTableFragmentsBridge({
  editorContainerRef,
  layoutDocument,
  viewportModel
}: UseApplyDocumentLayoutTableFragmentsBridgeParams): void {
  useEffect(() => {
    writePaginationLayoutTableFragments(editorContainerRef.current, {
      fragments: viewportModel.tableFragments.map(fragment => ({
        tablePos: fragment.tablePos,
        pageNumbers: fragment.pageNumbers,
        rowCount: fragment.rowCount,
        paginationChainKey: fragment.paginationChainKey,
        paginationSplitId: fragment.paginationSplitId,
        fragmentIndex: fragment.fragmentIndex,
        fragmentCount: fragment.fragmentCount
      })),
      doc: layoutDocument,
      documentVersion: viewportModel.documentVersion,
      layoutVersion: viewportModel.layoutVersion
    })
  }, [
    editorContainerRef,
    layoutDocument,
    viewportModel.documentVersion,
    viewportModel.layoutVersion,
    viewportModel.tableFragments
  ])
}
