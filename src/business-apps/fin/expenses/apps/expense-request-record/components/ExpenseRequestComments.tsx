import React from 'react'
import { Typography } from 'antd'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Avatar,
  AvatarImage,
  Separator,
  useTranslation
} from '@newwork/nw-design-system'
import { ExpenseRequestComment } from '../types/expenseRequestRecord.types'
import { formatDate } from '@/common/utils/windowUtils'
import { formatExpenseRecordCommentText } from '@/business-apps/fin/expenses/common/utils/formatExpenseRecordComment'
import { UserIcon, ChatsCircleIcon } from '@phosphor-icons/react'
import dayjs from 'dayjs'
import expenseRequestRecordTranslations from '../_i18n'

interface ExpenseRequestCommentsProps {
  comments: ExpenseRequestComment[]
}

const { Paragraph } = Typography

const ExpenseRequestComments: React.FC<ExpenseRequestCommentsProps> = ({ comments }) => {
  const { t } = useTranslation(expenseRequestRecordTranslations)

  const getCommentText = (comment: ExpenseRequestComment) =>
    formatExpenseRecordCommentText(comment.comment, comment.commentType, t, {
      approvedEmptyKey: 'expense-request-record-comment-approved',
      statusChangedKey: 'expense-request-record-comment-status-changed',
      entity: 'request'
    })

  const getCommentHeaderLabel = (comment: ExpenseRequestComment) => {
    if (comment.commentType === 'SYSTEM_COMMENT') {
      return t('expense-request-record-system')
    }
    return comment.authorEmployee?.fullName ?? ''
  }

  const getAvatarSrc = (thumbnail?: string) => {
    if (!thumbnail) return undefined
    return `data:image/png;base64,${thumbnail}`
  }

  const sortedComments = [...comments].sort((a, b) => dayjs(b.commentDate).unix() - dayjs(a.commentDate).unix())

  return (
    <Card data-testid="expense-request-comments" className="gba:border-none gba:px-6 gba:pt-4">
      <CardHeader className="gba:border-b gba:border-gray-200 gba:pb-3">
        <CardTitle>{t('expense-request-record-comments')}</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedComments.length === 0 ? (
          <div className="gba:text-center gba:py-8">
            <ChatsCircleIcon size={32} className="gba:text-4xl gba:text-gray-300" />
            <Paragraph className="gba:mt-2 gba:text-gray-500">
              {t('expense-request-record-comment-no-comments')}
            </Paragraph>
          </div>
        ) : (
          <div>
            {sortedComments.map((comment, index) => (
              <div key={`${comment.commentDate}-${comment.commentType}-${index}`} className="gba:py-2">
                <div className="gba:flex gba:items-start gba:gap-4">
                  <Avatar>
                    {comment.commentType === 'SYSTEM_COMMENT' ? (
                      <UserIcon size={16} />
                    ) : comment.authorEmployee?.pictureThumbnail ? (
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

export default ExpenseRequestComments
