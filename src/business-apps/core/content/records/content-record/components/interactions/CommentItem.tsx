import React, { useState } from 'react'
import { Button, Avatar, AvatarFallback, AvatarImage } from '@newwork/nw-design-system'
import { MessageCircle, ChevronUp, ArrowBigUp } from 'lucide-react'
import { CommentWithReplies } from '@/common/data/content/hooks/useContentComments'
import CommentForm from './CommentForm'
import { EmployeeHoverCard } from '@/common/components/employee'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export interface CommentItemProps {
  comment: CommentWithReplies
  articleId: string
  accessToken: string
  employeeId: string
  currentUserId: string | undefined
  onCommentCreated?: () => void
  depth?: number
  showAllReplies?: boolean
  onViewThread?: (comment: CommentWithReplies) => void
  translatedContent?: string
  'data-testid'?: string
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  articleId,
  accessToken,
  employeeId,
  currentUserId,
  onCommentCreated,
  depth = 0,
  showAllReplies = false,
  onViewThread,
  translatedContent,
  'data-testid': dataTestId = 'comment-item'
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Use translated content if available, otherwise use original
  const displayContent = translatedContent || comment.content || ''

  const isOwnComment = currentUserId === comment.createdBy
  const displayName = comment.creatorEmployee?.displayName || 'Unknown User'
  const initials =
    displayName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'
  const formattedDate = dayjs(comment.createdAt).fromNow()

  // Count total replies
  const countTotalReplies = (c: CommentWithReplies): number => {
    let count = c.replies?.length || 0
    c.replies?.forEach(reply => {
      count += countTotalReplies(reply)
    })
    return count
  }
  const totalReplies = countTotalReplies(comment)

  const handleReplySuccess = () => {
    setShowReplyForm(false)
    if (onCommentCreated) {
      onCommentCreated()
    }
  }

  const handleContinueThread = () => {
    if (onViewThread) {
      onViewThread(comment)
    }
  }

  // Limit nesting depth - Reddit style
  const maxDepth = 5
  const showContinueThread = !showAllReplies && depth === maxDepth && comment.replies && comment.replies.length > 0
  const shouldShowReplies = !isCollapsed && (showAllReplies || depth < maxDepth)
  const indentClass = depth > 0 ? 'gba:ml-8 gba:border-l gba:border-border gba:pl-4' : ''

  return (
    <div className={`gba:space-y-3 ${indentClass}`} data-testid={`${dataTestId}-${comment.id}`}>
      {/* Comment */}
      <div className="gba:flex gba:gap-3">
        {/* Collapse/Expand Line */}
        {totalReplies > 0 && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="gba:flex gba:flex-col gba:items-center gba:cursor-pointer gba:group gba:hover:opacity-70"
            data-testid={`${dataTestId}-collapse-button-${comment.id}`}
          >
            <Avatar className="gba:w-8 gba:h-8">
              <AvatarImage
                src={
                  comment.creatorEmployee?.pictureThumbnail
                    ? `data:image/jpeg;base64,${comment.creatorEmployee.pictureThumbnail}`
                    : undefined
                }
                alt={displayName}
              />
              <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>
            </Avatar>
            {!isCollapsed && totalReplies > 0 && (
              <div className="gba:flex-1 gba:w-0.5 gba:bg-border gba:mt-2 gba:min-h-[20px] group-hover:gba:bg-primary" />
            )}
          </button>
        )}
        {totalReplies === 0 && (
          <Avatar className="gba:w-8 gba:h-8">
            <AvatarImage
              src={
                comment.creatorEmployee?.pictureThumbnail
                  ? `data:image/jpeg;base64,${comment.creatorEmployee.pictureThumbnail}`
                  : undefined
              }
              alt={displayName}
            />
            <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>
          </Avatar>
        )}

        <div className="gba:flex-1 gba:space-y-1">
          {/* Header */}
          <div className="gba:flex gba:items-center gba:gap-2">
            {(() => {
              if (isOwnComment) {
                return <span className="gba:text-sm gba:font-semibold gba:text-foreground">You</span>
              }
              if (comment.creatorEmployee) {
                return (
                  <EmployeeHoverCard employee={comment.creatorEmployee}>
                    <span className="gba:text-sm gba:font-semibold gba:text-foreground gba:cursor-pointer hover:gba:text-primary hover:gba:underline">
                      {displayName}
                    </span>
                  </EmployeeHoverCard>
                )
              }
              return <span className="gba:text-sm gba:font-semibold gba:text-foreground">{displayName}</span>
            })()}
            <span className="gba:text-xs gba:text-muted-foreground">{formattedDate}</span>
            {isCollapsed && totalReplies > 0 && (
              <button
                onClick={() => setIsCollapsed(false)}
                className="gba:text-xs gba:text-primary gba:font-medium hover:gba:underline"
                data-testid={`${dataTestId}-expand-inline-${comment.id}`}
              >
                [{totalReplies} {totalReplies === 1 ? 'reply' : 'replies'}]
              </button>
            )}
          </div>

          {/* Content - hidden when collapsed */}
          {!isCollapsed && (
            <>
              <p className="gba:text-sm gba:text-foreground gba:whitespace-pre-wrap">{displayContent}</p>

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
                  {totalReplies > 0 && (
                    <button
                      onClick={() => setIsCollapsed(true)}
                      className="gba:flex gba:items-center gba:h-auto gba:p-1 gba:text-xs gba:text-muted-foreground hover:gba:text-foreground"
                      data-testid={`${dataTestId}-collapse-inline-${comment.id}`}
                    >
                      <ChevronUp className="gba:w-3 gba:h-3 gba:mr-1" />
                      Collapse
                    </button>
                  )}
                </div>
              )}

              {/* Reply Form */}
              {showReplyForm && (
                <div className="gba:mt-2">
                  <CommentForm
                    articleId={articleId}
                    articleCommentId={comment.id}
                    accessToken={accessToken}
                    employeeId={employeeId}
                    onSuccess={handleReplySuccess}
                    onCancel={() => setShowReplyForm(false)}
                    placeholder="Write a reply..."
                    data-testid={`${dataTestId}-reply-form-${comment.id}`}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Replies or Continue Thread Button */}
      {shouldShowReplies && comment.replies && comment.replies.length > 0 && (
        <div className="gba:space-y-3">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              articleId={articleId}
              accessToken={accessToken}
              employeeId={employeeId}
              currentUserId={currentUserId}
              onCommentCreated={onCommentCreated}
              onViewThread={onViewThread}
              depth={depth + 1}
              showAllReplies={showAllReplies}
              data-testid={dataTestId}
            />
          ))}
        </div>
      )}

      {/* Continue Thread Button at max depth */}
      {showContinueThread && (
        <div className="gba:ml-8 gba:pl-4 gba:border-l gba:border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleContinueThread}
            className="gba:text-primary gba:h-auto gba:p-2"
            data-testid={`${dataTestId}-continue-thread-${comment.id}`}
          >
            <ArrowBigUp className="gba:w-4 gba:h-4 gba:mr-2" />
            Continue this thread ({totalReplies} more {totalReplies === 1 ? 'reply' : 'replies'})
          </Button>
        </div>
      )}
    </div>
  )
}

export default CommentItem
