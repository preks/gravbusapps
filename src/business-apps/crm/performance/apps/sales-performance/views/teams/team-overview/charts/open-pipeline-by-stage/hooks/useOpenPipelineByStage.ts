import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { usePipelines } from '../../../../../../hooks/usePipelines'
import {
  buildPipelineStagesQuery,
  mapPipelineStagesResponse,
  type PipelineStageRecord
} from '../../shared/data/pipelineStagesQueries'
import { buildOpenPipelineByStageQuery } from '../data/openPipelineByStageQueries'
import { mapOpenPipelineByStageResponse } from '../data/mapOpenPipelineByStageResponse'
import type { PipelineStagePoint } from '../types'

interface UseOpenPipelineByStageProps {
  accessToken: string
  teamMemberIds: string[]
  currencyCode?: string
  pipelineId?: string
}

interface UseOpenPipelineByStageResult {
  stageData: PipelineStagePoint[]
  pipelines: ReturnType<typeof usePipelines>['pipelines']
  pipelinesLoading: boolean
  selectedPipelineId?: string
  setSelectedPipelineId: (pipelineId: string) => void
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useOpenPipelineByStage = ({
  accessToken,
  teamMemberIds,
  currencyCode = 'EUR',
  pipelineId
}: UseOpenPipelineByStageProps): UseOpenPipelineByStageResult => {
  const graphqlClient = useGraphQLClient(accessToken)
  const { pipelines, isLoading: pipelinesLoading } = usePipelines(accessToken)
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>(pipelineId)
  const [stageData, setStageData] = useState<PipelineStagePoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedPipelineId && pipelines.length > 0) {
      setSelectedPipelineId(pipelines[0].id)
    }
  }, [pipelines, selectedPipelineId])

  const effectivePipelineId = selectedPipelineId || pipelines[0]?.id

  const fetchStageData = useCallback(async () => {
    if (!accessToken || teamMemberIds.length === 0) {
      setStageData([])
      setIsLoading(false)
      setError(null)
      return
    }

    if (pipelines.length > 0 && !effectivePipelineId) {
      setStageData([])
      setIsLoading(pipelinesLoading)
      return
    }

    if (!effectivePipelineId) {
      setStageData([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const stagesResponse = await graphqlClient.request<Record<string, unknown>>(
        buildPipelineStagesQuery(effectivePipelineId)
      )
      const stages: PipelineStageRecord[] = mapPipelineStagesResponse(stagesResponse)

      if (stages.length === 0) {
        setStageData([])
        return
      }

      const aggregatesQuery = buildOpenPipelineByStageQuery(teamMemberIds, stages, currencyCode, effectivePipelineId)
      const aggregatesResponse = await graphqlClient.request<Record<string, unknown>>(aggregatesQuery)
      setStageData(mapOpenPipelineByStageResponse(aggregatesResponse, stages))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load open pipeline by stage')
      setStageData([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, currencyCode, effectivePipelineId, graphqlClient, pipelines.length, pipelinesLoading, teamMemberIds])

  useEffect(() => {
    fetchStageData().catch(() => undefined)
  }, [fetchStageData])

  return {
    stageData,
    pipelines,
    pipelinesLoading,
    selectedPipelineId: effectivePipelineId,
    setSelectedPipelineId,
    isLoading,
    error,
    refetch: () => {
      fetchStageData().catch(() => undefined)
    }
  }
}
