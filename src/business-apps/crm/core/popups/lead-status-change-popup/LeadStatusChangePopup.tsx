import React from 'react'
import { LeadStatusChangePopup as SharedLeadStatusChangePopup } from '@/common/components/common-relations/popups/lead-status-change-popup/LeadStatusChangePopup'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEntityDataForStatusChange } from '@/common/hooks/useEntityDataForStatusChange'

export interface CRMLeadStatusChangePopupProps extends BusinessAppContextProps {
  initialValues?: {
    leadId?: string
  }
}

const useLeadData = (leadId: string, accessToken: string) => {
  const { entity, loading, error } = useEntityDataForStatusChange(leadId, accessToken, {
    entityType: 'Lead',
    includeDeletedFilter: true
  })
  return { lead: entity, loading, error }
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
