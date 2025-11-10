import React from 'react'
import { LeadStatusChangePopup as SharedLeadStatusChangePopup } from '@/common/popups/lead-status-change-popup'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useLeadData } from '../../records/lead-record/hooks/useLeadData'

export interface InvestmentStatusChangePopupProps extends BusinessAppContextProps {
  initialValues?: {
    leadId?: string
  }
}

const InvestmentStatusChangePopup: React.FC<InvestmentStatusChangePopupProps> = props => {
  return (
    <SharedLeadStatusChangePopup
      {...props}
      config={{
        translationPrefix: 'irm:investmentLead',
        entityKey: 'investmentLead',
        testIdPrefix: 'investment-lead-status-change-popup',
        statusFieldName: 'investmentLeadStatus',
        useLeadDataHook: useLeadData
      }}
    />
  )
}

InvestmentStatusChangePopup.displayName = 'InvestmentStatusChangePopup'

export default InvestmentStatusChangePopup
