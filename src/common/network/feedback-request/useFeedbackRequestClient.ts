import { useMemo } from 'react'
import { FeedbackRequestClient } from './FeedbackRequestClient'

export const useFeedbackRequestClient = () => {
  const feedbackRequestClient = useMemo(() => new FeedbackRequestClient(), [])
  return feedbackRequestClient
}
