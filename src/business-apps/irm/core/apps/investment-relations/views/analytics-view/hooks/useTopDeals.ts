/**
 * Re-export shared useTopDeals hook from common location
 * This reduces code duplication between CRM and IRM modules
 *
 * Note: IRM uses 'InvestmentOpportunity', 'opportunityPipelineStage', and doesn't have winningChance
 */
import { useTopDeals as useSharedTopDeals } from '@/common/hooks/analytics/useTopDeals'

export type { TopDeal } from '@/common/hooks/analytics/useTopDeals'

/**
 * Wrapper hook for IRM that uses 'InvestmentOpportunity' entity with limit 10
 */
export const useTopDeals = (accessToken: string, currencyCode?: string) => {
  return useSharedTopDeals(accessToken, currencyCode, 'InvestmentOpportunity', 'opportunityPipelineStage', false, 10)
}
