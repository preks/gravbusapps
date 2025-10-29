import React from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system'
import { MessageCircle } from 'lucide-react'
import { useArticleComments } from '../../hooks/useArticleComments'
import CommentForm from './CommentForm'
import CommentItem from './CommentItem'

export interface CommentSectionProps {
  articleId: string
  allowComment: boolean
  accessToken: string
  currentUserId: string | undefined
  'data-testid'?: string
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  articleId,
  allowComment,
  accessToken,
  currentUserId,
  'data-testid': dataTestId = 'comment-section'
}) => {
  const { t } = useTranslation('content')
  const { comments, allComments, isLoading, error, refetch } = useArticleComments(articleId, accessToken)

  if (!allowComment) {
    return null
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
              currentUserId={currentUserId}
              onCommentCreated={refetch}
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
