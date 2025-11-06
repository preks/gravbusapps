import React from 'react'
import { InvestmentStatusChangePopupProvider } from './context/InvestmentStatusChangePopupContext'
import InvestmentStatusChangePopupComponent from './components/InvestmentStatusChangePopupComponent'
import { InvestmentStatusChangePopupProps } from './types'

const InvestmentStatusChangePopup: React.FC<InvestmentStatusChangePopupProps> = props => {
  const { initialValues, ...businessAppContext } = props

  return (
    <InvestmentStatusChangePopupProvider businessAppContext={businessAppContext} initialValues={initialValues}>
      <InvestmentStatusChangePopupComponent />
    </InvestmentStatusChangePopupProvider>
  )
}

InvestmentStatusChangePopup.displayName = 'InvestmentStatusChangePopup'

export default InvestmentStatusChangePopup
