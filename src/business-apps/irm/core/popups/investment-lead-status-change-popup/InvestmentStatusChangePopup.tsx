import React from 'react'
import { LeadStatusChangePopup as SharedLeadStatusChangePopup } from '@/common/components/common-relations/popups/lead-status-change-popup/LeadStatusChangePopup'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useLeadDataForStatusChange } from './hooks/useLeadDataForStatusChange'

export interface IRMInvestmentStatusChangePopupProps extends BusinessAppContextProps {
  initialValues?: {
    leadId?: string
  }
}

const InvestmentStatusChangePopup: React.FC<IRMInvestmentStatusChangePopupProps> = props => {
  return (
    <SharedLeadStatusChangePopup
      {...props}
      config={{
        translationPrefix: 'irm:investmentLead',
        entityKey: 'investmentLead',
        testIdPrefix: 'investment-lead-status-change-popup',
        statusFieldName: 'leadStatus',
        useLeadDataHook: useLeadDataForStatusChange
      }}
    />
  )
}

InvestmentStatusChangePopup.displayName = 'InvestmentStatusChangePopup'

export default InvestmentStatusChangePopup
