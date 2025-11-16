// Customer Account hook - single account by ID with automatic state management
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { toCustomerAccount, type CustomerAccount } from '../types/customerAccountTypes'
import { buildCustomerAccountByIdQuery } from '../queries/customerAccountQueries'

export interface UseCustomerAccountResult {
  account: CustomerAccount | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Declarative hook for fetching a single customer account by ID.
 * Automatically fetches data when component mounts or ID changes.
 *
 * @param context - Business app context with access token
 * @param id - Account ID to fetch
 *
 * @example
 * // Basic usage
 * const { account, loading, error } = useCustomerAccount(context, accountId)
 *
 * if (loading) return <Spinner />
 * if (error) return <Alert>{error}</Alert>
 *
 * return <div>{account?.name}</div>
 *
 * @example
 * // With refetch
 * const { account, loading, refetch } = useCustomerAccount(context, accountId)
 *
 * return (
 *   <div>
 *     <div>{account?.name}</div>
 *     <Button onClick={refetch}>Refresh</Button>
 *   </div>
 * )
 */
export function useCustomerAccount(context: BusinessAppContextProps, id: string | undefined): UseCustomerAccountResult {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const [state, setState] = useState<Omit<UseCustomerAccountResult, 'refetch'>>({
    account: null,
    loading: true,
    error: null
  })

  const fetchAccount = useCallback(async () => {
    // Don't fetch if no ID or no access token
    if (!id || !context.accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Build query
      const query = buildCustomerAccountByIdQuery()

      // Execute query with ID as GraphQL variable
      const result = await graphqlClient.request<{ AccountByPk: any }>(query, { id })

      const raw = result.AccountByPk
      const account = raw ? toCustomerAccount(raw) : null

      setState({ account, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer account'
      console.error('Error fetching customer account:', error)
      setState({ account: null, loading: false, error: errorMessage })
    }
  }, [id, context.accessToken, graphqlClient])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchAccount()
  }, [fetchAccount])

  return {
    ...state,
    refetch: fetchAccount
  }
}
