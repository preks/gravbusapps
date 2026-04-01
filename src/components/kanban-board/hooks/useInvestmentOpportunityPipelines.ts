import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface InvestmentOpportunityPipeline {
  id: string
  code: string
  value: string
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
}

export interface UseInvestmentOpportunityPipelinesReturn {
  pipelines: InvestmentOpportunityPipeline[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useInvestmentOpportunityPipelines = (accessToken: string): UseInvestmentOpportunityPipelinesReturn => {
  const [pipelines, setPipelines] = useState<InvestmentOpportunityPipeline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphQLClient = useGraphQLClient(accessToken)

  const GET_INVESTMENT_OPPORTUNITY_PIPELINES = `
    query GetInvestmentOpportunityPipelines {
      pipelines: CatalogEntry(
        where: {
          catalog: { identifier: { _eq: "InvestmentOpportunityPipeline" } }
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
        pipelines: InvestmentOpportunityPipeline[]
      }>(GET_INVESTMENT_OPPORTUNITY_PIPELINES)

      if (result && result.pipelines) {
        setPipelines(result.pipelines)
      } else {
        setPipelines([])
      }
    } catch (err) {
      console.error('Error fetching investment opportunity pipelines:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch investment opportunity pipelines')
      setPipelines([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphQLClient])

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
