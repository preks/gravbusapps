import React, { useMemo } from 'react'
import { Button, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { useEmployeeDetails } from '../feedback-form/hooks/useEmployeeDetails'
import dayjs from 'dayjs'

type AnyObject = Record<string, any>

const prefixDataTestId = 'FeedbackApprovalScreen'

/**
 * Lightweight screen to display a received feedback message and approve (accept), reject, or cancel the task.
 * The component reads feedback data from additionalData (supports multiple shapes) and
 * uses dispatchProcessContinueEvent to continue the running process.
 */
const FeedbackApprovalScreen: React.FC<BusinessAppContextProps> = ({ accessToken, additionalData }) => {
  // Extract feedback data from the actual structure
  const feedbackData = useMemo(() => {
    const psiTaskPayload = (additionalData as AnyObject)?.psi_taskPayload
    const feedback = psiTaskPayload?.feedback

    if (!feedback) {
      return null
    }

    return {
      id: feedback.id,
      text: feedback.feedback,
      feedbackDate: feedback.feedbackDate,
      senderEmployeeId: feedback.senderEmployeeId,
      employeeId: feedback.employeeId,
      typeRef: feedback.typeRef,
      public: feedback.public
    }
  }, [additionalData])

  // Fetch sender employee details
  const { employee: senderEmployee, loading: senderLoading } = useEmployeeDetails(
    accessToken,
    feedbackData?.senderEmployeeId
  )

  const formattedDate = feedbackData?.feedbackDate
    ? dayjs(feedbackData.feedbackDate).format('MMMM D, YYYY [at] h:mm A')
    : undefined

  const handleAccept = () => {
    const payload = {
      approval: 'approved'
    }

    dispatchProcessContinueEvent('pse_submit', payload)
  }

  const handleReject = () => {
    const payload = {
      approval: 'rejected'
    }

    dispatchProcessContinueEvent('pse_submit', payload)
  }

  const handleCancel = () => {
    dispatchProcessContinueEvent('pse_pause', {})
  }

  // If we don't have any additionalData yet (rare), show a minimal loader to avoid empty page
  if (!additionalData) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full"
        data-testid={formatDataTestId(prefixDataTestId, 'Loading')}
      >
        <Spinner size="lg" />
      </div>
    )
  }

  // If we don't have feedback data, show error
  if (!feedbackData) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full"
        data-testid={formatDataTestId(prefixDataTestId, 'Error')}
      >
        <div className="gba:bg-white gba:max-w-md gba:w-full gba:p-6 gba:text-center">
          <div className="gba:text-destructive gba:text-lg gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('feedback.approval.noData', 'No feedback data available')}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
      className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full"
    >
      <div className="gba:bg-white gba:max-w-md gba:w-full gba:max-h-[90vh] gba:overflow-hidden">
        {/* Modal Header */}
        <div className="gba:flex gba:items-center gba:justify-between gba:p-4">
          <div className="gba:flex gba:items-center gba:gap-2">
            <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel('feedback.approval.title', 'Received feedback')}
            </h2>
          </div>
        </div>

        {/* Modal Content */}
        <div className="gba:p-4 gba:space-y-4 gba:overflow-y-auto gba:max-h-[calc(90vh-140px)]">
          {/* From Section */}
          <div className="gba:space-y-2">
            <div className="gba:flex gba:items-center gba:gap-2">
              <strong className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('feedback.approval.from', 'From')}:
              </strong>
              <span
                data-testid={formatDataTestId(prefixDataTestId, 'FromValue')}
                className="gba:text-sm gba:text-foreground"
              >
                {senderLoading ? (
                  <Spinner size="sm" />
                ) : (
                  senderEmployee?.name ||
                  getTranslationFromI18nKeyAndLabel('feedback.approval.unknown', 'Unknown sender')
                )}
              </span>
            </div>
          </div>

          {/* Feedback Card */}
          <div data-testid={formatDataTestId(prefixDataTestId, 'Card')}>
            <div
              data-testid={formatDataTestId(prefixDataTestId, 'Meta')}
              className="gba:text-xs gba:text-muted-foreground gba:mb-2"
            >
              {getTranslationFromI18nKeyAndLabel('feedback.approval.feedbackPrefix', 'Date')}:
              {formattedDate ? ` ${formattedDate}` : ''}
            </div>
            <div
              data-testid={formatDataTestId(prefixDataTestId, 'Message')}
              className="gba:text-sm gba:text-foreground gba:whitespace-pre-wrap"
            >
              {feedbackData.text}
            </div>
          </div>

          {/* Error Display */}
          {!feedbackData && (
            <div
              data-testid={formatDataTestId(prefixDataTestId, 'Error')}
              className="gba:text-center gba:text-destructive"
            >
              {getTranslationFromI18nKeyAndLabel('feedback.approval.noData', 'No feedback data available')}
            </div>
          )}
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="gba:p-4 gba:border-t gba:border-border gba:flex gba:gap-2 gba:justify-end">
          <Button
            variant="secondary"
            onClick={handleCancel}
            data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
            className="gba:px-6 gba:py-2 gba:rounded-lg"
          >
            {getTranslationFromI18nKeyAndLabel('feedback.approval.cancel', 'Cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            data-testid={formatDataTestId(prefixDataTestId, 'RejectButton')}
            className="gba:px-6 gba:py-2 gba:rounded-lg"
          >
            {getTranslationFromI18nKeyAndLabel('feedback.approval.reject', 'Reject')}
          </Button>
          <Button
            onClick={handleAccept}
            data-testid={formatDataTestId(prefixDataTestId, 'AcceptButton')}
            className="gba:bg-foreground hover:gba:bg-muted gba:text-primary-foreground gba:px-6 gba:py-2 gba:rounded-lg"
          >
            {getTranslationFromI18nKeyAndLabel('feedback.approval.accept', 'Accept')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default FeedbackApprovalScreen
