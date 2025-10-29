import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, CardContent, CardHeader } from '@newwork/nw-design-system'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { CommentWithReplies } from '../../hooks/useContentComments'
import CommentItem from './CommentItem'

export interface CommentThreadViewProps {
  rootComment: CommentWithReplies
  articleId: string
  accessToken: string
  employeeId: string
  currentUserId: string | undefined
  onCommentCreated?: () => void
  onBack: () => void
  'data-testid'?: string
}

export const CommentThreadView: React.FC<CommentThreadViewProps> = ({
  rootComment,
  articleId,
  accessToken,
  employeeId,
  currentUserId,
  onCommentCreated,
  onBack,
  'data-testid': dataTestId = 'comment-thread-view'
}) => {
  const { t } = useTranslation('content')

  // Count total replies in thread
  const countReplies = (comment: CommentWithReplies): number => {
    let count = comment.replies?.length || 0
    comment.replies?.forEach(reply => {
      count += countReplies(reply)
    })
    return count
  }

  const totalReplies = countReplies(rootComment)

  return (
    <div className="gba:space-y-4" data-testid={dataTestId}>
      {/* Header */}
      <Card>
        <CardHeader className="gba:p-4">
          <div className="gba:flex gba:items-center gba:gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} data-testid={`${dataTestId}-back-button`}>
              <ArrowLeft className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('back_to_comments', 'Back to all comments')}
            </Button>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2">
            <MessageCircle className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
            <span className="gba:text-sm gba:text-muted-foreground">
              {t('viewing_thread', 'Viewing thread with {{count}} replies', { count: totalReplies })}
            </span>
          </div>
        </CardHeader>
      </Card>

      {/* Thread Content */}
      <Card>
        <CardContent className="gba:p-4">
          <CommentItem
            comment={rootComment}
            articleId={articleId}
            accessToken={accessToken}
            employeeId={employeeId}
            currentUserId={currentUserId}
            onCommentCreated={onCommentCreated}
            depth={0}
            showAllReplies={true}
            data-testid={`${dataTestId}-item`}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default CommentThreadView
