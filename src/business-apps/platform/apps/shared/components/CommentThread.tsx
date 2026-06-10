/**
 * CommentThread Component
 *
 * Displays a comment with its replies and action buttons.
 */

import React, { useState } from 'react'
import {
  Button,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react'
import { MoreVertical, Reply, CheckCircle, Trash2, Edit2, User, Quote, Square, Layers } from 'lucide-react'
import type { Comment } from '../types/versioning'
import { formatDistanceToNow } from 'date-fns'
import { CommentEditor } from './CommentEditor'
import sharedTranslations from '../_i18n'
import { getDateFnsLocale } from '../utils/dateLocale'

function formatCommentRelativeTime(value: string, locale?: string): string {
  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return formatDistanceToNow(parsedDate, { addSuffix: true, locale: getDateFnsLocale(locale) })
}

/**
 * ReplyItem - Individual reply (avatar comes from backend)
 */
const ReplyItem: React.FC<{ reply: Comment; userFallback: string; locale?: string }> = ({
  reply,
  userFallback,
  locale
}) => {
  return (
    <div className="gba:flex gba:items-start gba:gap-2.5">
      <Avatar className="gba:h-7 gba:w-7 gba:ring-1 gba:ring-background">
        {reply.createdByAvatar && <AvatarImage src={reply.createdByAvatar} alt={reply.createdByName || userFallback} />}
        <AvatarFallback className="gba:bg-muted gba:text-muted-foreground">
          <User className="gba:h-3.5 gba:w-3.5" />
        </AvatarFallback>
      </Avatar>
      <div className="gba:flex-1 gba:min-w-0">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
          <span className="gba:font-semibold gba:text-xs">{reply.createdByName || userFallback}</span>
          <span className="gba:text-xs gba:text-muted-foreground">
            {formatCommentRelativeTime(reply.createdAt, locale)}
          </span>
        </div>
        <p className="gba:text-sm gba:leading-relaxed gba:text-foreground/90">{reply.content}</p>
      </div>
    </div>
  )
}

export interface CommentThreadMessages {
  reply?: string
  edit?: string
  resolve?: string
  reopen?: string
  delete?: string
  resolved?: string
  confirmDelete?: string
  editPlaceholder?: string
  replyPlaceholder?: string
}

export interface CommentThreadProps {
  comment: Comment
  replies?: Comment[]
  onReply: (content: string) => Promise<void>
  onUpdate: (content: string) => Promise<void>
  onResolve: () => Promise<void>
  onUnresolve: () => Promise<void>
  onDelete: () => Promise<void>
  currentUserId?: string
  onUnhighlight?: (commentId: string) => void
  onScrollToHighlight?: (commentId: string) => void
  isActive?: boolean
  canReply?: boolean
  canResolve?: boolean
  canEdit?: boolean
  canDelete?: boolean
  /**
   * When provided, overrides the default anchor label for slide-anchored
   * comments (e.g. "Slide 1" instead of "Whole slide"/"Object"). For
   * text-range anchors it is shown alongside the quoted snippet.
   */
  anchorLabel?: string
  messages?: CommentThreadMessages
  'data-testid'?: string
}

/**
 * Single comment thread with replies
 */
export const CommentThread: React.FC<CommentThreadProps> = ({
  comment,
  replies = [],
  onReply,
  onUpdate,
  onResolve,
  onUnresolve,
  onDelete,
  currentUserId,
  onUnhighlight,
  onScrollToHighlight,
  isActive = false,
  canReply = true,
  canResolve = true,
  canEdit = true,
  canDelete = true,
  anchorLabel,
  messages: messagesProp,
  'data-testid': testId = 'comment-thread'
}) => {
  const { t, locale } = useTranslation(sharedTranslations)
  const defaultCommentThreadMessages = {
    reply: t('comment-thread-reply'),
    edit: t('comment-thread-edit'),
    resolve: t('comment-thread-resolve'),
    reopen: t('comment-thread-reopen'),
    delete: t('comment-thread-delete'),
    resolved: t('comment-thread-resolved'),
    confirmDelete: t('comment-thread-confirm-delete'),
    editPlaceholder: t('comment-thread-edit-placeholder'),
    replyPlaceholder: t('comment-thread-reply-placeholder')
  }
  const messages = { ...defaultCommentThreadMessages, ...messagesProp }
  const userFallback = t('comment-thread-user-fallback')
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [isReplying, setIsReplying] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent] = useState(comment.content)

  const isOwnComment = Boolean(currentUserId && comment.createdBy === currentUserId)
  const isResolved = !!comment.resolvedAt
  const isInlineComment = comment.type === 'inline' || comment.type === 'selection'
  const isCellComment = comment.type === 'cell'
  const hasCellReference = isCellComment && comment.cellReference
  const slideAnchorKind = comment.slideAnchorData?.kind
  const slideAnchorSelectedText = slideAnchorKind === 'text-range' ? comment.slideAnchorData?.selectedText : undefined
  const hasSlideAnchor = Boolean(slideAnchorKind)
  const showSlideWholeAnchor = slideAnchorKind === 'slide'
  const showSlideElementAnchor = slideAnchorKind === 'element'
  const showSlideTextAnchor = slideAnchorKind === 'text-range'
  const canReplyToThread = canReply && !isResolved
  const canEditThread = canEdit && isOwnComment && !isResolved
  const canResolveThread = canResolve && !isResolved
  const canReopenThread = canResolve && isResolved
  const canDeleteThread = canDelete && isOwnComment
  const hasActions = canReplyToThread || canEditThread || canResolveThread || canReopenThread || canDeleteThread

  const handleResolveAndUnhighlight = async () => {
    await onResolve()
    if (isInlineComment && onUnhighlight) {
      onUnhighlight(comment.id)
    }
  }

  const handleDeleteAndUnhighlight = async () => {
    if (window.confirm(messages.confirmDelete)) {
      await onDelete()
      if (isInlineComment && onUnhighlight) {
        onUnhighlight(comment.id)
      }
    }
  }

  const handleReopen = async () => {
    await onUnresolve()
  }

  const handleReply = async (content: string) => {
    setIsReplying(true)
    try {
      await onReply(content)
      setShowReplyInput(false)
    } finally {
      setIsReplying(false)
    }
  }

  const handleUpdate = async (content: string) => {
    await onUpdate(content)
    setIsEditing(false)
  }

  const handleAnchorMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
  }

  return (
    <div
      className={`gba:min-w-0 gba:overflow-hidden gba:rounded-xl gba:border gba:bg-card/50 gba:p-4 gba:transition-all hover:gba:shadow-sm ${
        isActive
          ? 'gba:border-primary gba:bg-primary/5 gba:ring-2 gba:ring-primary/15'
          : 'gba:border-border/50 hover:gba:border-border'
      }`}
      data-testid={`${testId}-${comment.id}`}
      data-active={isActive ? 'true' : 'false'}
    >
      {/* Comment header */}
      <div className="gba:flex gba:items-start gba:gap-3 gba:mb-3">
        <Avatar className="gba:h-9 gba:w-9 gba:ring-2 gba:ring-background">
          {comment.createdByAvatar && (
            <AvatarImage src={comment.createdByAvatar} alt={comment.createdByName || userFallback} />
          )}
          <AvatarFallback className="gba:bg-gradient-to-br gba:from-primary gba:to-primary/70 gba:text-primary-foreground">
            <User className="gba:h-4 gba:w-4" />
          </AvatarFallback>
        </Avatar>

        <div className="gba:flex-1 gba:min-w-0">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
            <span className="gba:font-semibold gba:text-sm">{comment.createdByName || userFallback}</span>
            <span className="gba:text-xs gba:text-muted-foreground">
              {formatCommentRelativeTime(comment.createdAt, locale)}
            </span>
            {isResolved && (
              <Badge
                variant="success"
                className="gba:h-5 gba:w-5 gba:p-0 gba:flex gba:items-center gba:justify-center"
                aria-label={messages.resolved}
                data-testid={`${testId}-resolved-badge-${comment.id}`}
              >
                <CheckCircle className="gba:h-3 gba:w-3" aria-hidden />
              </Badge>
            )}
          </div>

          {/* Cell reference for spreadsheet comments */}
          {hasCellReference && (
            <div className="gba:mb-2 gba:flex gba:items-center gba:gap-1.5">
              {onScrollToHighlight ? (
                <button
                  type="button"
                  onMouseDown={handleAnchorMouseDown}
                  onClick={() => onScrollToHighlight(comment.id)}
                  className="gba:inline-flex gba:items-center gba:rounded-md gba:border gba:border-primary/20 gba:bg-primary/5 gba:px-2 gba:py-1 gba:text-left gba:transition-colors hover:gba:bg-primary/10 focus-visible:gba:outline-none focus-visible:gba:ring-2 focus-visible:gba:ring-primary/20"
                  data-testid={`${testId}-cell-ref-${comment.id}`}
                >
                  <span className="gba:text-xs gba:font-mono gba:text-primary">
                    {t('comment-thread-cell-reference', { reference: comment.cellReference })}
                  </span>
                </button>
              ) : (
                <Badge
                  variant="outline"
                  className="gba:text-xs gba:font-mono gba:bg-muted/50"
                  data-testid={`${testId}-cell-ref-${comment.id}`}
                >
                  {t('comment-thread-cell-reference', { reference: comment.cellReference })}
                </Badge>
              )}
            </div>
          )}

          {/* Slide anchor reference */}
          {showSlideWholeAnchor && (
            <button
              type="button"
              onMouseDown={handleAnchorMouseDown}
              onClick={() => onScrollToHighlight?.(comment.id)}
              className="gba:mb-2 gba:flex gba:items-center gba:gap-1.5 gba:rounded-md gba:border gba:border-primary/20 gba:bg-primary/5 gba:px-2 gba:py-1 gba:text-left gba:transition-colors hover:gba:bg-primary/10"
              data-testid={`${testId}-slide-anchor-${comment.id}`}
            >
              <Layers className="gba:h-3.5 gba:w-3.5 gba:text-primary" />
              <span className="gba:text-xs gba:font-medium gba:text-primary">
                {anchorLabel || t('comment-thread-anchor-whole-slide')}
              </span>
            </button>
          )}
          {showSlideElementAnchor && (
            <button
              type="button"
              onMouseDown={handleAnchorMouseDown}
              onClick={() => onScrollToHighlight?.(comment.id)}
              className="gba:mb-2 gba:flex gba:items-center gba:gap-1.5 gba:rounded-md gba:border gba:border-primary/20 gba:bg-primary/5 gba:px-2 gba:py-1 gba:text-left gba:transition-colors hover:gba:bg-primary/10"
              data-testid={`${testId}-slide-anchor-${comment.id}`}
            >
              <Square className="gba:h-3.5 gba:w-3.5 gba:text-primary" />
              <span className="gba:text-xs gba:font-medium gba:text-primary">
                {anchorLabel
                  ? `${anchorLabel} · ${t('comment-thread-anchor-object')}`
                  : t('comment-thread-anchor-object')}
              </span>
            </button>
          )}
          {showSlideTextAnchor && (
            <button
              type="button"
              onMouseDown={handleAnchorMouseDown}
              onClick={() => onScrollToHighlight?.(comment.id)}
              className="gba:mb-2 gba:flex gba:w-full gba:min-w-0 gba:flex-col gba:gap-1.5 gba:text-left"
              data-testid={`${testId}-slide-anchor-${comment.id}`}
            >
              <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:self-start gba:rounded-md gba:border gba:border-primary/20 gba:bg-primary/5 gba:px-2 gba:py-1 gba:transition-colors hover:gba:bg-primary/10">
                <Quote className="gba:h-3.5 gba:w-3.5 gba:text-primary" />
                <span className="gba:text-xs gba:font-medium gba:text-primary">
                  {anchorLabel || t('comment-thread-anchor-text')}
                </span>
              </span>
              {slideAnchorSelectedText && (
                <span className="gba:min-w-0 gba:rounded-md gba:border gba:border-warning/20 gba:bg-warning/10 gba:px-2 gba:py-1.5">
                  <span className="gba:block gba:min-w-0 gba:text-xs gba:text-foreground/70 gba:italic gba:line-clamp-2">
                    "{slideAnchorSelectedText}"
                  </span>
                </span>
              )}
            </button>
          )}

          {/* Inline comment reference (legacy; suppressed when a slide anchor is present) */}
          {!hasSlideAnchor && isInlineComment && comment.selectedText && (
            <button
              onMouseDown={handleAnchorMouseDown}
              onClick={() => onScrollToHighlight?.(comment.id)}
              className="gba:mb-2 gba:w-full gba:min-w-0 gba:rounded-md gba:border gba:border-warning/20 gba:bg-warning/10 gba:p-2 gba:text-left gba:transition-colors hover:gba:bg-warning/20 gba:cursor-pointer"
            >
              <div className="gba:flex gba:min-w-0 gba:items-start gba:gap-2">
                <Quote className="gba:h-3.5 gba:w-3.5 gba:text-warning gba:mt-0.5 gba:flex-shrink-0" />
                <p className="gba:min-w-0 gba:text-xs gba:text-foreground/70 gba:italic gba:line-clamp-2">
                  "{comment.selectedText}"
                </p>
              </div>
            </button>
          )}

          {/* Comment content */}
          {isEditing ? (
            <CommentEditor
              initialValue={editContent}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditing(false)}
              isSubmitting={false}
              placeholder={messages.editPlaceholder}
            />
          ) : (
            <p className="gba:text-sm gba:leading-relaxed gba:text-foreground/90">{comment.content}</p>
          )}
        </div>

        {/* Actions menu */}
        {hasActions ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                data-testid={`comment-menu-${comment.id}`}
                className="gba:h-7 gba:w-7 gba:p-0 gba:rounded-full hover:gba:bg-muted"
              >
                <MoreVertical className="gba:h-4 gba:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="left" className="gba:w-48" style={{ zIndex: 1100 }}>
              {canReplyToThread && (
                <DropdownMenuItem onClick={() => setShowReplyInput(!showReplyInput)}>
                  <Reply className="gba:h-4 gba:w-4 gba:mr-2" />
                  {messages.reply}
                </DropdownMenuItem>
              )}
              {canEditThread && (
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit2 className="gba:h-4 gba:w-4 gba:mr-2" />
                  {messages.edit}
                </DropdownMenuItem>
              )}
              {canResolveThread && (
                <DropdownMenuItem onClick={handleResolveAndUnhighlight}>
                  <CheckCircle className="gba:h-4 gba:w-4 gba:mr-2" />
                  {messages.resolve}
                </DropdownMenuItem>
              )}
              {canReopenThread && (
                <DropdownMenuItem onClick={handleReopen} data-testid={`comment-reopen-${comment.id}`}>
                  <ArrowCounterClockwiseIcon className="gba:h-4 gba:w-4 gba:mr-2" />
                  {messages.reopen}
                </DropdownMenuItem>
              )}
              {canDeleteThread && (
                <DropdownMenuItem onClick={handleDeleteAndUnhighlight} className="gba:text-destructive">
                  <Trash2 className="gba:h-4 gba:w-4 gba:mr-2" />
                  {messages.delete}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="gba:ml-12 gba:mt-3 gba:space-y-3 gba:border-l-2 gba:border-primary/20 gba:pl-4">
          {replies.map(reply => (
            <ReplyItem key={reply.id} reply={reply} userFallback={userFallback} locale={locale} />
          ))}
        </div>
      )}

      {/* Reply input */}
      {showReplyInput && canReplyToThread && (
        <div className="gba:ml-12 gba:mt-3 gba:min-w-0 gba:border-l-2 gba:border-primary/20 gba:pl-4">
          <CommentEditor
            onSubmit={handleReply}
            onCancel={() => setShowReplyInput(false)}
            isSubmitting={isReplying}
            placeholder={messages.replyPlaceholder}
            data-testid={`reply-editor-${comment.id}`}
          />
        </div>
      )}
    </div>
  )
}
