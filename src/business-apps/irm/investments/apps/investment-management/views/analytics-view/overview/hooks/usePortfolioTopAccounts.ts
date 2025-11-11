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
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchTopAccounts(graphqlClient, limit, currency)

      setAccounts(result.accounts)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      setAccounts([])
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, currency, limit, accessToken])

  useEffect(() => {
    void loadData()
  }, [accessToken, currency, limit])

  return {
    accounts,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
