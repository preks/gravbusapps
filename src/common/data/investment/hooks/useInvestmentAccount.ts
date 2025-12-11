// Investment Account hook - single account by ID with automatic state management
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { toInvestmentAccount, type InvestmentAccount } from '../types/investmentAccountTypes'
import { buildInvestmentAccountByIdQuery } from '../queries/investmentAccountQueries'

export interface UseInvestmentAccountResult {
  account: InvestmentAccount | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Declarative hook for fetching a single investment account by ID.
 * Automatically fetches data when component mounts or ID changes.
 *
 * @param accessToken - Access token for authentication
 * @param id - Account ID to fetch
 *
 * @example
 * // Basic usage
 * const { account, loading, error } = useInvestmentAccount(accessToken, accountId)
 *
 * if (loading) return <Spinner />
 * if (error) return <Alert>{error}</Alert>
 *
 * return <div>{account?.name}</div>
 *
 * @example
 * // With refetch
 * const { account, loading, refetch } = useInvestmentAccount(accessToken, accountId)
 *
 * return (
 *   <div>
 *     <div>{account?.name}</div>
 *     <Button onClick={refetch}>Refresh</Button>
 *   </div>
 * )
 */
export function useInvestmentAccount(accessToken: string, id: string | undefined): UseInvestmentAccountResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<UseInvestmentAccountResult, 'refetch'>>({
    account: null,
    loading: true,
    error: null
  })

  const fetchAccount = useCallback(async () => {
    // Don't fetch if no ID or no access token
    if (!id || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Build query
      const query = buildInvestmentAccountByIdQuery()

      // Execute query with ID as GraphQL variable
      const result = await graphqlClient.request<{
        InvestmentAccountByPk: {
          investmentAccountContact?: Array<{
            id: string
            contactType?: string
            contact?: any
          }>
        }
      }>(query, { id })

      const raw = result.InvestmentAccountByPk
      const account = raw ? toInvestmentAccount(raw) : null

      setState({ account, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investment account'
      console.error('Error fetching investment account:', error)
      setState({ account: null, loading: false, error: errorMessage })
    }
  }, [id, accessToken, graphqlClient])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchAccount()
  }, [fetchAccount])

  return {
    ...state,
    refetch: fetchAccount
  }
}
