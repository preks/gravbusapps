import React from 'react'
import FeedbackRequestForm from './FeedbackRequestForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

interface FeedbackRequestFormScreenProps extends BusinessAppContextProps {
  preSelectedEmployeeId?: string
}

const FeedbackRequestFormScreen: React.FC<FeedbackRequestFormScreenProps> = ({
  accessToken,
  userInfo,
  additionalData,
  preSelectedEmployeeId
}) => {
  // Extract employeeId from additionalData following the same pattern as other forms
  const employeeId =
    additionalData?.employeeId ||
    additionalData?.flowContext?.employeeId ||
    additionalData?.contextData?.employeeId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId ||
    preSelectedEmployeeId

  const handleSubmitFeedbackRequest = async () => {
    // Feedback request submission is now handled by Kogito process via dispatchProcessContinueEvent
    // This function is kept for backward compatibility but the actual submission happens in the context
  }

  const handleCancelFeedbackRequest = async () => {
    // Feedback request cancellation is now handled by Kogito process via dispatchProcessContinueEvent
    // This function is kept for backward compatibility but the actual cancellation happens in the context
  }

  return (
    <div className="gba:h-full gba:w-full" data-testid={formatDataTestId('FeedbackRequestFormScreen', 'Container')}>
      <FeedbackRequestForm
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={additionalData}
        onSubmit={handleSubmitFeedbackRequest}
        onCancel={handleCancelFeedbackRequest}
        preSelectedEmployeeId={employeeId}
      />
    </div>
  )
}

export default FeedbackRequestFormScreen
