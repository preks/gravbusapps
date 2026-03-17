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
import { MoreVertical, Reply, CheckCircle, Trash2, Edit2, User, Quote } from 'lucide-react'
import type { Comment } from '../types/versioning'
import { formatDistanceToNow } from 'date-fns'
import { CommentEditor } from './CommentEditor'
import sharedTranslations from '../_i18n'

/**
 * ReplyItem - Individual reply (avatar comes from backend)
 */
const ReplyItem: React.FC<{ reply: Comment; userFallback: string }> = ({ reply, userFallback }) => {
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
            {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
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
  onDelete: () => Promise<void>
  currentUserId?: string
  onUnhighlight?: (commentId: string) => void
  onScrollToHighlight?: (commentId: string) => void
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
  onDelete,
  currentUserId,
  onUnhighlight,
  onScrollToHighlight,
  messages: messagesProp,
  'data-testid': testId = 'comment-thread'
}) => {
  const { t } = useTranslation(sharedTranslations)
  const defaultCommentThreadMessages = {
    reply: t('comment-thread-reply'),
    edit: t('comment-thread-edit'),
    resolve: t('comment-thread-resolve'),
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

  const isOwnComment = currentUserId && comment.createdBy === currentUserId
  const isResolved = !!comment.resolvedAt
  const isInlineComment = comment.type === 'inline' || comment.type === 'selection'
  const isCellComment = comment.type === 'cell'
  const hasCellReference = isCellComment && comment.cellReference

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

  return (
    <div
      className={`gba:rounded-xl gba:border gba:p-4 gba:transition-all ${
        isResolved
          ? 'gba:border-success/30 gba:bg-success/5'
          : 'gba:border-border/50 gba:bg-card/50 hover:gba:border-border hover:gba:shadow-sm'
      }`}
      data-testid={`${testId}-${comment.id}`}
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
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            {isResolved && (
              <Badge variant="success" className="gba:text-xs gba:h-5">
                <CheckCircle className="gba:h-3 gba:w-3 gba:mr-1" />
                {messages.resolved}
              </Badge>
            )}
          </div>

          {/* Cell reference for spreadsheet comments - display only (setSelection causes page refresh) */}
          {hasCellReference && (
            <div className="gba:mb-2 gba:flex gba:items-center gba:gap-1.5">
              <Badge
                variant="outline"
                className="gba:text-xs gba:font-mono gba:bg-muted/50"
                data-testid={`${testId}-cell-ref-${comment.id}`}
              >
                Cell {comment.cellReference}
              </Badge>
            </div>
          )}

          {/* Inline comment reference */}
          {isInlineComment && comment.selectedText && (
            <button
              onClick={() => onScrollToHighlight?.(comment.id)}
              className="gba:mb-2 gba:p-2 gba:rounded-md gba:bg-warning/10 gba:border gba:border-warning/20 gba:w-full gba:text-left hover:gba:bg-warning/20 gba:transition-colors gba:cursor-pointer"
            >
              <div className="gba:flex gba:items-start gba:gap-2">
                <Quote className="gba:h-3.5 gba:w-3.5 gba:text-warning gba:mt-0.5 gba:flex-shrink-0" />
                <p className="gba:text-xs gba:text-foreground/70 gba:italic gba:line-clamp-2">
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
            {!isResolved && (
              <DropdownMenuItem onClick={() => setShowReplyInput(!showReplyInput)}>
                <Reply className="gba:h-4 gba:w-4 gba:mr-2" />
                {messages.reply}
              </DropdownMenuItem>
            )}
            {isOwnComment && !isResolved && (
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit2 className="gba:h-4 gba:w-4 gba:mr-2" />
                {messages.edit}
              </DropdownMenuItem>
            )}
            {!isResolved && (
              <DropdownMenuItem onClick={handleResolveAndUnhighlight}>
                <CheckCircle className="gba:h-4 gba:w-4 gba:mr-2" />
                {messages.resolve}
              </DropdownMenuItem>
            )}
            {isOwnComment && (
              <DropdownMenuItem onClick={handleDeleteAndUnhighlight} className="gba:text-destructive">
                <Trash2 className="gba:h-4 gba:w-4 gba:mr-2" />
                {messages.delete}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="gba:ml-12 gba:mt-3 gba:space-y-3 gba:border-l-2 gba:border-primary/20 gba:pl-4">
          {replies.map(reply => (
            <ReplyItem key={reply.id} reply={reply} userFallback={userFallback} />
          ))}
        </div>
      )}

      {/* Reply input */}
      {showReplyInput && !isResolved && (
        <div className="gba:ml-12 gba:mt-3 gba:pl-4 gba:border-l-2 gba:border-primary/20">
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
