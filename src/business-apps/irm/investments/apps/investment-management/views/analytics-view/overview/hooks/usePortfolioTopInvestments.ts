import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { fetchTopInvestmentsByValue, type TopInvestmentData } from '../queries/PortfolioTopInvestmentsQuery'

export interface UsePortfolioTopInvestmentsResult {
  investments: TopInvestmentData[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const usePortfolioTopInvestments = (
  accessToken: string,
  currency: string = 'all',
  limit: number = 10
): UsePortfolioTopInvestmentsResult => {
  const [investments, setInvestments] = useState<TopInvestmentData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const loadData = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchTopInvestmentsByValue(graphqlClient, currency, limit)
      setInvestments(result.investments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setInvestments([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, currency, graphqlClient, limit])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    investments,
    isLoading,
    error,
    refetch: () => loadData()
  }
}
