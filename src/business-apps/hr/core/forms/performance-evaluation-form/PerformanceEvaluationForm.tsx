import React from 'react'
import { PerformanceEvaluationFormProvider } from './context/PerformanceEvaluationFormContext'
import PerformanceEvaluationFormComponent from './components/PerformanceEvaluationFormComponent'
import { PerformanceEvaluationFormProps } from './types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const PerformanceEvaluationForm: React.FC<BusinessAppContextProps & PerformanceEvaluationFormProps> = ({
  initialValues,
  onSubmit = async () => {},
  onCancel = async () => {},
  preSelectedEmployeeId,
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
    <PerformanceEvaluationFormProvider
      businessAppContext={businessAppContext}
      initialValues={initialValues}
      onSubmit={onSubmit}
      onCancel={onCancel}
      preSelectedEmployeeId={preSelectedEmployeeId}
    >
      <PerformanceEvaluationFormComponent />
    </PerformanceEvaluationFormProvider>
  )
}

export default PerformanceEvaluationForm
