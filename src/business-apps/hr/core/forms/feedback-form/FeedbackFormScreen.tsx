import React from 'react'
import FeedbackForm from './FeedbackForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useEmployeeByUserId } from './hooks/useEmployeeByUserId'

interface FeedbackFormScreenProps extends BusinessAppContextProps {
  preSelectedEmployeeId?: string
}

const FeedbackFormScreen: React.FC<FeedbackFormScreenProps> = ({
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

  // Add receiverId as an additional fallback option (contains userId from psi_taskPayload)
  const receiverId =
    additionalData?.psi_taskPayload?.receiverId || additionalData?.psi_taskPayload?.psi_initialParameters?.receiverId

  // Use the new hook to map receiverId (userId) to employeeId
  const { employeeId: mappedEmployeeId } = useEmployeeByUserId({
    accessToken,
    userId: receiverId
  })

  // Use mapped employeeId if available, otherwise fall back to the existing employeeId logic
  const finalEmployeeId = mappedEmployeeId || employeeId

  const handleSubmitFeedback = async () => {
    // Feedback submission is now handled by Kogito process via dispatchProcessContinueEvent
    // This function is kept for backward compatibility but the actual submission happens in the context
  }

  const handleCancelFeedback = async () => {
    // Feedback cancellation is now handled by Kogito process via dispatchProcessContinueEvent
    // This function is kept for backward compatibility but the actual cancellation happens in the context
  }

  return (
    <div className="gba:h-full gba:w-full" data-testid={formatDataTestId('FeedbackFormScreen', 'Container')}>
      <FeedbackForm
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={additionalData}
        onSubmit={handleSubmitFeedback}
        onCancel={handleCancelFeedback}
        preSelectedEmployeeId={finalEmployeeId}
      />
    </div>
  )
}

export default FeedbackFormScreen
