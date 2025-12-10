import { useMemo } from 'react'
import { useGenericOpportunityVelocityData } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunityVelocityData'

/**
 * CRM-specific wrapper for useGenericOpportunityVelocityData
 */
export const useOpportunityVelocityData = (accessToken: string) => {
  const config = useMemo(
    () => ({
      opportunityEntity: 'Opportunity',
      opportunityAggregate: 'OpportunityAggregate',
      useWinningChance: true,
      quickWinsFilter: 'winningChance: {_gte: 80}'
    }),
    []
  )

  return useGenericOpportunityVelocityData(accessToken, config)
}

export type { OpportunityVelocityData } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunityVelocityData'
