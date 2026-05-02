/**
 * CommentPanel Component
 *
 * Sidebar panel for displaying and managing comments on documents, notes, and spreadsheets.
 */

import React, { useState } from 'react'
import { Button, Badge, useTranslation } from '@newwork/nw-design-system'
import { MessageSquare, MessageCircle, CheckCircle, X } from 'lucide-react'
import type { Comment } from '../types/versioning'
import { CommentThread } from './CommentThread'
import { CommentEditor } from './CommentEditor'
import sharedTranslations from '../_i18n'

export interface CommentPanelMessages {
  title?: string
  unresolvedCount?: string
  unresolvedTab?: string
  resolvedTab?: string
  allCaughtUp?: string
  allResolved?: string
  noResolved?: string
  resolvedHere?: string
  loading?: string
  addPlaceholder?: string
  noComments?: string
  noCommentsHint?: string
}

export interface CommentPanelThreadMessages {
  reply?: string
  edit?: string
  resolve?: string
  delete?: string
  resolved?: string
  confirmDelete?: string
  editPlaceholder?: string
  replyPlaceholder?: string
}

export interface CommentPanelEditorMessages {
  cancel?: string
  send?: string
  sending?: string
  sendHint?: string
}

export interface CommentPanelProps {
  comments: Comment[]
  unresolvedCount: number
  isLoading: boolean
  onCreateComment: (content: string, parentId?: string, userName?: string, userAvatar?: string) => Promise<void>
  onUpdateComment: (commentId: string, content: string) => Promise<void>
  onResolveComment: (commentId: string) => Promise<void>
  onDeleteComment: (commentId: string) => Promise<void>
  onClose: () => void
  currentUserId?: string
  currentUserName?: string
  currentUserAvatar?: string
  accessToken?: string
  headerHeight?: number
  onUnhighlight?: (commentId: string) => void
  onScrollToHighlight?: (commentId: string) => void
  messages?: CommentPanelMessages
  threadMessages?: CommentPanelThreadMessages
  editorMessages?: CommentPanelEditorMessages
  disableCreateComment?: boolean
  disabledCreateMessage?: string
  'data-testid'?: string
}

/**
 * Comment panel with Unresolved / Resolved tabs
 */
