// IRM-specific wrapper for shared generic leads over time hook
import {
  useGenericLeadsOverTime,
  type LeadsOverTimePoint,
  type LeadStatusCatalogEntry
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericLeadsOverTime'
import { TimeFilter } from '@/common/utils/analytics/dateRangeUtils'

const useLeadsOverTime = (
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

export { useLeadsOverTime, type LeadsOverTimePoint, type LeadStatusCatalogEntry }
