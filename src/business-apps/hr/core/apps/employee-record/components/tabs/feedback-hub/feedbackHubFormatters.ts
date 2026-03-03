import { formatDate } from '@/common/utils/windowUtils'
import { getTranslatedValue } from '../../../utils/formatters'
import { ExtendedEmployeeFeedback, FormattedFeedback } from './types'

type FeedbackStream = 'received' | 'given'

export const formatFeedbackList = (
  list: ExtendedEmployeeFeedback[],
  mode: FeedbackStream,
  t: (key: string, options?: Record<string, unknown>) => string
): FormattedFeedback[] =>
  list.map(feedback => {
    const target =
      mode === 'received'
        ? (feedback.senderEmployee as { firstName?: string; lastName?: string; displayName?: string } | undefined)
        : ((feedback as any).employee as { firstName?: string; lastName?: string; displayName?: string } | undefined)
    const firstName = target?.firstName ?? ''
    const lastName = target?.lastName ?? ''
    const sender = (target?.displayName ?? `${firstName} ${lastName}`.trim()) || t('feedback-hub-unknown-sender')
    const rawDate = feedback.feedbackDate ?? (feedback as any).createdAt ?? undefined
    const avatar =
      mode === 'received'
        ? (feedback.senderEmployee?.employeePosition?.employee?.pictureThumbnail ?? null)
        : ((feedback as any)?.employee?.employeePosition?.employee?.pictureThumbnail ?? null)
    const senderId = mode === 'received' ? feedback.senderEmployeeId : ((feedback as any).employeeId ?? undefined)

    return {
      id: feedback.id,
      sender,
      date: rawDate ? (formatDate(rawDate, 'date.short') ?? '') : '',
      rawDate,
      content: feedback.feedback ?? '',
      avatar,
      senderId,
      firstName,
      lastName,
      rating: feedback.rating,
      private: (feedback as any).feedbackPublic === false,
      feedbackPublic: (feedback as any).feedbackPublic,
      type: getTranslatedValue((feedback as any)?.type) || (feedback as any).typeRef || t('feedback-hub-type-other'),
      timestamp: rawDate ? Date.parse(rawDate) : 0
    }
  })
