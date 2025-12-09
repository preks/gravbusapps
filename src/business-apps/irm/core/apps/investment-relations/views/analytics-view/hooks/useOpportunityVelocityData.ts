import { useMemo } from 'react'
import {
  useGenericOpportunityVelocityData,
  type OpportunityVelocityData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunityVelocityData'

/**
 * IRM-specific wrapper for useGenericOpportunityVelocityData
 */
const useOpportunityVelocityData = (accessToken: string) => {
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

export { useOpportunityVelocityData, type OpportunityVelocityData }
