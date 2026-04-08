import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { KanbanPipeline } from '../types'

export interface UseGenericPipelinesReturn {
  pipelines: KanbanPipeline[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useGenericPipelines = (accessToken: string, catalogIdentifier: string): UseGenericPipelinesReturn => {
  const [pipelines, setPipelines] = useState<KanbanPipeline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphQLClient = useGraphQLClient(accessToken)

  const GET_PIPELINES = `
    query GetPipelines($catalogIdentifier: String!) {
      pipelines: CatalogEntry(
        where: {
          catalog: { identifier: { _eq: $catalogIdentifier } }
          isDeleted: { _eq: false }
        }
        orderBy: { value: ASC }
      ) {
        id
        code
        value
        additionalValue1
        additionalValue2
        additionalValue3
      }
    }
  `

  const fetchPipelines = useCallback(async () => {
    if (!accessToken) {
      setError('Access token not available')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await graphQLClient.request<{
        pipelines: KanbanPipeline[]
      }>(GET_PIPELINES, { catalogIdentifier })

      if (result && result.pipelines) {
        setPipelines(result.pipelines)
      } else {
        setPipelines([])
      }
    } catch (err) {
      console.error(`Error fetching pipelines from ${catalogIdentifier}:`, err)
      setError(err instanceof Error ? err.message : `Failed to fetch pipelines from ${catalogIdentifier}`)
      setPipelines([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphQLClient, catalogIdentifier])

  const refetch = useCallback(() => {
    fetchPipelines()
  }, [fetchPipelines])

  useEffect(() => {
    fetchPipelines()
  }, [fetchPipelines])

  return {
    pipelines,
    isLoading,
    error,
    refetch
  }
}
