// CRM-specific wrapper for shared generic leads over time hook
import {
  useGenericLeadsOverTime,
  LeadsOverTimePoint,
  LeadStatusCatalogEntry
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericLeadsOverTime'
import { TimeFilter } from '@/common/utils/analytics/dateRangeUtils'

// Re-export types for backward compatibility
export type { LeadsOverTimePoint, LeadStatusCatalogEntry }

export const useLeadsOverTime = (
  accessToken: string,
  timeFilter: TimeFilter = 'quarter',
  statusCatalogCodes?: LeadStatusCatalogEntry[]
) => {
  // Use shared generic hook with CRM-specific configuration
  return useGenericLeadsOverTime(
    accessToken,
    {
      entityName: 'Lead',
      entityAggregate: 'LeadAggregate'
    },
    timeFilter,
    statusCatalogCodes
  )
}
