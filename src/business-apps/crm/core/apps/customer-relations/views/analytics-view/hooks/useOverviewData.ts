// CRM-specific wrapper for shared generic overview data hook
import { useGenericOverviewData } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOverviewData'

// Re-export types for backward compatibility
export type {
  OverviewCounts,
  OverviewConversionMetrics,
  OverviewTrendData,
  GeographicDataPoint,
  GenericOverviewData as OverviewData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOverviewData'

export const useOverviewData = (accessToken: string, currencyCode?: string) => {
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
