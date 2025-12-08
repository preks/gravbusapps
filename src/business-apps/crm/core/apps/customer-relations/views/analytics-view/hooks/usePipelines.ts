import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface Pipeline {
  id: string
  name: string
  value: string
}

export const usePipelines = (accessToken: string) => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const loadPipelines = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch unique pipelines using distinctOn - much more efficient!
      const query = `
        query GetDistinctPipelines {
          Opportunity(
            where: {
              isDeleted: {_eq: false}
              salesPipelineRef: {_isNull: false}
            }
            distinctOn: [salesPipelineRef]
            limit: 20
          ) {
            salesPipeline {
              id
              value
              code
            }
          }
        }
      `

      const response = await graphqlClient.request<{
        Opportunity: Array<{ salesPipeline: { id: string; value?: string; code?: string } | null }>
      }>(query)

      // Map to Pipeline format (filter ensures salesPipeline is not null)
      const uniquePipelines = response.Opportunity.filter(opp => opp.salesPipeline?.id).map(opp => {
        const pipeline = opp.salesPipeline!
        return {
          id: pipeline.id,
          name: pipeline.value || pipeline.code || pipeline.id,
          value: pipeline.value || pipeline.code || pipeline.id
        }
      })

      setPipelines(uniquePipelines)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipelines')
      setPipelines([])
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, accessToken])

  useEffect(() => {
    loadPipelines()
  }, [loadPipelines])

  return {
    pipelines,
    isLoading,
    error,
    refetch: loadPipelines
  }
}
