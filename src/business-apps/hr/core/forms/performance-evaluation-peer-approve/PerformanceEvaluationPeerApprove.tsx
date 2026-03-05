import React from 'react'
import { PerformanceEvaluationPeerApproveProvider } from './context/PerformanceEvaluationPeerApproveContext'
import PerformanceEvaluationPeerApproveComponent from './components/PerformanceEvaluationPeerApproveComponent'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PerformanceEvaluationPeerApproveFormProps } from './types'

const PerformanceEvaluationPeerApprove: React.FC<
  BusinessAppContextProps & PerformanceEvaluationPeerApproveFormProps
> = ({ onSubmit = async () => {}, onCancel = async () => {}, accessToken, userInfo, additionalData }) => {
  if (!accessToken) {
    return (
      <div className="gba:p-6 gba:text-center">
        <div className="gba:text-destructive">
          Error: No access token found. Please ensure you are properly authenticated.
        </div>
      </div>
    )
  }

  const businessAppContext: BusinessAppContextProps = {
    accessToken,
    userInfo,
    additionalData
  }

  return (
    <PerformanceEvaluationPeerApproveProvider
      businessAppContext={businessAppContext}
      onSubmit={onSubmit}
      onCancel={onCancel}
    >
      <PerformanceEvaluationPeerApproveComponent />
    </PerformanceEvaluationPeerApproveProvider>
  )
}

export default PerformanceEvaluationPeerApprove
