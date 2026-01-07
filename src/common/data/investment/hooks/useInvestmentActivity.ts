// Investment Activity hook - single activity by ID with automatic state management
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { InvestmentActivity } from '../types/investmentActivityTypes'
import { toInvestmentActivity } from '../mappers/investmentRelatedEntityMappers'
import { buildInvestmentActivityByIdQuery } from '../queries/investmentActivityQueries'

export interface UseInvestmentActivityResult {
  activity: InvestmentActivity | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Declarative hook for fetching a single investment activity by ID.
 * Automatically fetches data when component mounts or ID changes.
 *
 * @param accessToken - Access token for authentication
 * @param id - Activity ID to fetch
 *
 * @example
 * // Basic usage
 * const { activity, loading, error } = useInvestmentActivity(accessToken, activityId)
 *
 * if (loading) return <Spinner />
 * if (error) return <Alert>{error}</Alert>
 *
 * return <div>{activity?.title}</div>
 *
 * @example
 * // With refetch
 * const { activity, loading, refetch } = useInvestmentActivity(accessToken, activityId)
 *
 * return (
 *   <div>
 *     <div>{activity?.title}</div>
 *     <Button onClick={refetch}>Refresh</Button>
 *   </div>
 * )
 */
export function useInvestmentActivity(accessToken: string, id: string | undefined): UseInvestmentActivityResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<UseInvestmentActivityResult, 'refetch'>>({
    activity: null,
    loading: true,
    error: null
  })

  const fetchActivity = useCallback(async () => {
    // Don't fetch if no ID or no access token
    if (!id || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Build query
      const query = buildInvestmentActivityByIdQuery(undefined, id)

      // Execute query - InvestmentActivityByPk is the GraphQL entity name
      const result = await graphqlClient.request<{ InvestmentActivityByPk: InvestmentActivity }>(query)

      const raw = result.InvestmentActivityByPk
      const activity = raw ? toInvestmentActivity(raw) : null

      setState({ activity, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investment activity'
      console.error('Error fetching investment activity:', error)
      setState({ activity: null, loading: false, error: errorMessage })
    }
  }, [id, accessToken, graphqlClient])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  return {
    ...state,
    refetch: fetchActivity
  }
}
