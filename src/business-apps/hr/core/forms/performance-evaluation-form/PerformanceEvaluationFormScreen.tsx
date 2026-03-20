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
  const taskPayload = (additionalData as any)?.psi_taskPayload
  const taskName = taskPayload?.TaskName
  const isPeerEvaluation = taskName === 'peerEvaluation'
  const creatorUserId = taskPayload?.creatorUserId

  // For peer evaluation step: employee comes from creatorUserId (resolve to employeeId)
  const { employeeId: creatorEmployeeId } = useEmployeeByUserId({
    accessToken,
    userId: isPeerEvaluation ? creatorUserId : undefined
  })

  // Extract employeeId from task payload (for manager/other flows)
  const employeeIdFromTaskPayload = taskPayload?.employeePerformanceEvaluation?.employee

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

  // Use the hook to map receiverId (userId) to employeeId when not in peer evaluation
  const { employeeId: mappedEmployeeId } = useEmployeeByUserId({
    accessToken,
    userId: !isPeerEvaluation ? receiverId : undefined
  })

  // Peer evaluation: use creatorUserId (resolved to employeeId). Otherwise use mapped receiverId or other fallbacks.
  const finalEmployeeId = isPeerEvaluation ? creatorEmployeeId || employeeId : mappedEmployeeId || employeeId

  const handleSubmitEvaluation = async () => {
    // Evaluation submission is now handled by Kogito process via dispatchProcessContinueEvent
    // This function is kept for backward compatibility but the actual submission happens in the context
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
        preSelectedEmployeeId={finalEmployeeId}
      />
    </div>
  )
}

export default PerformanceEvaluationFormScreen
