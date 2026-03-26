import type { ComponentProps, Dispatch, SetStateAction } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import type { ActivePagesEditorState } from '@/components/tiptap-extensions/tiptap-custom-pagination'
import { CommentPanel } from '@/business-apps/platform/apps/shared/components/CommentPanel'
import { InlineCommentPopover } from '@/business-apps/platform/apps/shared/components/InlineCommentPopover'
import { AiEditPanel } from '../AiEditPanel'
import { HeaderFooterSettingsSidebar, type HeaderFooterSettingsSidebarProps } from './HeaderFooterSettingsSidebar'
import { TableSettingsSidebar, type SelectedTableSidebarState } from './TableSettingsSidebar'
import { ImageSettingsSidebar, type SelectedImageSidebarState } from './ImageSettingsSidebar'
import type { RightSidebar } from './hooks/usePagedDocumentInteractionDialogs'

type TranslateFn = (key: string) => string

export interface PagedDocumentEditorSidebarHostProps {
  documentId?: string
  editor: TiptapEditor | null
  activeEditor: TiptapEditor | null
  title: string
  accessToken: string
  currentUserId: string | null
  currentUserName: string | null
  currentUserAvatar: string | null
  rightSidebar: RightSidebar
  setRightSidebar: Dispatch<SetStateAction<RightSidebar>>
  measuredHeaderHeight: number
  documentRightPanelOffset: number
  comments: ComponentProps<typeof CommentPanel>['comments']
  commentsUnresolvedCount: number
  commentsIsLoading: boolean
  onCreateComment: ComponentProps<typeof CommentPanel>['onCreateComment']
  onUpdateComment: ComponentProps<typeof CommentPanel>['onUpdateComment']
  onResolveComment: ComponentProps<typeof CommentPanel>['onResolveComment']
  onDeleteComment: ComponentProps<typeof CommentPanel>['onDeleteComment']
  onCloseCommentsSidebar: () => void
  onUnhighlightComment: ComponentProps<typeof CommentPanel>['onUnhighlight']
  onScrollToHighlight: ComponentProps<typeof CommentPanel>['onScrollToHighlight']
  showHeaderFooterSidebar: boolean
  pagesEditorState: ActivePagesEditorState
  differentFirstPage: boolean
  differentOddEven: boolean
  headerTopMarginPx: number
  footerBottomMarginPx: number
  marginUnit: HeaderFooterSettingsSidebarProps['marginUnit']
  showDocumentBody: boolean
  onShowDocumentBodyChange: (value: boolean) => void
  onPersistPagesFromEditor: HeaderFooterSettingsSidebarProps['onPersistPagesFromEditor']
  onOpenPageNumbers: HeaderFooterSettingsSidebarProps['onOpenPageNumbers']
  onQuickPageNumberPlacement: HeaderFooterSettingsSidebarProps['onQuickPageNumberPlacement']
  onRemovePageNumber: HeaderFooterSettingsSidebarProps['onRemovePageNumber']
  onCloseHeaderFooterSidebar: () => void
  selectedTableSidebar: SelectedTableSidebarState
  tableContextSubtitle?: string
  onCloseTableSidebar: () => void
  selectedImageSidebar: SelectedImageSidebarState
  imageContextSubtitle?: string
  onCloseImageSidebar: () => void
  onReplaceImage: (imagePos: number | null) => void
  showInlineCommentPopover: boolean
  inlineCommentPosition: { top: number; left: number } | null
  onEditInlineCommentWithAI: () => void
  onSubmitInlineComment: (content: string) => Promise<void>
  onCloseInlineCommentPopover: () => void
  translate: TranslateFn
}

