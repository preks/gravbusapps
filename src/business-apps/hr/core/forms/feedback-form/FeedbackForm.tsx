import React from 'react'
import { FeedbackFormProvider } from './context/FeedbackFormContext'
import FeedbackFormComponent from './components/FeedbackFormComponent'
import { FeedbackFormProps } from './types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const FeedbackForm: React.FC<BusinessAppContextProps & FeedbackFormProps> = ({
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
    <FeedbackFormProvider
      businessAppContext={businessAppContext}
      initialValues={initialValues}
      onSubmit={onSubmit}
      onCancel={onCancel}
      preSelectedEmployeeId={preSelectedEmployeeId}
    >
      <FeedbackFormComponent />
    </FeedbackFormProvider>
  )
}

export default FeedbackForm
