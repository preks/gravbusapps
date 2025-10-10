import React from 'react'
import { StageConditionPopupProvider } from './context/StageConditionPopupContext'
import StageConditionPopupComponent from './components/StageConditionPopupComponent'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { StageConditionPopupValues } from './types'

interface StageConditionPopupProps {
  initialValues?: Partial<StageConditionPopupValues>
}

const StageConditionPopup: React.FC<BusinessAppContextProps & StageConditionPopupProps> = ({
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
    <StageConditionPopupProvider businessAppContext={businessAppContext} initialValues={initialValues}>
      <StageConditionPopupComponent />
    </StageConditionPopupProvider>
  )
}

export { StageConditionPopup }
export default StageConditionPopup
