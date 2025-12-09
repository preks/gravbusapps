// CRM-specific wrapper for shared generic overview data hook
import {
  useGenericOverviewData,
  type OverviewCounts,
  type OverviewConversionMetrics,
  type OverviewTrendData,
  type GeographicDataPoint,
  type GenericOverviewData as OverviewData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOverviewData'

const useOverviewData = (accessToken: string, currencyCode?: string) => {
  // Use shared generic hook with CRM-specific configuration
  return useGenericOverviewData(
    accessToken,
    {
      leadEntity: 'Lead',
      accountEntity: 'Account',
      opportunityEntity: 'Opportunity',
      contactEntity: 'Contact',
      addressEntity: 'CrmAddress'
    },
    currencyCode
  )
}

export {
  useOverviewData,
  type OverviewCounts,
  type OverviewConversionMetrics,
  type OverviewTrendData,
  type GeographicDataPoint,
  type OverviewData
}
