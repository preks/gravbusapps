import { useMemo } from 'react'
import { useOpportunityStatusDistribution as useSharedOpportunityStatusDistribution } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useOpportunityStatusDistribution'

export const useOpportunityStatusDistribution = (accessToken: string) => {
  const config = useMemo(
    () => ({
      opportunityAggregate: 'OpportunityAggregate' as const,
      statusFilterField: 'code' as const
    }),
    []
  )

  return useSharedOpportunityStatusDistribution(accessToken, config)
}

export type { OpportunityStatusDistributionItem } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useOpportunityStatusDistribution'
