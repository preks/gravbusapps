import React from 'react'
import { Avatar } from 'antd'
import { formatDate } from '@/common/utils/windowUtils'
import { useExpenseRequestWizardTranslation } from '../../useExpenseRequestWizardTranslation'

interface RejectionCommentProps {
  isRequest?: boolean
  comment: {
    id: string
    authorEmployeeId: string
    authorEmployee?: {
      firstName: string
      lastName: string
      pictureThumbnail?: string
    }
    commentDate: string
    commentType: string
    comment: string
  } | null
}

/**
 * Component to display rejection comments for expense requests
 */
const RejectionComment: React.FC<RejectionCommentProps> = ({ isRequest = true, comment }) => {
  const { t } = useExpenseRequestWizardTranslation()

  if (!comment) return null

  /**
   * Format comment date with localization
   * @param commentDate - Date string to format
   * @returns Formatted date string
   */
  const formatCommentDate = (commentDate: string): string => {
    try {
      const inputDate = new Date(commentDate)
      return `${formatDate(inputDate, 'date.long')} - ${formatDate(inputDate, 'time.short')}`
    } catch {
      const inputDate = new Date(commentDate)
      const day = String(inputDate.getDate()).padStart(2, '0')
      const month = String(inputDate.getMonth() + 1).padStart(2, '0')
      const year = inputDate.getFullYear()
      const hours = String(inputDate.getHours()).padStart(2, '0')
      const minutes = String(inputDate.getMinutes()).padStart(2, '0')
      return `${day}.${month}.${year} - ${hours}:${minutes}`
    }
  }

  /**
   * Get avatar source for the comment author
   * @returns Base64 encoded image or undefined
   */
  const getAvatarSrc = (): string | undefined => {
    if (comment.authorEmployee?.pictureThumbnail) {
      return `data:image/gif;base64,${comment.authorEmployee.pictureThumbnail}`
    }
    return undefined
  }

  const authorName = comment.authorEmployee
    ? `${comment.authorEmployee.firstName || ''} ${comment.authorEmployee.lastName || ''}`.trim()
    : ''

  return (
    <div className="gba:bg-destructive-secondary gba:p-5 gba:rounded" data-testid="rejection-comment-container">
      <div className="gba:flex gba:items-center gba:mb-4">
        <Avatar src={getAvatarSrc()} size={32} data-testid="rejection-comment-avatar">
          {!comment.authorEmployee?.pictureThumbnail && authorName.charAt(0)}
        </Avatar>
        <div className="gba:ml-3">
          <span className="gba:text-sm" data-testid="rejection-comment-author">
            {authorName} - {formatCommentDate(comment.commentDate)}
          </span>
        </div>
      </div>
      <div className="gba:text-[14px] gba:font-[700] gba:text-red-500 gba:mb-3" data-testid="rejection-comment-title">
        {isRequest ? t('trip-request-returned') : t('trip-plan-returned')}
      </div>
      <p className="gba:text-[14px] gba:m-0 gba:leading-relaxed" data-testid="rejection-comment-text">
        {comment.comment}
      </p>
    </div>
  )
}

export default RejectionComment
