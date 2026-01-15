import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_RECENT_ACTIVITIES } from '../queries/MyActivitiesQueries'
import type { MyActivity } from '../types'

interface UseRecentActivitiesParams {
  employeeId: string
  accessToken: string
  limit?: number
}

interface UseRecentActivitiesReturn {
  activities: MyActivity[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook for fetching recent activities for Overview tab calendar
 */
export const useRecentActivities = ({
  employeeId,
  accessToken,
  limit = 5
}: UseRecentActivitiesParams): UseRecentActivitiesReturn => {
  const [activities, setActivities] = useState<MyActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchActivities = useCallback(async () => {
    if (!employeeId || !accessToken) return

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<{
        SalesActivity: MyActivity[]
      }>(GET_RECENT_ACTIVITIES, {
        employeeId,
        limit
      })

      setActivities(result.SalesActivity || [])
    } catch (err) {
      console.error('Error fetching recent activities:', err)
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
