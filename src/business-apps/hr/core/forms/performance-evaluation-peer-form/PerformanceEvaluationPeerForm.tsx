import React from 'react'
import { PerformanceEvaluationPeerFormProvider } from './context/PerformanceEvaluationPeerFormContext'
import PerformanceEvaluationPeerFormComponent from './components/PerformanceEvaluationPeerFormComponent'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PerformanceEvaluationPeerFormProps } from './types'

const PerformanceEvaluationPeerForm: React.FC<BusinessAppContextProps & PerformanceEvaluationPeerFormProps> = ({
  initialValues = {},
  onSubmit = async () => {},
  onCancel = async () => {},
  accessToken,
  userInfo,
  additionalData
}) => {
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
    <PerformanceEvaluationPeerFormProvider
      businessAppContext={businessAppContext}
      initialValues={initialValues}
      onSubmit={onSubmit}
      onCancel={onCancel}
    >
      <PerformanceEvaluationPeerFormComponent />
    </PerformanceEvaluationPeerFormProvider>
  )
}

export default PerformanceEvaluationPeerForm