export const CommentPanel: React.FC<CommentPanelProps> = ({
  comments,
  unresolvedCount,
  isLoading,
  onCreateComment,
  onUpdateComment,
  onResolveComment,
  onDeleteComment,
  onClose,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  accessToken,
  headerHeight = 64,
  onUnhighlight,
  onScrollToHighlight,
  messages: messagesProp,
  threadMessages,
  editorMessages,
  disableCreateComment = false,
  disabledCreateMessage,
  'data-testid': testId = 'comment-panel'
}) => {
  const { t } = useTranslation(sharedTranslations)
  const defaultMessages: Required<CommentPanelMessages> = {
    title: t('comment-panel-title'),
    unresolvedCount: t('comment-panel-unresolved'),
    unresolvedTab: t('comment-panel-unresolved-tab'),
    resolvedTab: t('comment-panel-resolved-tab'),
    allCaughtUp: t('comment-panel-all-caught-up'),
    allResolved: t('comment-panel-all-resolved'),
    noResolved: t('comment-panel-no-resolved'),
    resolvedHere: t('comment-panel-resolved-here'),
    loading: t('comment-panel-loading'),
    addPlaceholder: t('comment-panel-add-placeholder'),
    noComments: t('comment-panel-no-comments'),
    noCommentsHint: t('comment-panel-no-comments-hint')
  }
  const messages = { ...defaultMessages, ...messagesProp }

  const [activeTab, setActiveTab] = useState<'unresolved' | 'resolved'>('unresolved')
  const [isCreating, setIsCreating] = useState(false)

  const topLevelComments = comments.filter(c => !c.parentId)
  const unresolvedComments = topLevelComments.filter(c => !c.resolvedAt)
  const resolvedComments = topLevelComments.filter(c => !!c.resolvedAt)
  const sortByNewest = (a: Comment, b: Comment) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  const displayComments =
    activeTab === 'unresolved' ? [...unresolvedComments].sort(sortByNewest) : [...resolvedComments].sort(sortByNewest)

  const handleCreateComment = async (content: string) => {
    setIsCreating(true)
    try {
      await onCreateComment(content, undefined, currentUserName, currentUserAvatar)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div
      className="gba:fixed gba:bottom-0 gba:bg-background gba:border-l gba:border-border/50 gba:flex gba:flex-col"
      style={{
        top: `${headerHeight}px`,
        right: 16,
        bottom: 32,
        width: 380,
        zIndex: 1000,
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.08)'
      }}
      data-testid={testId}
    >
      {/* Modern Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:border-b gba:border-border/50 gba:bg-gradient-to-b gba:from-muted/20 gba:to-transparent">
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-7 gba:h-7 gba:rounded-md gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
            <MessageSquare className="gba:h-4 gba:w-4 gba:text-primary" />
          </div>
          <div>
            <h3 className="gba:font-semibold gba:text-sm">{messages.title}</h3>
            {unresolvedCount > 0 ? (
              <p className="gba:text-xs gba:text-muted-foreground">
                {unresolvedCount} {messages.unresolvedCount}
              </p>
            ) : topLevelComments.length > 0 ? (
              <p className="gba:text-xs gba:text-muted-foreground">{messages.allResolved}</p>
            ) : null}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          data-testid="comment-panel-close"
          className="gba:h-8 gba:w-8 gba:p-0 gba:rounded-full hover:gba:bg-muted"
        >
          <X className="gba:h-4 gba:w-4" />
        </Button>
      </div>

      <div className="gba:flex gba:gap-1 gba:p-1 gba:bg-muted/30">
        <button
          type="button"
          onClick={() => setActiveTab('unresolved')}
          className={`gba:flex-1 gba:flex gba:items-center gba:justify-center gba:gap-2 gba:px-3 gba:py-1.5 gba:rounded-lg gba:text-sm gba:font-medium gba:transition-all ${
            activeTab === 'unresolved'
              ? 'gba:bg-background gba:text-foreground gba:shadow-sm'
              : 'gba:text-muted-foreground hover:gba:text-foreground hover:gba:bg-background/50'
          }`}
          data-testid="unresolved-tab"
        >
          <MessageCircle className="gba:h-4 gba:w-4" />
          <span>{messages.unresolvedTab}</span>
          {unresolvedCount > 0 && (
            <Badge
              variant={activeTab === 'unresolved' ? 'warning' : 'outline'}
              className="gba:h-5 gba:px-1.5 gba:text-xs"
            >
              {unresolvedCount}
            </Badge>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('resolved')}
          className={`gba:flex-1 gba:flex gba:items-center gba:justify-center gba:gap-2 gba:px-3 gba:py-1.5 gba:rounded-lg gba:text-sm gba:font-medium gba:transition-all ${
            activeTab === 'resolved'
              ? 'gba:bg-background gba:text-foreground gba:shadow-sm'
              : 'gba:text-muted-foreground hover:gba:text-foreground hover:gba:bg-background/50'
          }`}
          data-testid="resolved-comments-tab"
        >
          <CheckCircle className="gba:h-4 gba:w-4" />
          <span>{messages.resolvedTab}</span>
          <Badge variant={activeTab === 'resolved' ? 'success' : 'outline'} className="gba:h-5 gba:px-1.5 gba:text-xs">
            {resolvedComments.length}
          </Badge>
        </button>
      </div>

      <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:overflow-x-hidden gba:px-3 gba:pr-6">
        {isLoading ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
            <p className="gba:text-sm gba:text-muted-foreground">{messages.loading}</p>
          </div>
        ) : displayComments.length === 0 ? (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-6 gba:text-center">
            <div className="gba:w-12 gba:h-12 gba:rounded-xl gba:bg-muted/50 gba:flex gba:items-center gba:justify-center gba:mb-3">
              {activeTab === 'unresolved' ? (
                <MessageSquare className="gba:h-6 gba:w-6 gba:text-muted-foreground/50" />
              ) : (
                <CheckCircle className="gba:h-6 gba:w-6 gba:text-muted-foreground/50" />
              )}
            </div>
            <p className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">
              {activeTab === 'unresolved'
                ? topLevelComments.length === 0
                  ? messages.noComments
                  : messages.allCaughtUp
                : messages.noResolved}
            </p>
            <p className="gba:text-xs gba:text-muted-foreground gba:max-w-[200px]">
              {activeTab === 'unresolved'
                ? topLevelComments.length === 0
                  ? messages.noCommentsHint
                  : messages.allResolved
                : messages.resolvedHere}
            </p>
          </div>
        ) : (
          <div className="gba:space-y-2 gba:py-2">
            {displayComments.map(comment => (
              <CommentThread
                key={comment.id}
                comment={comment}
                replies={comments.filter(c => c.parentId === comment.id)}
                onReply={content => onCreateComment(content, comment.id, currentUserName, currentUserAvatar)}
                onUpdate={content => onUpdateComment(comment.id, content)}
                onResolve={() => onResolveComment(comment.id)}
                onDelete={() => onDeleteComment(comment.id)}
                currentUserId={currentUserId}
                accessToken={accessToken}
                onUnhighlight={onUnhighlight}
                onScrollToHighlight={onScrollToHighlight}
                messages={threadMessages}
              />
            ))}
          </div>
        )}
      </div>

      {/* New comment input - flex-shrink-0 keeps footer at bottom */}
      <div className="gba:flex-shrink-0 gba:p-2 gba:border-t gba:border-border/50 gba:bg-muted/20">
        {disableCreateComment ? (
          <p
            className="gba:text-xs gba:text-muted-foreground gba:px-1 gba:py-2"
            data-testid="comment-panel-create-disabled"
          >
            {disabledCreateMessage || messages.noCommentsHint}
          </p>
        ) : (
          <CommentEditor
            onSubmit={handleCreateComment}
            isSubmitting={isCreating}
            placeholder={messages.addPlaceholder}
            messages={editorMessages}
            data-testid="new-comment-editor"
          />
        )}
      </div>
    </div>
  )
}
