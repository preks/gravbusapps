import { useCallback, useMemo } from 'react'
import { usePipelinesData, type PipelinesConfig } from './usePipelinesData'

export interface PipelineInfo {
  id: string
  name: string
  ref: string
  description?: string
  color?: string
}

export interface UseGenericPipelineDashboardReturn {
  pipelines: PipelineInfo[]
  isLoading: boolean
  error: string | null
  refetch: () => void
  lastUpdated: Date | null
}

/**
 * Module-agnostic hook for fetching pipeline dashboards
 * Accepts configuration for any module (CRM, IRM, etc.)
 *
 * @example CRM
 * const { pipelines, isLoading } = useGenericPipelineDashboard(accessToken, crmPipelinesConfig)
 *
 * @example IRM
 * const { pipelines, isLoading } = useGenericPipelineDashboard(accessToken, irmPipelinesConfig)
 */
export const useGenericPipelineDashboard = (
  accessToken: string,
  config: PipelinesConfig
): UseGenericPipelineDashboardReturn => {
  const {
    pipelines: pipelinesData,
    isLoading,
    error,
    refetch: refetchPipelines
  } = usePipelinesData({
    accessToken,
    config
  })

  const pipelines = useMemo<PipelineInfo[]>(() => {
    return pipelinesData.map(pipeline => ({
      id: pipeline.id,
      name: pipeline.value,
      ref: pipeline.id,
      description: pipeline.additionalValue1,
      color: pipeline.additionalValue2 || '#1890ff'
    }))
  }, [pipelinesData])

  const lastUpdated = useMemo(() => {
    return pipelinesData.length > 0 ? new Date() : null
  }, [pipelinesData.length])

  const refetch = useCallback(() => {
    refetchPipelines()
  }, [refetchPipelines])

  return {
    pipelines,
    isLoading,
    error,
    refetch,
    lastUpdated
  }
}
