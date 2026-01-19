import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PipelineInfo } from '@/common/components/common-relations/view-layouts/dashboard-layout/types/dashboardTypes'
import { useGenericPipelineDashboard } from '@/common/components/common-relations/view-layouts/dashboard-layout/hooks/useGenericPipelineDashboard'
import { irmPipelinesConfig } from '../config/pipelinesConfig'

export interface UseSalesDashboardReturn {
  pipelines: PipelineInfo[]
  isLoading: boolean
  error: string | null
  refetch: () => void
  lastUpdated: Date | null
}

/**
 * IRM-specific hook for fetching investment opportunity pipelines
 */
export const useSalesDashboard = (context: BusinessAppContextProps): UseSalesDashboardReturn => {
  return useGenericPipelineDashboard(context.accessToken, irmPipelinesConfig)
}
