/**
 * React hook for fetching portfolio concentration data
 *
 * This hook provides server-side aggregated data for portfolio concentration
 * across different investment groups (Equity, Liquid Fund, Real Estate, etc.).
 */

import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { fetchConcentrationData, ConcentrationData } from '../queries/PortfolioConcentrationQuery'

export interface UsePortfolioConcentrationResult {
  concentrationData: ConcentrationData[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const usePortfolioConcentration = (
  accessToken: string,
  currency: string = 'ALL'
): UsePortfolioConcentrationResult => {
  const [concentrationData, setConcentrationData] = useState<ConcentrationData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get GraphQL client at the hook level
  const graphqlClient = useGraphQLClient(accessToken)

  const loadData = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchConcentrationData(graphqlClient, currency)

      setConcentrationData(result.concentrationData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      setConcentrationData([])
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, currency, accessToken])

  useEffect(() => {
    void loadData()
  }, [accessToken, currency])

  return {
    concentrationData,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
