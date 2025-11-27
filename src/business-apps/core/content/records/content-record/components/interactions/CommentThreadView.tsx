import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, CardContent, CardHeader } from '@newwork/nw-design-system'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { CommentWithReplies } from '@/common/data/content/hooks/useContentComments'
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

  const flatReplies = flattenReplies(rootComment)
  const totalReplies = flatReplies.length

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
          <div className="gba:space-y-3">
            {/* Root Comment (without replies) */}
            <CommentItem
              comment={{ ...rootComment, replies: [] }}
              articleId={articleId}
              accessToken={accessToken}
              employeeId={employeeId}
              currentUserId={currentUserId}
              onCommentCreated={onCommentCreated}
              depth={0}
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
                    onCommentCreated={onCommentCreated}
                    depth={1}
                    data-testid={`${dataTestId}-reply`}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CommentThreadView
