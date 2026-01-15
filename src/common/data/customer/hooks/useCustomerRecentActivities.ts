import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_RECENT_ACTIVITIES } from '../queries/customerPersonalWorkspaceQueries'
import type { MySalesActivity } from '../types/customerPersonalWorkspaceTypes'

interface UseCustomerRecentActivitiesParams {
  employeeId: string
  accessToken: string
  limit?: number
}

interface UseCustomerRecentActivitiesReturn {
  activities: MySalesActivity[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook for fetching recent customer activities
 * Used for Overview tab calendar and dashboard displays
 */
export const useCustomerRecentActivities = ({
  employeeId,
  accessToken,
  limit = 5
}: UseCustomerRecentActivitiesParams): UseCustomerRecentActivitiesReturn => {
  const [activities, setActivities] = useState<MySalesActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchActivities = useCallback(async () => {
    if (!employeeId || !accessToken) return

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<{
        SalesActivity: MySalesActivity[]
      }>(GET_RECENT_ACTIVITIES, {
        employeeId,
        limit
      })

      setActivities(result.SalesActivity || [])
    } catch (err) {
      console.error('Error fetching recent customer activities:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch recent activities'))
    } finally {
      setLoading(false)
    }
  }, [employeeId, accessToken, limit, graphqlClient])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  return {
    activities,
    loading,
    error,
    refetch: () => {
      void fetchActivities()
    }
  }
}
