import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { KanbanStage } from '../types'

export interface UseGenericPipelineStagesReturn {
  stages: KanbanStage[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useGenericPipelineStages = (
  accessToken: string,
  stagesCatalogIdentifier: string,
  pipelineId?: string
): UseGenericPipelineStagesReturn => {
  const [stages, setStages] = useState<KanbanStage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphQLClient = useGraphQLClient(accessToken)

  const GET_PIPELINE_STAGES = `
    query GetPipelineStages($stagesCatalogIdentifier: String!, $pipelineRef: String!) {
      stages: CatalogEntry(
        where: {
          catalog: { identifier: { _eq: $stagesCatalogIdentifier } }
          parentEntryId: { _eq: $pipelineRef }
          isDeleted: { _eq: false }
        }
        orderBy: { additionalValue1: ASC }
      ) {
        id
        code
        value
        additionalValue1
        additionalValue2
        additionalValue3
        parentEntryId
        catalog {
          id
          identifier
          name
        }
      }
    }
  `

  const fetchPipelineStages = useCallback(
    async (pipelineRef: string) => {
      if (!accessToken) {
        setError('Access token not available')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await graphQLClient.request<{
          stages: any[]
        }>(GET_PIPELINE_STAGES, { stagesCatalogIdentifier, pipelineRef })

        if (result && result.stages) {
          // Transform catalog entries to KanbanStage objects
          const stageData = result.stages.map((entry: any) => ({
            id: entry.id,
            name: entry.value,
            code: entry.code, // Include the catalog code for API calls
            order: parseInt(entry.additionalValue1 || '999'),
            probability: 0, // Default probability, could be enhanced later
            rotting: false,
            rottingDays: 0
          }))

          // Sort by additionalValue1 (order) in ascending order
          const sortedStages = stageData.sort((a, b) => a.order - b.order)
          setStages(sortedStages)
        } else {
          setStages([])
        }
      } catch (err) {
        console.error(`Error fetching pipeline stages from ${stagesCatalogIdentifier}:`, err)
        setError(err instanceof Error ? err.message : `Failed to fetch pipeline stages from ${stagesCatalogIdentifier}`)
        setStages([])
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, graphQLClient, stagesCatalogIdentifier]
  )

  const refetch = useCallback(() => {
    if (pipelineId) {
      fetchPipelineStages(pipelineId)
    }
  }, [fetchPipelineStages, pipelineId])

  useEffect(() => {
    if (pipelineId && accessToken) {
      fetchPipelineStages(pipelineId)
    } else {
      setStages([])
      setIsLoading(false)
      setError(null)
    }
  }, [pipelineId, accessToken, fetchPipelineStages])

  return {
    stages,
    isLoading,
    error,
    refetch
  }
}
