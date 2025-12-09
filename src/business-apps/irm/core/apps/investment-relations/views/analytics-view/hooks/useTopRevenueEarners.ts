/**
 * IRM-specific wrapper for useTopRevenueEarners hook
 * Uses InvestmentOpportunity entity
 */
import { useTopRevenueEarners as useSharedTopRevenueEarners } from '@/common/hooks/analytics/useTopRevenueEarners'
export type { TopRevenueContact } from '@/common/hooks/analytics/useTopRevenueEarners'

export const useTopRevenueEarners = (accessToken: string, currencyCode?: string) => {
  return useSharedTopRevenueEarners(accessToken, currencyCode, 'InvestmentOpportunity')
}
