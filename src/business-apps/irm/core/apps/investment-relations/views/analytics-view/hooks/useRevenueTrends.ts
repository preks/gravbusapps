/**
 * Re-export shared useRevenueTrends hook from common location
 * This reduces code duplication between CRM and IRM modules
 *
 * Note: IRM uses 'InvestmentOpportunity' as the entity name and 'opportunityPipeline' as the pipeline field
 */
import { useRevenueTrends as useSharedRevenueTrends } from '@/common/hooks/analytics/useRevenueTrends'

export type { RevenueTrendData, TimeFilter } from '@/common/hooks/analytics/useRevenueTrends'

/**
 * Wrapper hook for IRM that uses 'InvestmentOpportunity' entity
 */
export const useRevenueTrends = (
  accessToken: string,
  timeFilter: TimeFilter = 'sixMonths',
  selectedPipelineId?: string,
  currencyCode?: string
) => {
  return useSharedRevenueTrends(
    accessToken,
    timeFilter,
    selectedPipelineId,
    currencyCode,
    'InvestmentOpportunity',
    'opportunityPipeline'
  )
}
