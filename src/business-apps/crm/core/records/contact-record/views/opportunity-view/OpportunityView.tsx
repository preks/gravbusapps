import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { OpportunitySection } from '@/common/components/common-relations/record-sections/opportunity-section'
import { useCustomerOpportunitiesList } from '@/common/data/customer/hooks/useCustomerOpportunities'
import {
  CUSTOMER_OPPORTUNITY_ADDITIONAL_COLUMNS,
  CUSTOMER_OPPORTUNITY_EXTENDED_COLUMN_IDS
} from '@/common/components/customer/view-layouts/opportunity-layout/config/opportunityColumns'

interface OpportunityViewProps extends BusinessAppContextProps {
  contactId: string
}

export const OpportunityView: React.FC<OpportunityViewProps> = ({ contactId, ...context }) => {
  const queryVariables = useMemo(
    () => ({
      contactIds: [contactId],
      limit: 100,
      orderBy: [{ field: 'createdAt' as const, direction: 'DESC_NULLS_LAST' as const }]
    }),
    [contactId]
  )

  const { opportunities, loading, error } = useCustomerOpportunitiesList(context, queryVariables)

  const recordUrlBuilder = (opportunityId: string) => {
    return buildPlatformUrl('/platform/crm/opportunity-record', {
      opportunityId,
      source: 'customer-relations'
    })
  }

  return (
    <OpportunitySection
      opportunities={opportunities}
      isLoading={loading}
      error={error}
      recordUrlBuilder={recordUrlBuilder}
      additionalColumns={CUSTOMER_OPPORTUNITY_ADDITIONAL_COLUMNS}
      extendVisibleColumns={CUSTOMER_OPPORTUNITY_EXTENDED_COLUMN_IDS}
      data-testid="contact-opportunities-section"
    />
  )
}
