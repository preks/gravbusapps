import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_MY_INVESTMENT_ACTIVITIES,
  GET_RECENT_INVESTMENT_ACTIVITIES
} from '../queries/MyInvestmentActivitiesQueries'
import type { MyInvestmentActivity } from '../types'
import dayjs from 'dayjs'

interface UseMyInvestmentActivitiesParams {
  employeeId: string
  accessToken: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}

interface UseMyInvestmentActivitiesReturn {
  activities: MyInvestmentActivity[]
  total: number
  loading: boolean
  error: Error | null
  refetch: () => void
}

export const useMyInvestmentActivities = ({
  employeeId,
  accessToken,
  dateFrom,
  dateTo,
  limit = 50,
  offset = 0
}: UseMyInvestmentActivitiesParams): UseMyInvestmentActivitiesReturn => {
  const [activities, setActivities] = useState<MyInvestmentActivity[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchActivities = useCallback(async () => {
    if (!employeeId || !accessToken) return

    setLoading(true)
    setError(null)

    try {
      const startDate = dateFrom || dayjs().subtract(3, 'months').startOf('day').toISOString()
      const endDate = dateTo || dayjs().add(1, 'day').endOf('day').toISOString()

      const result = await graphqlClient.request<{
        InvestmentActivity: MyInvestmentActivity[]
        InvestmentActivityAggregate: {
          aggregate: {
            count: number
          }
        }
      }>(GET_MY_INVESTMENT_ACTIVITIES, {
        employeeId,
        dateFrom: startDate,
        dateTo: endDate,
        limit,
        offset
      })

      setActivities(result.InvestmentActivity || [])
      setTotal(result.InvestmentActivityAggregate?.aggregate?.count || 0)
    } catch (err) {
      console.error('Error fetching investment activities:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch investment activities'))
    } finally {
      setLoading(false)
    }
  }, [employeeId, accessToken, dateFrom, dateTo, limit, offset, graphqlClient])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  return {
    activities,
    total,
    loading,
    error,
    refetch: () => {
      void fetchActivities()
    }
  }
}

interface UseRecentInvestmentActivitiesParams {
  employeeId: string
  accessToken: string
  limit?: number
}

interface UseRecentInvestmentActivitiesReturn {
  activities: MyInvestmentActivity[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

export const useRecentInvestmentActivities = ({
  employeeId,
  accessToken,
  limit = 5
}: UseRecentInvestmentActivitiesParams): UseRecentInvestmentActivitiesReturn => {
  const [activities, setActivities] = useState<MyInvestmentActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchActivities = useCallback(async () => {
    if (!employeeId || !accessToken) return

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<{
        InvestmentActivity: MyInvestmentActivity[]
      }>(GET_RECENT_INVESTMENT_ACTIVITIES, {
        employeeId,
        limit
      })

      setActivities(result.InvestmentActivity || [])
    } catch (err) {
      console.error('Error fetching recent investment activities:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch recent investment activities'))
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
