import dayjs from 'dayjs'
import type { WorkCommunication } from '../types/employee.types'

export const formatLastFeedback = (isoDate?: string | null): string => {
  if (!isoDate) return 'No feedback yet'

  const feedbackDate = dayjs(isoDate)
  if (!feedbackDate.isValid()) return 'No feedback yet'

  const days = dayjs().diff(feedbackDate, 'day')
  if (days <= 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`

  const months = Math.floor(days / 30)
  if (months === 1) return '1 month ago'
  if (months < 12) return `${months} months ago`
  return feedbackDate.format('MMM D, YYYY')
}

export const getDeterministicVariantIndex = (seed: string, variantsCount: number): number => {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + (seed.codePointAt(i) ?? 0)) >>> 0
  }
  return hash % variantsCount
}

export const extractEmployeeEmail = (workCommunications?: WorkCommunication[]): string | undefined =>
  workCommunications?.find(
    c => c.channel?.value?.toLowerCase().includes('email') || c.channel?.value?.toLowerCase() === 'e-mail'
  )?.value

export const WORK_COMMUNICATIONS_FRAGMENT = `
  workCommunications: communication(
    where: {
      _and: [
        { isDeleted: { _eq: false } }
        { purpose: { _eq: "INTERNAL" } }
        { value: { _neq: "" } }
        { channelRef: { _eq: "CommunicationChannel:v1:e-mail" } }
      ]
    }
  ) {
    id
    value
    channel {
      value
    }
  }
`
