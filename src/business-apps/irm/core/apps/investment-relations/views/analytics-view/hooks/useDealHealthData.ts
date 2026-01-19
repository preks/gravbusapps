/**
 * Re-export shared useDealHealthData hook from common location
 * This reduces code duplication between CRM and IRM modules
 *
 * Note: IRM uses 'InvestmentOpportunity' entity and doesn't have winningChance field
 */
import { useDealHealthData as useSharedDealHealthData } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

/**
 * Wrapper hook for IRM that uses 'InvestmentOpportunity' entity without winningChance
 */
export const useDealHealthData = (accessToken: string) => {
  return useSharedDealHealthData(accessToken, 'InvestmentOpportunity', false)
}

export type {
  DealHealthData,
  DealHealthItem
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'
