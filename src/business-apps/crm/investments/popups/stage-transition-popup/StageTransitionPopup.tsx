import React from 'react'
import { StageTransitionPopupProvider } from './context/StageTransitionPopupContext'
import StageTransitionPopupComponent from './components/StageTransitionPopupComponent'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { StageTransitionPopupValues } from './types'

export interface StageTransitionPopupProps extends BusinessAppContextProps {
  initialValues?: Partial<StageTransitionPopupValues>
}

const StageTransitionPopup: React.FC<StageTransitionPopupProps> = ({ initialValues, ...businessAppContext }) => {
  return (
    <StageTransitionPopupProvider businessAppContext={businessAppContext} initialValues={initialValues}>
      <StageTransitionPopupComponent />
    </StageTransitionPopupProvider>
  )
}

export default StageTransitionPopup

// Named export for easier import
export { StageTransitionPopup }
