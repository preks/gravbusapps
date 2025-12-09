// IRM-specific wrapper for shared generic leads over time hook
import {
  useGenericLeadsOverTime,
  type LeadStatusCatalogEntry
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericLeadsOverTime'
import { TimeFilter } from '@/common/utils/analytics/dateRangeUtils'

export const useLeadsOverTime = (
  accessToken: string,
  timeFilter: TimeFilter = 'quarter',
  statusCatalogCodes?: LeadStatusCatalogEntry[]
) => {
  // Use shared generic hook with IRM-specific configuration
  return useGenericLeadsOverTime(
    accessToken,
    {
      entityName: 'InvestmentLead',
      entityAggregate: 'InvestmentLeadAggregate'
    },
    timeFilter,
    statusCatalogCodes
  )
}

export type {
  LeadsOverTimePoint,
  LeadStatusCatalogEntry
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericLeadsOverTime'
