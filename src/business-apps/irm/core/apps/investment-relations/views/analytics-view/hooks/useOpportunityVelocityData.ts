import { useMemo } from 'react'
import { useGenericOpportunityVelocityData } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunityVelocityData'

/**
 * IRM-specific wrapper for useGenericOpportunityVelocityData
 */
export const useOpportunityVelocityData = (accessToken: string) => {
  const config = useMemo(
    () => ({
      opportunityEntity: 'InvestmentOpportunity',
      opportunityAggregate: 'InvestmentOpportunityAggregate',
      useWinningChance: false,
      quickWinsFilter: undefined
    }),
    []
  )

  return useGenericOpportunityVelocityData(accessToken, config)
}

export type { OpportunityVelocityData } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunityVelocityData'
