import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system'
import { MessageCircle } from 'lucide-react'
import { useContentComments, CommentWithReplies } from '../../hooks/useContentComments'
import CommentForm from './CommentForm'
import CommentItem from './CommentItem'
import CommentThreadView from './CommentThreadView'

export interface CommentSectionProps {
  articleId: string
  allowComment: boolean
  accessToken: string
  currentUserId: string | undefined
  employeeId: string
  'data-testid'?: string
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  articleId,
  allowComment,
  accessToken,
  currentUserId,
  employeeId,
  'data-testid': dataTestId = 'comment-section'
}) => {
  const { t } = useTranslation('content')
  const { comments, allComments, isLoading, error, refetch } = useContentComments(articleId, accessToken)
  const [viewingThread, setViewingThread] = useState<CommentWithReplies | null>(null)

  if (!allowComment) {
    return null
  }

  const handleViewThread = (comment: CommentWithReplies) => {
    setViewingThread(comment)
  }

  const handleBackToComments = () => {
    setViewingThread(null)
  }

  // If viewing a specific thread, show thread view
  if (viewingThread) {
    return (
      <div className="gba:mt-8" data-testid={`${dataTestId}-thread-view`}>
        <CommentThreadView
          rootComment={viewingThread}
          articleId={articleId}
          accessToken={accessToken}
          employeeId={employeeId}
          currentUserId={currentUserId}
          onCommentCreated={refetch}
          onBack={handleBackToComments}
          data-testid={`${dataTestId}-thread`}
        />
      </div>
    )
  }

  return (
    <div className="gba:mt-8 gba:space-y-6" data-testid={dataTestId}>
      {/* Section Header */}
      <div className="gba:flex gba:items-center gba:gap-2">
        <MessageCircle className="gba:w-5 gba:h-5 gba:text-foreground" />
        <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">
          {t('comments', 'Comments')} ({allComments.length})
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
        <div className="gba:space-y-6" data-testid={`${dataTestId}-list`}>
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              articleId={articleId}
              accessToken={accessToken}
              employeeId={employeeId}
              currentUserId={currentUserId}
              onCommentCreated={refetch}
              onViewThread={handleViewThread}
              data-testid={`${dataTestId}-item`}
            />
          ))}
        </div>
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
