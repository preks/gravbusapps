import React from 'react'
import { OpportunityDeletePopup as CommonOpportunityDeletePopup } from '@/common/components/common-relations/popups/opportunity-delete-popup'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentOpportunity } from '@/common/data/investment/hooks/useInvestmentOpportunity'

export interface OpportunityDeletePopupValues {
  opportunityId: string
}

export interface OpportunityDeletePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<OpportunityDeletePopupValues>
}

/**
 * IRM Opportunity Delete Popup
 * Uses useInvestmentOpportunity hook and passes data to common component
 */
const OpportunityDeletePopup: React.FC<OpportunityDeletePopupProps> = ({ initialValues = {}, ...props }) => {
  const opportunityId =
    props.additionalData?.opportunityId ||
    props.additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId ||
    props.additionalData?.id ||
    initialValues?.opportunityId ||
    ''

  const { opportunity, loading, error } = useInvestmentOpportunity(props.accessToken || '', opportunityId)

  return (
    <CommonOpportunityDeletePopup
      {...props}
      initialValues={initialValues}
      domain="investments"
      opportunity={opportunity}
      loading={loading}
      error={error}
    />
  )
}

export default OpportunityDeletePopup
export { OpportunityDeletePopup }
