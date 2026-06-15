import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { usePipelines } from '../../../../../../hooks/usePipelines'
import { generateForecastPeriods } from '../../shared/forecastPeriods'
import { buildTeamPipelineForecastQuery } from '../data/pipelineForecastQueries'
import { mapPipelineForecastResponse } from '../data/mapPipelineForecastResponse'
import type { PipelineForecastPoint } from '../types'

interface UseTeamPipelineForecastProps {
  accessToken: string
  teamMemberIds: string[]
  currencyCode?: string
  pipelineId?: string
}

interface UseTeamPipelineForecastResult {
  forecastData: PipelineForecastPoint[]
  pipelines: ReturnType<typeof usePipelines>['pipelines']
  pipelinesLoading: boolean
  selectedPipelineId?: string
  setSelectedPipelineId: (pipelineId: string) => void
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useTeamPipelineForecast = ({
  accessToken,
  teamMemberIds,
  currencyCode = 'EUR',
  pipelineId
}: UseTeamPipelineForecastProps): UseTeamPipelineForecastResult => {
  const graphqlClient = useGraphQLClient(accessToken)
  const { pipelines, isLoading: pipelinesLoading } = usePipelines(accessToken)
  const [selectedPipelineId, setSelectedPipelineIdRaw] = useState<string | undefined>(pipelineId)
  const [forecastData, setForecastData] = useState<PipelineForecastPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setSelectedPipelineId = useCallback((value: string) => {
    setSelectedPipelineIdRaw(value === 'all' ? undefined : value)
  }, [])

  const fetchForecast = useCallback(async () => {
    if (!accessToken || teamMemberIds.length === 0) {
      setForecastData([])
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const periods = generateForecastPeriods()
      const query = buildTeamPipelineForecastQuery(teamMemberIds, periods, currencyCode, selectedPipelineId)
      const response = await graphqlClient.request<Record<string, unknown>>(query)
      setForecastData(mapPipelineForecastResponse(response, periods))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipeline forecast')
      setForecastData([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, currencyCode, graphqlClient, selectedPipelineId, teamMemberIds])

  useEffect(() => {
    fetchForecast().catch(() => undefined)
  }, [fetchForecast])

  return {
    forecastData,
    pipelines,
    pipelinesLoading,
    selectedPipelineId,
    setSelectedPipelineId,
    isLoading,
    error,
    refetch: () => {
      fetchForecast().catch(() => undefined)
    }
  }
}
