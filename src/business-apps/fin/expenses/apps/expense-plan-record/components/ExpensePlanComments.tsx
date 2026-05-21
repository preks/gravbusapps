import React from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Avatar,
  Separator,
  AvatarImage,
  useTranslation
} from '@newwork/nw-design-system'
import { ExpensePlanComment, AdvancePaymentComment } from '../types/expensePlanRecord.types'
import { formatDate } from '@/common/utils/windowUtils'
import { formatExpenseRecordCommentText } from '@/business-apps/fin/expenses/common/utils/formatExpenseRecordComment'
import { UserIcon, ChatsCircleIcon } from '@phosphor-icons/react'
import dayjs from 'dayjs'
import expensePlanRecordTranslations from '../_i18n'

interface MergedComment {
  comment: string
  commentDate: string
  commentType: string
  authorEmployee: {
    fullName: string
    firstName: string
    lastName: string
    pictureThumbnail: string
  }
  isAdvancePayment: boolean
}

interface ExpensePlanCommentsProps {
  comments: ExpensePlanComment[]
  advancePaymentComments?: AdvancePaymentComment[]
}

const ExpensePlanComments: React.FC<ExpensePlanCommentsProps> = ({ comments, advancePaymentComments = [] }) => {
  const { t } = useTranslation(expensePlanRecordTranslations)

  const mergedComments: MergedComment[] = [
    ...comments.map(comment => ({
      ...comment,
      isAdvancePayment: false
    })),
    ...advancePaymentComments.map(comment => ({
      ...comment,
      commentType: comment.commentType || 'SYSTEM_COMMENT',
      isAdvancePayment: true
    }))
  ]

  const sortedComments = mergedComments.sort((a, b) => dayjs(b.commentDate).unix() - dayjs(a.commentDate).unix())

  const getCommentText = (comment: MergedComment) =>
    formatExpenseRecordCommentText(comment.comment, comment.commentType, t, {
      approvedEmptyKey: 'expense-plan-record-comment-approved',
      statusChangedKey: 'expense-plan-record-comment-status-changed',
      entity: comment.isAdvancePayment ? 'advance' : 'plan'
    })

  const getCommentHeaderLabel = (comment: MergedComment) => {
    const sourceLabel = comment.isAdvancePayment
      ? t('expense-plan-record-comment-source-advance-payment')
      : t('expense-plan-record-comment-source-expense-plan')
    const authorLabel =
      comment.commentType === 'SYSTEM_COMMENT' ? t('expense-plan-record-system') : comment.authorEmployee.fullName
    return `${sourceLabel}: ${authorLabel}`
  }

  const getAvatarSrc = (thumbnail?: string) => {
    if (!thumbnail) return undefined
    return `data:image/png;base64,${thumbnail}`
  }

  return (
    <Card data-testid="expense-plan-comments" className="gba:border-none gba:px-6 gba:pt-4">
      <CardHeader className="gba:border-b gba:border-gray-200 gba:pb-3">
        <CardTitle>{t('expense-plan-record-comments')}</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedComments.length === 0 ? (
          <div className="gba:text-center gba:py-8">
            <ChatsCircleIcon size={32} className="gba:text-4xl gba:text-gray-300" />
            <p className="gba:mt-2 gba:text-gray-500">{t('expense-plan-record-comment-no-comments')}</p>
          </div>
        ) : (
          <div>
            {sortedComments.map((comment, index) => (
              <div
                key={`${comment.commentDate}-${comment.commentType}-${comment.isAdvancePayment}-${index}`}
                className="gba:py-2"
              >
                <div className="gba:flex gba:items-start gba:gap-4">
                  <Avatar>
                    {comment.commentType === 'SYSTEM_COMMENT' ? (
                      <UserIcon size={16} />
                    ) : comment.authorEmployee.pictureThumbnail ? (
                      <AvatarImage
                        src={getAvatarSrc(comment.authorEmployee.pictureThumbnail)}
                        alt={comment.authorEmployee.fullName || 'User'}
                      />
                    ) : (
                      <UserIcon size={16} />
                    )}
                  </Avatar>
                  <div className="gba:flex-1">
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                      <span className="gba:font-semibold">{getCommentHeaderLabel(comment)}</span>
                      <span className="gba:text-gray-500">
                        {formatDate(comment.commentDate, 'date.short')}, {formatDate(comment.commentDate, 'time.short')}
                      </span>
                    </div>
                    <p className="gba:m-0">{getCommentText(comment)}</p>
                  </div>
                </div>
                {index < sortedComments.length - 1 && <Separator className="gba:my-4" />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ExpensePlanComments
