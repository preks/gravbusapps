import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface SalesPipeline {
  id: string
  code: string
  value: string
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
}

export interface UseSalesPipelinesReturn {
  pipelines: SalesPipeline[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useSalesPipelines = (accessToken: string): UseSalesPipelinesReturn => {
  const [pipelines, setPipelines] = useState<SalesPipeline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphQLClient = useGraphQLClient(accessToken)

  const GET_SALES_PIPELINES = `
    query GetSalesPipelines {
      pipelines: CatalogEntry(
        where: {
          catalog: { identifier: { _eq: "SalesPipeline" } }
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
        pipelines: SalesPipeline[]
      }>(GET_SALES_PIPELINES)

      if (result && result.pipelines) {
        setPipelines(result.pipelines)
      } else {
        setPipelines([])
      }
    } catch (err) {
      console.error('Error fetching sales pipelines:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch sales pipelines')
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
