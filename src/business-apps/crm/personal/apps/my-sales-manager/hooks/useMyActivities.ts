import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_MY_ACTIVITIES, GET_RECENT_ACTIVITIES } from '../queries/MyActivitiesQueries'
import type { MySalesActivity } from '../types'
import dayjs from 'dayjs'

interface UseMyActivitiesParams {
  employeeId: string
  accessToken: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}

interface UseMyActivitiesReturn {
  activities: MySalesActivity[]
  total: number
  loading: boolean
  error: Error | null
  refetch: () => void
}

export const useMyActivities = ({
  employeeId,
  accessToken,
  dateFrom,
  dateTo,
  limit = 50,
  offset = 0
}: UseMyActivitiesParams): UseMyActivitiesReturn => {
  const [activities, setActivities] = useState<MySalesActivity[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchActivities = useCallback(async () => {
    if (!employeeId || !accessToken) return

    setLoading(true)
    setError(null)

    try {
      // Default to last 3 months to today (inclusive of today's activities)
      const startDate = dateFrom || dayjs().subtract(3, 'months').startOf('day').toISOString()
      const endDate = dateTo || dayjs().add(1, 'day').endOf('day').toISOString()

      const result = await graphqlClient.request<{
        SalesActivity: MySalesActivity[]
        SalesActivityAggregate: {
          aggregate: {
            count: number
          }
        }
      }>(GET_MY_ACTIVITIES, {
        employeeId,
        dateFrom: startDate,
        dateTo: endDate,
        limit,
        offset
      })

      setActivities(result.SalesActivity || [])
      setTotal(result.SalesActivityAggregate?.aggregate?.count || 0)
    } catch (err) {
      console.error('Error fetching my activities:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch activities'))
    } finally {
      setLoading(false)
    }
  }, [employeeId, accessToken, dateFrom, dateTo, limit, offset])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  return {
    activities,
    total,
    loading,
    error,
    refetch: fetchActivities
  }
}

interface UseRecentActivitiesParams {
  employeeId: string
  accessToken: string
  limit?: number
}

interface UseRecentActivitiesReturn {
  activities: MySalesActivity[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

export const useRecentActivities = ({
  employeeId,
  accessToken,
  limit = 5
}: UseRecentActivitiesParams): UseRecentActivitiesReturn => {
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
      console.error('Error fetching recent activities:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch recent activities'))
    } finally {
      setLoading(false)
    }
  }, [employeeId, accessToken, limit])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities
  }
}
