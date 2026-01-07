import React from 'react'
import { FeedbackRequestFormProvider } from './context/FeedbackRequestFormContext'
import FeedbackRequestFormComponent from './components/FeedbackRequestFormComponent'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FeedbackRequestFormProps } from './types'

const FeedbackRequestForm: React.FC<BusinessAppContextProps & FeedbackRequestFormProps> = ({
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
    <FeedbackRequestFormProvider
      businessAppContext={businessAppContext}
      initialValues={initialValues}
      onSubmit={onSubmit}
      onCancel={onCancel}
      preSelectedEmployeeId={preSelectedEmployeeId}
    >
      <FeedbackRequestFormComponent />
    </FeedbackRequestFormProvider>
  )
}

export default FeedbackRequestForm
