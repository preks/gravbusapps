/**
 * Investment hook - single investment by ID with automatic state management
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildInvestmentFragment, INVESTMENT_QUERY_CONFIGS } from '../queries/investmentQueries.new'
import { type Investment } from '../types/investmentTypes.new'

export interface UseInvestmentResult {
  investment: Investment | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Declarative hook for fetching a single investment by ID.
 * Automatically fetches data when component mounts or ID changes.
 *
 * @param accessToken - Access token for authentication
 * @param id - Investment ID to fetch
 * @param config - Query config name or custom field array (default: 'record')
 *
 * @example
 * // Basic usage
 * const { investment, loading, error } = useInvestment(accessToken, investmentId)
 *
 * if (loading) return <Spinner />
 * if (error) return <Alert>{error}</Alert>
 *
 * return <div>{investment?.name}</div>
 *
 * @example
 * // With refetch
 * const { investment, loading, refetch } = useInvestment(accessToken, investmentId)
 *
 * return (
 *   <div>
 *     <div>{investment?.name}</div>
 *     <Button onClick={refetch}>Refresh</Button>
 *   </div>
 * )
 */
export function useInvestment(
  accessToken: string,
  id: string | undefined,
  config: string | string[] = 'record'
): UseInvestmentResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<UseInvestmentResult, 'refetch'>>({
    investment: null,
    loading: true,
    error: null
  })

  const fetchInvestment = useCallback(async () => {
    // Don't fetch if no ID or no access token
    if (!id || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Resolve fields from config
      const fields: string[] =
        typeof config === 'string' ? INVESTMENT_QUERY_CONFIGS[config] || INVESTMENT_QUERY_CONFIGS.record : config

      // Build fragment
      const fragment = buildInvestmentFragment(fields)

      // Build query
      const query = `
        query GetInvestmentByPk($id: uuid!) {
          InvestmentByPk(id: $id) {
            ${fragment}
          }
        }
      `

      // Execute query with ID as GraphQL variable
      const result = await graphqlClient.request<{
        InvestmentByPk: any
      }>(query, { id })

      const investment = result.InvestmentByPk as Investment | null

      setState({ investment, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investment'
      console.error('Error fetching investment:', error)
      setState({ investment: null, loading: false, error: errorMessage })
    }
  }, [id, accessToken, graphqlClient, config])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchInvestment()
  }, [fetchInvestment])

  return {
    ...state,
    refetch: fetchInvestment
  }
}
