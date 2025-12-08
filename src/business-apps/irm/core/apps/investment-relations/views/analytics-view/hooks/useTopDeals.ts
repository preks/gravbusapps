/**
 * Re-export shared useTopDeals hook from common location
 * This reduces code duplication between CRM and IRM modules
 *
 * Note: IRM uses 'InvestmentOpportunity', 'opportunityPipelineStage', and doesn't have winningChance
 */
import { useTopDeals as useSharedTopDeals } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

export type { TopDeal } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

/**
 * Wrapper hook for IRM that uses 'InvestmentOpportunity' entity with limit 10
 */
export const useTopDeals = (accessToken: string, currencyCode?: string) => {
  return useSharedTopDeals(accessToken, currencyCode, 'InvestmentOpportunity', 'opportunityPipelineStage', false, 10)
}
