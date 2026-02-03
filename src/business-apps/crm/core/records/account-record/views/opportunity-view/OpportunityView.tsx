import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { OpportunitySection } from '@/common/components/common-relations/record-sections/opportunity-section'
import { useCustomerOpportunitiesList } from '@/common/data/customer/hooks/useCustomerOpportunities'
import {
  CUSTOMER_OPPORTUNITY_ADDITIONAL_COLUMNS,
  CUSTOMER_OPPORTUNITY_EXTENDED_COLUMN_IDS
} from '@/common/components/customer/view-layouts/opportunity-layout/config/opportunityColumns'

interface OpportunityViewProps {
  accountId: string
  context: BusinessAppContextProps
}

export const OpportunityView: React.FC<OpportunityViewProps> = ({ accountId, context }) => {
  const queryVariables = useMemo(
    () => ({
      accountIds: [accountId],
      limit: 100,
      orderBy: [{ field: 'createdAt' as const, direction: 'DESC_NULLS_LAST' as const }]
    }),
    [accountId]
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
      data-testid="account-opportunities-section"
    />
  )
}
