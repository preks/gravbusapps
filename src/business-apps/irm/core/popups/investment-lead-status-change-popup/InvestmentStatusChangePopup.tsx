import React from 'react'
import { LeadStatusChangePopup as SharedLeadStatusChangePopup } from '@/common/components/common-relations/popups/lead-status-change-popup/LeadStatusChangePopup'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentLead } from '@/common/data/investment/hooks/useInvestmentLead'

export interface IRMInvestmentStatusChangePopupProps extends BusinessAppContextProps {
  initialValues?: {
    leadId?: string
  }
}

const useInvestmentLeadData = (leadId: string, accessToken: string) => {
  return useInvestmentLead(accessToken, leadId)
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
        useLeadDataHook: useInvestmentLeadData
      }}
    />
  )
}

InvestmentStatusChangePopup.displayName = 'InvestmentStatusChangePopup'

export default InvestmentStatusChangePopup
