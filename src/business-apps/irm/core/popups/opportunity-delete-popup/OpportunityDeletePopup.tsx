import React, { useEffect } from 'react'
import { OpportunityDeletePopup as CommonOpportunityDeletePopup } from '@/common/components/common-relations/popups/opportunity-delete-popup'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentOpportunity } from '@/common/data/investment/hooks/useInvestmentOpportunity'
import { navigateTo } from '@/common/utils/navigationUtils'

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

  useEffect(() => {
    const handleProcessComplete = (e: Event) => {
      if ((e as CustomEvent)?.detail?.resolution === 'success') {
        navigateTo('/platform/irm/investment-relations?view=opportunities')
      }
    }
    window.addEventListener('com.newwork.process.processCompletion', handleProcessComplete)
    return () => window.removeEventListener('com.newwork.process.processCompletion', handleProcessComplete)
  }, [])

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
