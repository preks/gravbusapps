import React from 'react'
import { Button, LocalizationProvider, useTranslation } from '@newwork/nw-design-system'
import { InfoIcon } from 'lucide-react'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import type { SupportedLocale } from '@newwork/nw-design-system'
import translations from '@/components/_i18n'
import type { PendingSubmissionMessageProps } from './PendingSubmissionMessage.types'
import { formatSubmissionDate, getEmbeddedStatus } from './pendingMessageUtils'
import { SubmissionDetailsCard } from './SubmissionDetailsCard'
import { ProcessIdSection } from './ProcessIdSection'

export type { PendingSubmissionMessageProps } from './PendingSubmissionMessage.types'

/**
 * Internal component with translations
 */
const PendingSubmissionMessageContent: React.FC<PendingSubmissionMessageProps> = ({
  processType,
  submissionDate,
  processId,
  statusMessage,
  onClose,
  'data-testid': dataTestId = 'pending-submission-message'
}) => {
  const { t } = useTranslation(translations)

  // Use localized "Pending" as default if statusMessage is not provided
  const displayStatus = statusMessage || t('pending-status-pending')
  // Get the embedded (adjective) form for use in the description sentence
  const embeddedStatus = getEmbeddedStatus(displayStatus, t)
  const formattedDate = submissionDate ? formatSubmissionDate(submissionDate) : undefined

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

            <SubmissionDetailsCard
              formattedDate={formattedDate}
              displayStatus={displayStatus}
              dataTestId={dataTestId}
            />

            {processId && <ProcessIdSection processId={processId} dataTestId={dataTestId} />}

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
