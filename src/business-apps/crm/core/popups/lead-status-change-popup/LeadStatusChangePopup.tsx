import React from 'react'
import { LeadStatusChangePopup as SharedLeadStatusChangePopup } from '@/common/components/common-relations/popups/lead-status-change-popup/LeadStatusChangePopup'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerLead } from '@/common/data/customer/hooks/useCustomerLead'

export interface CRMLeadStatusChangePopupProps extends BusinessAppContextProps {
  initialValues?: {
    leadId?: string
  }
}

const useLeadData = (leadId: string, accessToken: string) => {
  return useCustomerLead(accessToken, leadId)
}

const LeadStatusChangePopup: React.FC<CRMLeadStatusChangePopupProps> = props => {
  return (
    <SharedLeadStatusChangePopup
      {...props}
      config={{
        translationPrefix: 'crm:lead',
        entityKey: 'lead',
        testIdPrefix: 'lead-status-change-popup',
        statusFieldName: 'leadStatus',
        useLeadDataHook: useLeadData
      }}
    />
  )
}

LeadStatusChangePopup.displayName = 'LeadStatusChangePopup'

export default LeadStatusChangePopup
