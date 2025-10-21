/**
 * React hook for fetching top accounts by value
 *
 * This hook provides server-side aggregated data for the top investment accounts
 * ranked by their total portfolio value (market value or investment amount).
 */

import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { fetchTopAccounts, TopAccountData } from '../queries/PortfolioTopAccountsQuery'

export interface UsePortfolioTopAccountsResult {
  accounts: TopAccountData[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const usePortfolioTopAccounts = (
  accessToken: string,
  currency: string = 'ALL',
  limit: number = 10
): UsePortfolioTopAccountsResult => {
  const [accounts, setAccounts] = useState<TopAccountData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get GraphQL client at the hook level
  const graphqlClient = useGraphQLClient(accessToken)

  const loadData = useCallback(async () => {
    if (!accessToken) {
      console.warn('⚠️ No access token provided to usePortfolioTopAccounts')
      setIsLoading(false)
      return
    }

    console.log(`🔄 Top Accounts hook: Loading data... {limit: ${limit}, currency: '${currency}'}`)
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchTopAccounts(graphqlClient, limit, currency)

      console.log(`✅ Top Accounts hook: Successfully loaded ${result.accounts.length} accounts`)
      setAccounts(result.accounts)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      console.error('❌ Top Accounts hook: Error loading data:', errorMessage)
      setError(errorMessage)
      setAccounts([])
    } finally {
      setIsLoading(false)
      console.log('🏁 Top Accounts hook: Load completed')
    }
  }, [graphqlClient, currency, limit, accessToken])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    accounts,
    isLoading,
    error,
    refetch: loadData
  }
}
