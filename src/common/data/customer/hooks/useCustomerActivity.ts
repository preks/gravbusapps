// Customer Activity hook - single activity by ID with automatic state management
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { CustomerActivity } from '../types/customerActivityTypes'
import { toCustomerActivity } from '../mappers/customerRelatedEntityMappers'
import { buildCustomerActivityByIdQuery } from '../queries/customerActivityQueries'
import { CustomerActivityFields } from '../types/customerActivityTypes'

export interface UseCustomerActivityResult {
  activity: CustomerActivity | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Declarative hook for fetching a single customer activity by ID.
 * Automatically fetches data when component mounts or ID changes.
 *
 * @param accessToken - Access token for authentication
 * @param id - Activity ID to fetch
 *
 * @example
 * // Basic usage
 * const { activity, loading, error } = useCustomerActivity(accessToken, activityId)
 *
 * if (loading) return <Spinner />
 * if (error) return <Alert>{error}</Alert>
 *
 * return <div>{activity?.title}</div>
 *
 * @example
 * // With refetch
 * const { activity, loading, refetch } = useCustomerActivity(accessToken, activityId)
 *
 * return (
 *   <div>
 *     <div>{activity?.title}</div>
 *     <Button onClick={refetch}>Refresh</Button>
 *   </div>
 * )
 */
export function useCustomerActivity(accessToken: string, id: string | undefined): UseCustomerActivityResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<UseCustomerActivityResult, 'refetch'>>({
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
      const query = buildCustomerActivityByIdQuery(CustomerActivityFields, id)

      // Execute query - SalesActivityByPk is the GraphQL entity name for CRM
      const result = await graphqlClient.request<{ SalesActivityByPk: any }>(query)

      const raw = result.SalesActivityByPk
      const activity = raw ? toCustomerActivity(raw) : null

      setState({ activity, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer activity'
      console.error('Error fetching customer activity:', error)
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
