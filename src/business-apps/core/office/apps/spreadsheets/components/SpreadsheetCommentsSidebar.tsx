/**
 * Docked comments rail for the spreadsheet viewer (between toolbar and sheet tabs/footer).
 */

import React, { memo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { CommentPanel, type CommentPanelProps } from '../../../../../platform/apps/shared/components/CommentPanel'
import translations from '../_i18n'

export interface SpreadsheetCommentsSidebarProps {
  onClose: () => void
  commentPanel: Pick<
    CommentPanelProps,
    | 'comments'
    | 'unresolvedCount'
    | 'isLoading'
    | 'onCreateComment'
    | 'onUpdateComment'
    | 'onResolveComment'
    | 'onUnresolveComment'
    | 'onDeleteComment'
    | 'onScrollToHighlight'
    | 'onUnhighlight'
  >
  currentUserId?: string
  currentUserName?: string
  currentUserAvatar?: string
  testId: string
}

export const SpreadsheetCommentsSidebar: React.FC<SpreadsheetCommentsSidebarProps> = memo(
  function SpreadsheetCommentsSidebar({
    onClose,
    commentPanel,
    currentUserId,
    currentUserName,
    currentUserAvatar,
    testId
  }) {
    const { t } = useTranslation(translations)

    return (
      <CommentPanel
        layout="docked"
        comments={commentPanel.comments}
        unresolvedCount={commentPanel.unresolvedCount}
        isLoading={commentPanel.isLoading}
        messages={{
          title: t('shared-comment-panel-title'),
          unresolvedCount: t('shared-comment-unresolved'),
          unresolvedTab: t('shared-comment-unresolved-tab'),
          resolvedTab: t('shared-comment-resolved-tab'),
          allCaughtUp: t('shared-comment-all-caught-up'),
          allResolved: t('shared-comment-all-resolved'),
          noResolved: t('shared-comment-no-resolved'),
          resolvedHere: t('shared-comment-resolved-here'),
          loading: t('shared-comment-loading'),
          addPlaceholder: t('shared-comment-placeholder')
        }}
        threadMessages={{
          reply: t('shared-comment-reply'),
          edit: t('shared-comment-edit'),
          resolve: t('shared-comment-resolve'),
          reopen: t('shared-comment-reopen'),
          delete: t('shared-comment-delete'),
          resolved: t('shared-comment-resolved'),
          confirmDelete: t('shared-comment-confirm-delete'),
          editPlaceholder: t('shared-comment-edit-placeholder'),
          replyPlaceholder: t('shared-comment-reply-placeholder')
        }}
        editorMessages={{
          cancel: t('shared-comment-cancel'),
          send: t('shared-comment-send'),
          sending: t('shared-comment-sending'),
          sendHint: t('shared-comment-send-hint')
        }}
        onCreateComment={commentPanel.onCreateComment}
        onUpdateComment={commentPanel.onUpdateComment}
        onResolveComment={commentPanel.onResolveComment}
        onUnresolveComment={commentPanel.onUnresolveComment}
        onDeleteComment={commentPanel.onDeleteComment}
        onClose={onClose}
        currentUserId={currentUserId}
        currentUserName={currentUserName || t('editor-user-fallback')}
        currentUserAvatar={currentUserAvatar || undefined}
        onScrollToHighlight={commentPanel.onScrollToHighlight}
        onUnhighlight={commentPanel.onUnhighlight}
        data-testid={`${testId}-comment-panel`}
      />
    )
  }
)
