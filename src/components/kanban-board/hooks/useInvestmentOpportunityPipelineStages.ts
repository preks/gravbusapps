import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { KanbanStage } from '../types'

export interface UseInvestmentOpportunityPipelineStagesReturn {
  stages: KanbanStage[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useInvestmentOpportunityPipelineStages = (
  accessToken: string,
  pipelineId?: string
): UseInvestmentOpportunityPipelineStagesReturn => {
  const [stages, setStages] = useState<KanbanStage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphQLClient = useGraphQLClient(accessToken)

  const GET_PIPELINE_STAGES = `
    query GetInvestmentOpportunityPipelineStages($pipelineRef: String!) {
      stages: CatalogEntry(
        where: {
          catalog: { identifier: { _eq: "InvestmentOpportunityPipelineStage" } }
          parentEntryId: { _eq: $pipelineRef }
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
        }>(GET_PIPELINE_STAGES, { pipelineRef })

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
        console.error('Error fetching investment opportunity pipeline stages:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch investment opportunity pipeline stages')
        setStages([])
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, graphQLClient]
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
