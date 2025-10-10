import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Avatar, Separator, AvatarImage } from '@newwork/nw-design-system'
import { ExpensePlanComment, AdvancePaymentComment } from '../types/expensePlanRecord.types'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { UserOutlined, CommentOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

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
  const mergedComments: MergedComment[] = [
    // Add plan comments
    ...comments.map(comment => ({
      ...comment,
      isAdvancePayment: false
    })),
    // Add advance payment comments
    ...advancePaymentComments.map(comment => ({
      ...comment,
      commentType: comment.commentType || 'SYSTEM_COMMENT',
      isAdvancePayment: true
    }))
  ]

  // Sort by date (newest first)
  const sortedComments = mergedComments.sort((a, b) => dayjs(b.commentDate).unix() - dayjs(a.commentDate).unix())

  const getCommentText = (comment: MergedComment) => {
    if (comment.commentType === 'APPROVE_COMMENT' && comment.comment === '') {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:manager_expense_landing_page.upcoming_approved_badge',
        'Approved'
      )
    }
    return comment.comment
  }

  const getAvatarSrc = (thumbnail?: string) => {
    if (!thumbnail) return undefined
    return `data:image/png;base64,${thumbnail}`
  }

  return (
    <Card data-testid="expense-plan-comments" className="gba:border-none gba:px-6 gba:pt-4">
      <CardHeader className="gba:border-b gba:border-gray-200 gba:pb-3">
        <CardTitle>{getTranslationFromI18nKeyAndLabel('lowcoder:expense_records.plan.comments', 'Comments')}</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedComments.length === 0 ? (
          <div className="gba:text-center gba:py-8">
            <CommentOutlined className="gba:text-4xl gba:text-gray-300" />
            <p className="gba:mt-2 gba:text-gray-500">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_request_overview.expense_history.expense_history_table.description',
                'No comments available'
              )}
            </p>
          </div>
        ) : (
          <div>
            {sortedComments.map((comment, index) => (
              <div key={`comment-${index}`} className="gba:py-2">
                <div className="gba:flex gba:items-start gba:gap-4">
                  <Avatar>
                    {comment.commentType === 'SYSTEM_COMMENT' ? (
                      <UserOutlined />
                    ) : comment.authorEmployee.pictureThumbnail ? (
                      <AvatarImage
                        src={getAvatarSrc(comment.authorEmployee.pictureThumbnail)}
                        alt={comment.authorEmployee.fullName || 'User'}
                      />
                    ) : (
                      <UserOutlined />
                    )}
                  </Avatar>
                  <div className="gba:flex-1">
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                      <span className="gba:font-semibold">
                        {!comment.isAdvancePayment
                          ? getTranslationFromI18nKeyAndLabel(
                              'lowcoder:add_request_trip_details.trip_plan_select_label',
                              'Expense Plan'
                            ) + ': '
                          : ''}
                        {comment.isAdvancePayment
                          ? getTranslationFromI18nKeyAndLabel(
                              'lowcoder:approve_expense_request.advance_payment',
                              'Advance Payment'
                            ) + ': '
                          : ''}
                        {comment.commentType === 'SYSTEM_COMMENT'
                          ? getTranslationFromI18nKeyAndLabel('lowcoder:expense_records.plan.system', 'System')
                          : comment.authorEmployee.fullName}
                      </span>
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