export function PagedDocumentEditorSidebarHost({
  documentId,
  editor,
  activeEditor,
  title,
  accessToken,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  rightSidebar,
  setRightSidebar,
  measuredHeaderHeight,
  documentRightPanelOffset,
  comments,
  commentsUnresolvedCount,
  commentsIsLoading,
  onCreateComment,
  onUpdateComment,
  onResolveComment,
  onDeleteComment,
  onCloseCommentsSidebar,
  onUnhighlightComment,
  onScrollToHighlight,
  showHeaderFooterSidebar,
  pagesEditorState,
  differentFirstPage,
  differentOddEven,
  headerTopMarginPx,
  footerBottomMarginPx,
  marginUnit,
  showDocumentBody,
  onShowDocumentBodyChange,
  onPersistPagesFromEditor,
  onOpenPageNumbers,
  onQuickPageNumberPlacement,
  onRemovePageNumber,
  onCloseHeaderFooterSidebar,
  selectedTableSidebar,
  tableContextSubtitle,
  onCloseTableSidebar,
  selectedImageSidebar,
  imageContextSubtitle,
  onCloseImageSidebar,
  onReplaceImage,
  showInlineCommentPopover,
  inlineCommentPosition,
  onEditInlineCommentWithAI,
  onSubmitInlineComment,
  onCloseInlineCommentPopover,
  translate
}: Readonly<PagedDocumentEditorSidebarHostProps>) {
  const headerHeight = measuredHeaderHeight || 120

  return (
    <>
      {documentId && rightSidebar === 'comments' && (
        <CommentPanel
          comments={comments}
          messages={{
            title: translate('shared-comment-panel-title'),
            unresolvedCount: translate('shared-comment-unresolved'),
            unresolvedTab: translate('shared-comment-unresolved-tab'),
            resolvedTab: translate('shared-comment-resolved-tab'),
            allCaughtUp: translate('shared-comment-all-caught-up'),
            allResolved: translate('shared-comment-all-resolved'),
            noResolved: translate('shared-comment-no-resolved'),
            resolvedHere: translate('shared-comment-resolved-here'),
            loading: translate('shared-comment-loading'),
            addPlaceholder: translate('shared-comment-placeholder')
          }}
          threadMessages={{
            reply: translate('shared-comment-reply'),
            edit: translate('shared-comment-edit'),
            resolve: translate('shared-comment-resolve'),
            delete: translate('shared-comment-delete'),
            resolved: translate('shared-comment-resolved'),
            confirmDelete: translate('shared-comment-confirm-delete'),
            editPlaceholder: translate('shared-comment-edit-placeholder'),
            replyPlaceholder: translate('shared-comment-reply-placeholder')
          }}
          editorMessages={{
            cancel: translate('shared-comment-cancel'),
            send: translate('shared-comment-send'),
            sending: translate('shared-comment-sending'),
            sendHint: translate('shared-comment-send-hint')
          }}
          unresolvedCount={commentsUnresolvedCount}
          isLoading={commentsIsLoading}
          onCreateComment={onCreateComment}
          onUpdateComment={onUpdateComment}
          onResolveComment={onResolveComment}
          onDeleteComment={onDeleteComment}
          onClose={onCloseCommentsSidebar}
          currentUserId={currentUserId || undefined}
          currentUserName={currentUserName || undefined}
          currentUserAvatar={currentUserAvatar || undefined}
          accessToken={accessToken}
          headerHeight={headerHeight}
          onUnhighlight={onUnhighlightComment}
          onScrollToHighlight={onScrollToHighlight}
          data-testid="document-comment-panel"
        />
      )}

      {documentId && rightSidebar === 'ai' && (
        <AiEditPanel
          accessToken={accessToken}
          editor={editor}
          documentId={documentId}
          documentTitle={title}
          onClose={() => setRightSidebar('closed')}
          currentUserId={currentUserId || undefined}
          headerHeight={headerHeight}
          data-testid="document-ai-edit-panel"
        />
      )}

      {showHeaderFooterSidebar && editor && pagesEditorState.activeEditor && pagesEditorState.activeEditorType && (
        <HeaderFooterSettingsSidebar
          editor={editor}
          overlayEditor={pagesEditorState.activeEditor}
          type={pagesEditorState.activeEditorType}
          pageNumber={pagesEditorState.activePageNumber ?? 1}
          differentFirstPage={differentFirstPage}
          differentOddEven={differentOddEven}
          headerTopMarginPx={headerTopMarginPx}
          footerBottomMarginPx={footerBottomMarginPx}
          marginUnit={marginUnit}
          showDocumentBody={showDocumentBody}
          onShowDocumentBodyChange={onShowDocumentBodyChange}
          onPersistPagesFromEditor={onPersistPagesFromEditor}
          onOpenPageNumbers={onOpenPageNumbers}
          onQuickPageNumberPlacement={onQuickPageNumberPlacement}
          onRemovePageNumber={onRemovePageNumber}
          headerHeight={headerHeight}
          rightOffset={documentRightPanelOffset}
          onClose={onCloseHeaderFooterSidebar}
          data-testid="document-header-footer-settings-sidebar"
        />
      )}

      {selectedTableSidebar.open &&
        selectedTableSidebar.tablePos != null &&
        (selectedTableSidebar.editor || activeEditor) && (
          <TableSettingsSidebar
            editor={selectedTableSidebar.editor || activeEditor}
            table={selectedTableSidebar}
            contextSubtitle={tableContextSubtitle}
            headerHeight={headerHeight}
            rightOffset={documentRightPanelOffset}
            onClose={onCloseTableSidebar}
            data-testid="document-table-settings-sidebar"
          />
        )}

      {(selectedImageSidebar.editor || activeEditor) && (
        <ImageSettingsSidebar
          editor={selectedImageSidebar.editor || activeEditor}
          image={selectedImageSidebar}
          contextSubtitle={imageContextSubtitle}
          headerHeight={headerHeight}
          rightOffset={documentRightPanelOffset}
          onClose={onCloseImageSidebar}
          onReplace={onReplaceImage}
          data-testid="document-image-settings-sidebar"
        />
      )}

      <InlineCommentPopover
        isOpen={showInlineCommentPopover}
        position={inlineCommentPosition}
        onEditWithAI={onEditInlineCommentWithAI}
        messages={{
          addComment: translate('shared-comment-add'),
          placeholder: translate('shared-comment-placeholder'),
          comment: translate('shared-comment-button')
        }}
        onSubmit={onSubmitInlineComment}
        onClose={onCloseInlineCommentPopover}
        data-testid="document-inline-comment-popover"
      />
    </>
  )
}
