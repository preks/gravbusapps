import React from 'react'
import PerformanceEvaluationForm from './PerformanceEvaluationForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useEmployeeByUserId } from './hooks/useEmployeeByUserId'

interface PerformanceEvaluationFormScreenProps extends BusinessAppContextProps {
  preSelectedEmployeeId?: string
}

const PerformanceEvaluationFormScreen: React.FC<PerformanceEvaluationFormScreenProps> = ({
  accessToken,
  userInfo,
  additionalData,
  preSelectedEmployeeId
}) => {
  console.log('userInfoCosti', userInfo)
  console.log('additionalDataCosti', additionalData)

  // Extract employeeId from task payload (for performance evaluation flow)
  const employeeIdFromTaskPayload = (additionalData as any)?.psi_taskPayload?.employeePerformanceEvaluation?.employee

  console.log('employeeIdFromTaskPayload', employeeIdFromTaskPayload)

  // Extract employeeId with priority to task payload
  const employeeId =
    employeeIdFromTaskPayload ||
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

  const handleSubmitEvaluation = async () => {
    // Evaluation submission is now handled by Kogito process via dispatchProcessContinueEvent
    // This function is kept for backward compatibility but the actual submission happens in the context
  }

  const handleCancelEvaluation = async () => {
    // Evaluation cancellation is now handled by Kogito process via dispatchProcessContinueEvent
    // This function is kept for backward compatibility but the actual cancellation happens in the context
  }

  return (
    <div
      className="gba:h-full gba:w-full"
      data-testid={formatDataTestId('PerformanceEvaluationFormScreen', 'Container')}
    >
      <PerformanceEvaluationForm
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={additionalData}
        onSubmit={handleSubmitEvaluation}
        onCancel={handleCancelEvaluation}
        preSelectedEmployeeId={finalEmployeeId}
      />
    </div>
  )
}

export default PerformanceEvaluationFormScreen
