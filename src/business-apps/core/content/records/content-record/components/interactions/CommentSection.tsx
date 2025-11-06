import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertTitle, AlertDescription, Button } from '@newwork/nw-design-system'
import { MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useContentComments, CommentWithReplies } from '@/common/data/content'
import CommentForm from './CommentForm'
import CommentItem from './CommentItem'

export interface CommentSectionProps {
  articleId: string
  allowComment: boolean
  commentCount: number
  accessToken: string
  currentUserId: string | undefined
  employeeId: string
  'data-testid'?: string
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  articleId,
  allowComment,
  commentCount,
  accessToken,
  currentUserId,
  employeeId,
  'data-testid': dataTestId = 'comment-section'
}) => {
  const { t } = useTranslation('content')
  const { comments, isLoading, error, refetch } = useContentComments(articleId, accessToken)
  const [showAllComments, setShowAllComments] = useState(false)

  if (!allowComment) {
    return null
  }

  // Show only first 3 comments initially
  const visibleComments = showAllComments ? comments : comments.slice(0, 3)
  const hasMoreComments = comments.length > 3

  // Flatten all replies to a single level (no nested replies within replies)
  const flattenReplies = (comment: CommentWithReplies): CommentWithReplies[] => {
    const allReplies: CommentWithReplies[] = []

    const collectReplies = (replies: CommentWithReplies[]) => {
      replies.forEach(reply => {
        // Create a new object with explicitly empty replies to prevent any nesting
        const flatReply: CommentWithReplies = {
          ...reply,
          replies: [] as CommentWithReplies[]
        }
        allReplies.push(flatReply)

        // Recursively collect any nested replies
        if (reply.replies && reply.replies.length > 0) {
          collectReplies(reply.replies)
        }
      })
    }

    if (comment.replies && comment.replies.length > 0) {
      collectReplies(comment.replies)
    }

    return allReplies
  }

  return (
    <div className="gba:mt-8 gba:space-y-6" data-testid={dataTestId}>
      {/* Section Header */}
      <div className="gba:flex gba:items-center gba:gap-2">
        <MessageCircle className="gba:w-5 gba:h-5 gba:text-foreground" />
        <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">
          {t('comments', 'Comments')} ({commentCount})
        </h2>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" data-testid={`${dataTestId}-error`}>
          <AlertTitle>{t('error_loading_comments', 'Error loading comments')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Comment Form */}
      <div data-testid={`${dataTestId}-form`}>
        <CommentForm
          articleId={articleId}
          accessToken={accessToken}
          employeeId={employeeId}
          onSuccess={refetch}
          data-testid={`${dataTestId}-new-comment-form`}
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="gba:flex gba:justify-center gba:py-8">
          <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-primary"></div>
        </div>
      )}

      {/* Comments List */}
      {!isLoading && comments.length > 0 && (
        <>
          <div className="gba:space-y-6" data-testid={`${dataTestId}-list`}>
            {visibleComments.map(comment => {
              const flatReplies = flattenReplies(comment)
              return (
                <div key={comment.id} className="gba:space-y-3">
                  {/* Main Comment */}
                  <CommentItem
                    comment={{ ...comment, replies: [] }}
                    articleId={articleId}
                    accessToken={accessToken}
                    employeeId={employeeId}
                    currentUserId={currentUserId}
                    onCommentCreated={refetch}
                    data-testid={`${dataTestId}-item`}
                  />

                  {/* All Replies Flattened at Same Level */}
                  {flatReplies.length > 0 && (
                    <div className="gba:space-y-3">
                      {flatReplies.map(reply => (
                        <CommentItem
                          key={reply.id}
                          comment={reply}
                          articleId={articleId}
                          accessToken={accessToken}
                          employeeId={employeeId}
                          currentUserId={currentUserId}
                          onCommentCreated={refetch}
                          depth={1}
                          data-testid={`${dataTestId}-reply`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Show More / Show Less Button */}
          {hasMoreComments && (
            <div className="gba:flex gba:justify-center gba:pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllComments(!showAllComments)}
                className="gba:gap-2"
                data-testid={`${dataTestId}-toggle-button`}
              >
                {showAllComments ? (
                  <>
                    <ChevronUp className="gba:w-4 gba:h-4" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="gba:w-4 gba:h-4" />
                    Show {comments.length - 3} more {comments.length - 3 === 1 ? 'comment' : 'comments'}
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!isLoading && comments.length === 0 && !error && (
        <div className="gba:text-center gba:py-8 gba:text-muted-foreground" data-testid={`${dataTestId}-empty`}>
          <p className="gba:text-sm">{t('no_comments_yet', 'No comments yet. Be the first to comment!')}</p>
        </div>
      )}
    </div>
  )
}

export default CommentSection
