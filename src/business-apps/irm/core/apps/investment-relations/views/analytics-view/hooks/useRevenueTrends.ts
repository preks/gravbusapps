/**
 * Re-export shared useRevenueTrends hook from common location
 * This reduces code duplication between CRM and IRM modules
 *
 * Note: IRM uses 'InvestmentOpportunity' as the entity name and 'opportunityPipeline' as the pipeline field
 */
import {
  useRevenueTrends as useSharedRevenueTrends,
  type TimeFilter,
  type RevenueTrendData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

/**
 * Wrapper hook for IRM that uses 'InvestmentOpportunity' entity
 */
const useRevenueTrends = (
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

export { useRevenueTrends, type RevenueTrendData, type TimeFilter }
