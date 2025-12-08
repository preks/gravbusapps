/**
 * IRM-specific wrapper for useTopRevenueEarners hook
 * Uses InvestmentOpportunity entity
 */
import { useTopRevenueEarners as useSharedTopRevenueEarners } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'
export type { TopRevenueContact } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

export const useTopRevenueEarners = (accessToken: string, currencyCode?: string) => {
  return useSharedTopRevenueEarners(accessToken, currencyCode, 'InvestmentOpportunity')
}
