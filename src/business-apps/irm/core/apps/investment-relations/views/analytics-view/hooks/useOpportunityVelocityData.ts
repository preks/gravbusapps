import { useMemo } from 'react'
import {
  useGenericOpportunityVelocityData,
  type OpportunityVelocityData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunityVelocityData'

export type { OpportunityVelocityData }

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
