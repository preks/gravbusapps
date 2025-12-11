import React from 'react'
import { OpportunityDeletePopup as CommonOpportunityDeletePopup } from '@/common/components/common-relations/popups/opportunity-delete-popup'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerOpportunity } from '@/common/data/customer/hooks/useCustomerOpportunity'

export interface OpportunityDeletePopupValues {
  opportunityId: string
}

export interface OpportunityDeletePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<OpportunityDeletePopupValues>
}

/**
 * CRM Opportunity Delete Popup
 * Uses useCustomerOpportunity hook and passes data to common component
 */
const OpportunityDeletePopup: React.FC<OpportunityDeletePopupProps> = ({ initialValues = {}, ...props }) => {
  const opportunityId =
    props.additionalData?.opportunityId ||
    props.additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId ||
    props.additionalData?.id ||
    initialValues?.opportunityId ||
    ''

  const { opportunity, loading, error } = useCustomerOpportunity(props.accessToken || '', opportunityId)

  return (
    <CommonOpportunityDeletePopup
      {...props}
      initialValues={initialValues}
      domain="crm"
      opportunity={opportunity}
      loading={loading}
      error={error}
    />
  )
}

export default OpportunityDeletePopup
export { OpportunityDeletePopup }
