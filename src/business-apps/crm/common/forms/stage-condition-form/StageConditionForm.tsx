import React from 'react'
import { StageConditionFormProvider } from './context/StageConditionFormContext'
import StageConditionFormComponent from './components/StageConditionFormComponent'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { StageConditionFormValues } from './types'

interface StageConditionFormProps {
  initialValues?: Partial<StageConditionFormValues>
}

const StageConditionForm: React.FC<BusinessAppContextProps & StageConditionFormProps> = ({
  initialValues,
  accessToken,
  userInfo,
  additionalData
}) => {
  if (!accessToken) {
    return (
      <div className="gba:p-6 gba:text-center">
        <div className="gba:text-red-500">
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
    <StageConditionFormProvider businessAppContext={businessAppContext} initialValues={initialValues}>
      <StageConditionFormComponent />
    </StageConditionFormProvider>
  )
}

export { StageConditionForm }
export default StageConditionForm
