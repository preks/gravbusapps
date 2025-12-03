import React, { useEffect } from 'react'
import { OpportunityDeletePopup as CommonOpportunityDeletePopup } from '@/common/components/common-relations/popups/opportunity-delete-popup'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerOpportunity } from '@/common/data/customer/hooks/useCustomerOpportunity'
import { navigateTo } from '@/common/utils/navigationUtils'

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

  useEffect(() => {
    const handleProcessComplete = (e: Event) => {
      if ((e as CustomEvent)?.detail?.resolution === 'success') {
        navigateTo('/platform/crm/customer-relations?view=opportunities')
      }
    }
    window.addEventListener('com.newwork.process.processCompletion', handleProcessComplete)
    return () => window.removeEventListener('com.newwork.process.processCompletion', handleProcessComplete)
  }, [])

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
