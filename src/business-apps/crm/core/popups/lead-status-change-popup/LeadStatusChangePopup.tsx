import React from 'react'
import { LeadStatusChangePopupProvider } from './context/LeadStatusChangePopupContext'
import LeadStatusChangePopupComponent from './components/LeadStatusChangePopupComponent'
import { LeadStatusChangePopupProps } from './types'

const LeadStatusChangePopup: React.FC<LeadStatusChangePopupProps> = props => {
  const { initialValues, ...businessAppContext } = props

  return (
    <LeadStatusChangePopupProvider businessAppContext={businessAppContext} initialValues={initialValues}>
      <LeadStatusChangePopupComponent />
    </LeadStatusChangePopupProvider>
  )
}

LeadStatusChangePopup.displayName = 'LeadStatusChangePopup'

export default LeadStatusChangePopup
