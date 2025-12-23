import React, { useState } from 'react'
import { Button, Badge, LocalizationProvider, useTranslation } from '@newwork/nw-design-system'
import { InfoIcon } from 'lucide-react'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import type { SupportedLocale } from '@newwork/nw-design-system'
import translations from '@/components/_i18n'

/**
 * Props for the PendingSubmissionMessage component
 */
export interface PendingSubmissionMessageProps {
  /** Display name of the process type (e.g., "Bank Account Change", "Bonus Grant") */
  processType: string
  /** When the submission was made (optional - will show "Recently" if not provided) */
  submissionDate?: string | Date
  /** Optional process instance ID for debugging */
  processId?: string
  /**
   * Status message describing what's happening (e.g., "Awaiting Approval", "awaiting acknowledgment")
   * If not provided, defaults to localized "Pending" status via translation key 'pending-status-pending'
   */
  statusMessage?: string
  /** Optional callback when close button is clicked */
  onClose?: () => void
  /** Optional locale override */
  locale?: SupportedLocale
  /** Optional test id for testing */
  'data-testid'?: string
}

/**
 * Formats a date to a human-readable string with date and time
 * @param date - Date string or Date object
 * @param locale - Optional locale(s) for formatting (e.g., 'en-US', ['en-US', 'en'])
 * @returns Formatted date string (e.g., "December 22, 2025 at 3:45 PM")
 */
const formatSubmissionDate = (date: string | Date, locale?: string | string[]): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date

    if (isNaN(dateObj.getTime())) {
      return 'Unknown date'
    }

    const dateOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }

    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }

    const datePart = dateObj.toLocaleDateString(locale, dateOptions)
    const timePart = dateObj.toLocaleTimeString(locale, timeOptions)

    return `${datePart} at ${timePart}`
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
const getEmbeddedStatus = (status: string, t: ReturnType<typeof useTranslation>['t']): string => {
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

/**
 * Internal component with translations
 */
const PendingSubmissionMessageContent: React.FC<PendingSubmissionMessageProps> = ({
  processType,
  submissionDate,
  processId,
  statusMessage,
  onClose,
  locale,
  'data-testid': dataTestId = 'pending-submission-message'
}) => {
  const { t } = useTranslation(translations)
  const [showProcessId, setShowProcessId] = useState(false)

  // Use localized "Pending" as default if statusMessage is not provided
  const displayStatus = statusMessage || t('pending-status-pending')
  // Get the embedded (adjective) form for use in the description sentence
  const embeddedStatus = getEmbeddedStatus(displayStatus, t)
  const formattedDate = submissionDate ? formatSubmissionDate(submissionDate, locale) : undefined

  return (
    <div className="gba:flex gba:items-center gba:justify-center gba:min-h-[300px] gba:py-8" data-testid={dataTestId}>
      <div className="gba:w-full gba:px-4">
        <div className="gba:flex gba:flex-col gba:items-center gba:text-center gba:gap-4">
          {/* Icon */}
          <div
            className="gba:rounded-full gba:bg-info gba:p-3 gba:flex gba:items-center gba:justify-center"
            data-testid={`${dataTestId}-icon`}
          >
            <InfoIcon className="gba:w-6 gba:h-6 gba:text-info-foreground" />
          </div>

          {/* Title */}
          <div>
            <h2
              className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-2"
              data-testid={`${dataTestId}-title`}
            >
              {t('pending-title')}
            </h2>
          </div>

          {/* Description */}
          <div className="gba:space-y-4 gba:max-w-[500px]" data-testid={`${dataTestId}-description`}>
            <p className="gba:text-base gba:text-foreground">
              {t('pending-description', { processType, status: embeddedStatus })}
            </p>

            {/* Submission Details Card */}
            <div className="gba:bg-muted gba:rounded-lg gba:p-4 gba:space-y-3 gba:mt-4">
              {formattedDate && (
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                    {t('pending-submitted-label')}:
                  </span>
                  <span className="gba:text-sm gba:text-foreground gba:text-right" data-testid={`${dataTestId}-date`}>
                    {formattedDate}
                  </span>
                </div>
              )}

              <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                  {t('pending-status-label')}:
                </span>
                <Badge variant="secondary" className="gba:text-xs" data-testid={`${dataTestId}-status-badge`}>
                  {displayStatus}
                </Badge>
              </div>
            </div>

            {/* Process ID (Collapsible) */}
            {processId && (
              <div className="gba:pt-2">
                <button
                  onClick={() => setShowProcessId(!showProcessId)}
                  className="gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors gba:underline gba:cursor-pointer"
                  data-testid={`${dataTestId}-toggle-process-id`}
                  type="button"
                >
                  {showProcessId ? t('pending-hide-details') : t('pending-show-details')}
                </button>

                {showProcessId && (
                  <div
                    className="gba:mt-2 gba:p-2 gba:bg-muted gba:rounded gba:text-xs gba:font-mono gba:text-muted-foreground gba:break-all"
                    data-testid={`${dataTestId}-process-id`}
                  >
                    {t('pending-process-id-label')}: {processId}
                  </div>
                )}
              </div>
            )}

            {/* Close Button */}
            {onClose && (
              <div className="gba:pt-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                  data-testid={`${dataTestId}-close-button`}
                  type="button"
                  size="sm"
                >
                  {t('pending-close-button')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Centered message component displayed when a pending submission exists
 *
 * This component completely replaces the form to inform the user that they
 * already have a pending submission that needs to be processed first.
 *
 * @example
 * ```tsx
 * // With custom status message
 * <PendingSubmissionMessage
 *   processType="Bank Account Change"
 *   submissionDate={new Date('2025-12-22T15:45:00Z')}
 *   processId="c0a8d56b-3130-48f9-9cbd-c675cca86dca"
 *   statusMessage="Awaiting Approval"
 *   onClose={handleClose}
 *   data-testid="pending-bank-account-message"
 * />
 *
 * // Without statusMessage (uses localized "Pending" default)
 * <PendingSubmissionMessage
 *   processType="Bank Account Change"
 *   submissionDate={new Date('2025-12-22T15:45:00Z')}
 *   onClose={handleClose}
 * />
 * ```
 */
export const PendingSubmissionMessage: React.FC<PendingSubmissionMessageProps> = props => {
  const locale = props.locale || (getCurrentActiveUserLocale() as SupportedLocale)

  return (
    <LocalizationProvider locale={locale}>
      <PendingSubmissionMessageContent {...props} />
    </LocalizationProvider>
  )
}

export default PendingSubmissionMessage
