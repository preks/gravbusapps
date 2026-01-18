import { formatDate } from '@/common/utils/windowUtils'
import type { useTranslation } from '@newwork/nw-design-system'

/**
 * Formats a date to a human-readable string with date and time using the platform's formatting
 * @param date - Date string or Date object
 * @returns Formatted date string using the platform's date formatter, or 'Unknown date' on error
 */
export const formatSubmissionDate = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date

    if (Number.isNaN(dateObj.getTime())) {
      return 'Unknown date'
    }

    // Use platform's date formatter with 'fullDateTime' format for consistency
    // Falls back to ISO string if platform formatter is unavailable
    const formatted = formatDate(dateObj, 'fullDateTime')
    return formatted || dateObj.toISOString()
  } catch {
    return 'Unknown date'
  }
}

/**
 * Maps a status message to its embedded translation key for use in sentences
 * @param status - The status message to map
 * @param t - Translation function
 * @returns The embedded (adjective) form of the status for use in sentences
 */
export const getEmbeddedStatus = (status: string, t: ReturnType<typeof useTranslation>['t']): string => {
  // Get localized versions of known statuses
  const statusPending = t('pending-status-pending')
  const statusAwaitingApproval = t('pending-status-awaiting-approval')
  const statusAwaitingAcknowledgment = t('pending-status-awaiting-acknowledgment')

  // Map to embedded variants for grammatical correctness
  if (status === statusPending) {
    return t('pending-status-pending-embedded')
  }
  if (status === statusAwaitingApproval) {
    return t('pending-status-awaiting-approval-embedded')
  }
  if (status === statusAwaitingAcknowledgment) {
    return t('pending-status-awaiting-acknowledgment-embedded')
  }

  // For unknown statuses, return as-is (fallback for custom status messages)
  return status
}
