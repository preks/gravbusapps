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
      console.warn('⚠️ No access token provided to usePortfolioConcentration')
      setIsLoading(false)
      return
    }

    console.log(`🔄 Concentration hook: Loading data... {currency: '${currency}'}`)
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchConcentrationData(graphqlClient, currency)

      console.log(`✅ Concentration hook: Successfully loaded ${result.concentrationData.length} groups`)
      setConcentrationData(result.concentrationData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      console.error('❌ Concentration hook: Error loading data:', errorMessage)
      setError(errorMessage)
      setConcentrationData([])
    } finally {
      setIsLoading(false)
      console.log('🏁 Concentration hook: Load completed')
    }
  }, [graphqlClient, currency, accessToken])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    concentrationData,
    isLoading,
    error,
    refetch: loadData
  }
}
