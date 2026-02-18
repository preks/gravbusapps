import React from 'react'
import PerformanceEvaluationPeerApprove from './PerformanceEvaluationPeerApprove'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

const PerformanceEvaluationPeerApproveScreen: React.FC<BusinessAppContextProps> = ({
  accessToken,
  userInfo,
  additionalData
}) => {
  console.log('additionalData', additionalData)
  const handleSubmit = async () => {
    // Submission is handled by context via dispatchProcessContinueEvent
  }

  const handleCancel = async () => {
    // Cancellation is handled by context via dispatchProcessContinueEvent
  }

  return (
    <div
      className="gba:h-full gba:w-full"
      data-testid={formatDataTestId('PerformanceEvaluationPeerApproveScreen', 'Container')}
    >
      <PerformanceEvaluationPeerApprove
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={additionalData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  )
}

export default PerformanceEvaluationPeerApproveScreen
