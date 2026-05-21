// IRM-specific wrapper for shared generic overview data hook
import { useGenericOverviewData } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOverviewData'

export const useOverviewData = (accessToken: string, currencyCode?: string) => {
  // Use shared generic hook with IRM-specific configuration
  return useGenericOverviewData(
    accessToken,
    {
      leadEntity: 'InvestmentLead',
      accountEntity: 'InvestmentAccount',
      opportunityEntity: 'InvestmentOpportunity',
      contactEntity: 'InvestmentContact',
      addressEntity: 'InvestmentAddress'
    },
    currencyCode
  )
}

export type {
  OverviewCounts,
  OverviewConversionMetrics,
  OverviewTrendData,
  GenericOverviewData as OverviewData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOverviewData'
