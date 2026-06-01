import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerLead } from '@/common/data/customer/hooks/useCustomerLead'
import {
  ComplianceUpdatePopup,
  extractEntityId
} from '@/common/components/common-relations/popups/compliance-update-popup'

const popupTestId = 'lead-compliance-update-popup'

export interface LeadComplianceUpdatePopupProps extends BusinessAppContextProps {
  initialValues?: {
    leadId?: string
  }
}

const LeadComplianceUpdatePopup: React.FC<LeadComplianceUpdatePopupProps> = ({ initialValues, ...props }) => {
  const leadId = useMemo(
    () =>
      extractEntityId({
        additionalData: props.additionalData,
        initialId: initialValues?.leadId,
        idKeys: ['leadId', 'leaddId']
      }),
    [props.additionalData, initialValues?.leadId]
  )

  const { lead, loading, error } = useCustomerLead(props.accessToken || '', leadId)

  return (
    <ComplianceUpdatePopup
      {...props}
      entityType="lead"
      entityId={leadId}
      entity={lead}
      loading={loading}
      error={error}
      popupTestId={popupTestId}
    />
  )
}

LeadComplianceUpdatePopup.displayName = 'LeadComplianceUpdatePopup'

export default LeadComplianceUpdatePopup
export { LeadComplianceUpdatePopup }
