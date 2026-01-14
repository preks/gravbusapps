import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  PipelineInfo,
  DateRange
} from '@/common/components/common-relations/view-layouts/dashboard-layout/types/dashboardTypes'
import { formatCurrency, extractCurrencyCode } from '@/common/utils/numberFormatter'
import { useGenericOverviewData } from '@/common/components/common-relations/view-layouts/dashboard-layout/hooks/useGenericOverviewData'
import type { UseOverviewDataReturn } from '@/common/components/common-relations/view-layouts/dashboard-layout/hooks/types/OverviewDataTypes'
import { crmOverviewDashboardConfig } from '../config/overviewDashboardConfig'

// Re-export shared types for backward compatibility
export type {
  OverviewData,
  UseOverviewDataReturn
} from '@/common/components/common-relations/view-layouts/dashboard-layout/hooks/types/OverviewDataTypes'

/**
 * CRM-specific wrapper around the shared useGenericOverviewData hook
 * Provides CRM-specific table and field configurations
 */
export const useOverviewData = (
  context: BusinessAppContextProps,
  pipelines: PipelineInfo[],
  dateRange: DateRange,
  shouldFetch: boolean = true
): UseOverviewDataReturn => {
  const currentEmployeeId = context.userInfo?.employeeDetails?.employeeId

  return useGenericOverviewData(
    context.accessToken,
    pipelines,
    dateRange,
    shouldFetch,
    currentEmployeeId,
    { formatCurrency, extractCurrencyCode },
    crmOverviewDashboardConfig
  )
}
