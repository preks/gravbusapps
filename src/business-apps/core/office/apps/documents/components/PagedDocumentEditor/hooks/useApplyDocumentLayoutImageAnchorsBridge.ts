import { useEffect, type MutableRefObject } from 'react'
import { writePaginationLayoutImageAnchors } from '@/components/tiptap-extensions/tiptap-custom-pagination/layoutImageAnchorsBridge'
import type { DocumentLayoutViewportModel } from './useDocumentLayoutViewportModel'

interface UseApplyDocumentLayoutImageAnchorsBridgeParams {
  editorContainerRef: MutableRefObject<HTMLDivElement | null>
  layoutDocument: object | null
  viewportModel: Pick<DocumentLayoutViewportModel, 'documentVersion' | 'layoutVersion' | 'anchors'>
}

export function useApplyDocumentLayoutImageAnchorsBridge({
  editorContainerRef,
  layoutDocument,
  viewportModel
}: UseApplyDocumentLayoutImageAnchorsBridgeParams): void {
  useEffect(() => {
    writePaginationLayoutImageAnchors(editorContainerRef.current, {
      anchors: viewportModel.anchors.images.map(anchor => ({
        nodePosition: anchor.from,
        pageNumber: anchor.pageNumber,
        wrapMode: typeof anchor.metadata.wrapMode === 'string' ? anchor.metadata.wrapMode : null,
        anchorMode: typeof anchor.metadata.anchorMode === 'string' ? anchor.metadata.anchorMode : null,
        align: typeof anchor.metadata.align === 'string' ? anchor.metadata.align : null
      })),
      doc: layoutDocument,
      documentVersion: viewportModel.documentVersion,
      layoutVersion: viewportModel.layoutVersion
    })
  }, [
    editorContainerRef,
    layoutDocument,
    viewportModel.anchors.images,
    viewportModel.documentVersion,
    viewportModel.layoutVersion
  ])
}
