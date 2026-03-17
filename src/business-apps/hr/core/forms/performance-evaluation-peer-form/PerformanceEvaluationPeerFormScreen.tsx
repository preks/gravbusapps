import React from 'react'
import PerformanceEvaluationPeerForm from './PerformanceEvaluationPeerForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

const PerformanceEvaluationPeerFormScreen: React.FC<BusinessAppContextProps> = ({
  accessToken,
  userInfo,
  additionalData
}) => {
  const handleSubmit = async () => {
    // Submission is handled by context via dispatchProcessContinueEvent
  }

  return (
    <div
      className="gba:h-full gba:w-full"
      data-testid={formatDataTestId('PerformanceEvaluationPeerFormScreen', 'Container')}
    >
      <PerformanceEvaluationPeerForm
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={additionalData}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

export default PerformanceEvaluationPeerFormScreen
