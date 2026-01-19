import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  PipelineInfo,
  DateRange
} from '@/common/components/common-relations/view-layouts/dashboard-layout/types/dashboardTypes'
import { usePipelineDetailsData } from '@/common/components/common-relations/view-layouts/dashboard-layout/hooks/usePipelineDetailsData'
import type { UsePipelineDataReturn } from '@/common/components/common-relations/view-layouts/dashboard-layout/hooks/types/PipelineDataTypes'
import { irmPipelineDetailsConfig } from '../config/pipelineDetailsConfig'

// Re-export shared type for backward compatibility
export type { UsePipelineDataReturn } from '@/common/components/common-relations/view-layouts/dashboard-layout/hooks/types/PipelineDataTypes'

/**
 * IRM-specific wrapper around the shared usePipelineDetailsData hook
 */
export const usePipelineData = (
  context: BusinessAppContextProps,
  pipeline: PipelineInfo | null,
  dateRange: DateRange,
  selectedCurrency?: string,
  shouldFetch: boolean = true
): UsePipelineDataReturn => {
  return usePipelineDetailsData({
    accessToken: context.accessToken,
    pipeline,
    dateRange: {
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString()
    },
    selectedCurrency,
    enabled: shouldFetch,
    config: irmPipelineDetailsConfig
  })
}
