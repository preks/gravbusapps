import React, { type MutableRefObject } from 'react'
import { EditorContent, type Editor as TiptapEditor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { LinkBubbleMenu } from './LinkBubbleMenu'
import { DocumentContextMenu } from './DocumentContextMenu'
import type { DocumentLayoutViewportModel } from './hooks/useDocumentLayoutViewportModel'
import type { DocumentContextMenuState } from './useDocumentContextMenu'
import {
  DOCUMENT_VIRTUAL_WINDOW_PAGE_COUNT,
  DOCUMENT_VIRTUAL_WINDOW_PAGE_THRESHOLD,
  DOCUMENT_VIRTUAL_WINDOW_RADIUS
} from './virtualWindowConfig'

export interface VirtualizedDocumentViewportProps {
  editor: TiptapEditor | null
  activeEditor: TiptapEditor | null
  editorContainerRef: MutableRefObject<HTMLDivElement | null>
  zoom: number
  viewportBodyStateClass: string
  editorViewportStyle: React.CSSProperties | undefined
  layoutSnapshotPageCount: number
  layoutViewportModel: DocumentLayoutViewportModel
  contextMenuState: DocumentContextMenuState
  onContextMenuCapture: React.MouseEventHandler
  onScroll: React.UIEventHandler<HTMLDivElement>
  onOpenLinkDialog: () => void
  onAddInlineComment: () => void
  onAiEditClick: () => void
  onOpenReplaceImageDialog: (imagePos: number | null) => void
  onOpenImageSidebar: () => void
  onOpenLinkDialogForEditor: (editor: TiptapEditor | null) => void
}

export function VirtualizedDocumentViewport({
  editor,
  activeEditor,
  editorContainerRef,
  zoom,
  viewportBodyStateClass,
  editorViewportStyle,
  layoutSnapshotPageCount,
  layoutViewportModel,
  contextMenuState,
  onContextMenuCapture,
  onScroll,
  onOpenLinkDialog,
  onAddInlineComment,
  onAiEditClick,
  onOpenReplaceImageDialog,
  onOpenImageSidebar,
  onOpenLinkDialogForEditor
}: Readonly<VirtualizedDocumentViewportProps>) {
  return (
    <div
      ref={editorContainerRef}
      className={`gba:flex-1 gba:min-h-0 gba:min-w-0 gba:overflow-auto document-editor-viewport ${viewportBodyStateClass}`}
      style={editorViewportStyle}
      onScroll={onScroll}
      data-layout-source={layoutViewportModel.source}
      data-layout-window-mode={layoutViewportModel.isWindowed ? 'windowed' : 'full'}
      data-layout-window-start={layoutViewportModel.activeRange.startPage}
      data-layout-window-end={layoutViewportModel.activeRange.endPage}
      data-layout-window-size={layoutViewportModel.activePageCount}
      data-layout-mounted-start={layoutViewportModel.mountedRange?.startPage}
      data-layout-mounted-end={layoutViewportModel.mountedRange?.endPage}
      data-layout-mounted-size={layoutViewportModel.mountedPageCount}
      data-layout-window-key={layoutViewportModel.windowKey}
      data-layout-current-page-in-window={layoutViewportModel.containsCurrentPage ? 'true' : 'false'}
      data-layout-document-version={layoutViewportModel.documentVersion}
      data-layout-version={layoutViewportModel.layoutVersion}
      data-layout-page-span-count={layoutViewportModel.pageSpans.length}
      data-layout-table-fragment-count={layoutViewportModel.tableFragments.length}
      data-virtual-window-threshold={DOCUMENT_VIRTUAL_WINDOW_PAGE_THRESHOLD}
      data-virtual-window-radius={DOCUMENT_VIRTUAL_WINDOW_RADIUS}
      data-virtual-window-page-count={DOCUMENT_VIRTUAL_WINDOW_PAGE_COUNT}
    >
      <div className="gba:flex gba:justify-center gba:py-8" style={{ minHeight: '100%' }}>
        <DocumentContextMenu
          editor={activeEditor}
          contextMenuState={contextMenuState}
          onContextMenuCapture={onContextMenuCapture}
          onOpenLinkDialog={onOpenLinkDialog}
          onAddInlineComment={onAddInlineComment}
          onAiEditClick={onAiEditClick}
          onOpenReplaceImageDialog={onOpenReplaceImageDialog}
          onOpenImageSidebar={onOpenImageSidebar}
          data-testid="document-editor-context-menu"
        >
          <div
            className="paged-document-editor"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center'
            }}
            data-layout-active-pages={layoutViewportModel.activePageNumbers.join(',')}
            data-virtual-window-enabled={
              layoutSnapshotPageCount > DOCUMENT_VIRTUAL_WINDOW_PAGE_THRESHOLD ? 'true' : 'false'
            }
          >
            <EditorContent editor={editor} className="editor-content" />
            {editor && (
              <BubbleMenu
                editor={editor}
                shouldShow={({ editor: currentEditor }) => currentEditor.isActive('link')}
                pluginKey="linkBubbleMenu"
                onMouseDown={event => event.preventDefault()}
              >
                <LinkBubbleMenu
                  editor={editor}
                  onEdit={() => onOpenLinkDialogForEditor(editor)}
                  data-testid="document-link-bubble-menu"
                />
              </BubbleMenu>
            )}
          </div>
        </DocumentContextMenu>
      </div>
    </div>
  )
}
