import React from 'react'
import { LeadStatusChangePopup as SharedLeadStatusChangePopup } from '@/common/popups/lead-status-change-popup'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useLeadData } from '../../records/lead-record/hooks/useLeadData'

export interface LeadStatusChangePopupProps extends BusinessAppContextProps {
  initialValues?: {
    leadId?: string
  }
}

const LeadStatusChangePopup: React.FC<LeadStatusChangePopupProps> = props => {
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
