import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PipelineInfo } from '../types/dashboardTypes'
import { useDashboardQueries } from '../queries/DashboardQueries'

export interface UseSalesDashboardReturn {
  pipelines: PipelineInfo[]
  isLoading: boolean
  error: string | null
  refetch: () => void
  lastUpdated: Date | null
}

export const useSalesDashboard = (context: BusinessAppContextProps): UseSalesDashboardReturn => {
  const [pipelines, setPipelines] = useState<PipelineInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const { fetchPipelines } = useDashboardQueries(context)

  const loadDashboardData = useCallback(async () => {
    if (!context.accessToken) {
      setError('Access token not available')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch all available pipelines
      const pipelineData = await fetchPipelines()

      // Transform pipeline data to our interface
      // Note: pipeline.id is a string reference like "OpportunityPipeline:v1:STANDARD" (not a UUID)
      // Both opportunityPipelineRef and parentEntryId use this same format
      const transformedPipelines: PipelineInfo[] = pipelineData.map((pipeline: any) => ({
        id: pipeline.id,
        name: pipeline.value,
        ref: pipeline.id, // Use id as the reference (e.g. "OpportunityPipeline:v1:STANDARD")
        description: pipeline.additionalValue1,
        color: pipeline.additionalValue2 || '#1890ff'
      }))

      setPipelines(transformedPipelines)
      setLastUpdated(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data'
      setError(errorMessage)
      // Error handled by state management
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, fetchPipelines])

  const refetch = useCallback(() => {
    loadDashboardData()
  }, [loadDashboardData])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  return {
    pipelines,
    isLoading,
    error,
    refetch,
    lastUpdated
  }
}
