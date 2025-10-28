import React, { useState } from 'react'
import { Button, Avatar, AvatarFallback } from '@newwork/nw-design-system'
import { MessageCircle } from 'lucide-react'
import { CommentWithReplies } from '../../hooks/useArticleComments'
import CommentForm from './CommentForm'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export interface CommentItemProps {
  comment: CommentWithReplies
  articleId: string
  accessToken: string
  currentUserId: string | undefined
  onCommentCreated?: () => void
  depth?: number
  'data-testid'?: string
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  articleId,
  accessToken,
  currentUserId,
  onCommentCreated,
  depth = 0,
  'data-testid': dataTestId = 'comment-item'
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false)

  const isOwnComment = currentUserId === comment.createdBy
  const initials = 'U' // Placeholder - would need user data to get real initials
  const formattedDate = dayjs(comment.createdAt).fromNow()

  const handleReplySuccess = () => {
    setShowReplyForm(false)
    if (onCommentCreated) {
      onCommentCreated()
    }
  }

  // Limit nesting depth
  const maxDepth = 3
  const indentClass = depth > 0 ? 'gba:ml-8 gba:border-l gba:border-border gba:pl-4' : ''

  return (
    <div className={`gba:space-y-3 ${indentClass}`} data-testid={`${dataTestId}-${comment.id}`}>
      {/* Comment */}
      <div className="gba:flex gba:gap-3">
        <Avatar className="gba:w-8 gba:h-8">
          <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>
        </Avatar>

        <div className="gba:flex-1 gba:space-y-1">
          {/* Header */}
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:font-semibold gba:text-foreground">{isOwnComment ? 'You' : 'User'}</span>
            <span className="gba:text-xs gba:text-muted-foreground">{formattedDate}</span>
          </div>

          {/* Content */}
          <p className="gba:text-sm gba:text-foreground gba:whitespace-pre-wrap">{comment.comment}</p>

          {/* Actions */}
          {depth < maxDepth && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1">
              <Button
                variant="ghost"
                size="sm"
                className="gba:h-auto gba:p-1 gba:text-xs gba:text-muted-foreground"
                onClick={() => setShowReplyForm(!showReplyForm)}
                data-testid={`${dataTestId}-reply-button-${comment.id}`}
              >
                <MessageCircle className="gba:w-3 gba:h-3 gba:mr-1" />
                Reply
              </Button>
            </div>
          )}

          {/* Reply Form */}
          {showReplyForm && (
            <div className="gba:mt-2">
              <CommentForm
                articleId={articleId}
                articleCommentId={comment.id}
                accessToken={accessToken}
                onSuccess={handleReplySuccess}
                onCancel={() => setShowReplyForm(false)}
                placeholder="Write a reply..."
                data-testid={`${dataTestId}-reply-form-${comment.id}`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="gba:space-y-3">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              articleId={articleId}
              accessToken={accessToken}
              currentUserId={currentUserId}
              onCommentCreated={onCommentCreated}
              depth={depth + 1}
              data-testid={dataTestId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default CommentItem
