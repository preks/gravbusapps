import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_ACTIVITY_KPIS } from '../queries/activityKpisQueries'
import dayjs from 'dayjs'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(quarterOfYear)
dayjs.extend(isoWeek)

interface ActivityKpi {
  value: number
  trend: number
  description: string
}

export interface ActivityKpis {
  total: ActivityKpi
  thisWeek: ActivityKpi
  thisMonth: ActivityKpi
  thisQuarter: ActivityKpi
}

interface UseActivityKpisParams {
  employeeId: string
  accessToken: string
}

interface UseActivityKpisReturn {
  kpis: ActivityKpis | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

export const useActivityKpis = ({ employeeId, accessToken }: UseActivityKpisParams): UseActivityKpisReturn => {
  const [kpis, setKpis] = useState<ActivityKpis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const calculateTrend = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  const fetchKpis = useCallback(async () => {
    if (!employeeId || !accessToken) return

    setLoading(true)
    setError(null)

    try {
      const now = dayjs()

      // Calculate date ranges
      const thisWeekStart = now.startOf('isoWeek').toISOString()
      const lastWeekStart = now.subtract(1, 'week').startOf('isoWeek').toISOString()
      const lastWeekEnd = now.subtract(1, 'week').endOf('isoWeek').toISOString()

      const thisMonthStart = now.startOf('month').toISOString()
      const lastMonthStart = now.subtract(1, 'month').startOf('month').toISOString()
      const lastMonthEnd = now.subtract(1, 'month').endOf('month').toISOString()

      const thisQuarterStart = now.startOf('quarter').toISOString()
      const lastQuarterStart = now.subtract(1, 'quarter').startOf('quarter').toISOString()
      const lastQuarterEnd = now.subtract(1, 'quarter').endOf('quarter').toISOString()

      const thisYearStart = now.startOf('year').toISOString()
      const lastYearStart = now.subtract(1, 'year').startOf('year').toISOString()
      const lastYearEnd = now.subtract(1, 'year').endOf('year').toISOString()

      const result = await graphqlClient.request<{
        totalActivities: { aggregate: { count: number } }
        lastYearTotal: { aggregate: { count: number } }
        thisYearActivities: { aggregate: { count: number } }
        thisWeekActivities: { aggregate: { count: number } }
        lastWeekActivities: { aggregate: { count: number } }
        thisMonthActivities: { aggregate: { count: number } }
        lastMonthActivities: { aggregate: { count: number } }
        thisQuarterActivities: { aggregate: { count: number } }
        lastQuarterActivities: { aggregate: { count: number } }
      }>(GET_ACTIVITY_KPIS, {
        employeeId,
        thisWeekStart,
        lastWeekStart,
        lastWeekEnd,
        thisMonthStart,
        lastMonthStart,
        lastMonthEnd,
        thisQuarterStart,
        lastQuarterStart,
        lastQuarterEnd,
        thisYearStart,
        lastYearStart,
        lastYearEnd
      })

      // Calculate trends
      const totalCount = result.totalActivities?.aggregate?.count || 0
      const lastYearCount = result.lastYearTotal?.aggregate?.count || 0
      const totalTrend = calculateTrend(totalCount, lastYearCount)

      const thisWeekCount = result.thisWeekActivities?.aggregate?.count || 0
      const lastWeekCount = result.lastWeekActivities?.aggregate?.count || 0
      const weekTrend = calculateTrend(thisWeekCount, lastWeekCount)

      const thisMonthCount = result.thisMonthActivities?.aggregate?.count || 0
      const lastMonthCount = result.lastMonthActivities?.aggregate?.count || 0
      const monthTrend = calculateTrend(thisMonthCount, lastMonthCount)

      const thisQuarterCount = result.thisQuarterActivities?.aggregate?.count || 0
      const lastQuarterCount = result.lastQuarterActivities?.aggregate?.count || 0
      const quarterTrend = calculateTrend(thisQuarterCount, lastQuarterCount)

      setKpis({
        total: {
          value: totalCount,
          trend: totalTrend,
          description: 'vs last year'
        },
        thisWeek: {
          value: thisWeekCount,
          trend: weekTrend,
          description: 'vs last week'
        },
        thisMonth: {
          value: thisMonthCount,
          trend: monthTrend,
          description: 'vs last month'
        },
        thisQuarter: {
          value: thisQuarterCount,
          trend: quarterTrend,
          description: 'vs last quarter'
        }
      })
    } catch (err) {
      console.error('Error fetching activity KPIs:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch activity KPIs'))
    } finally {
      setLoading(false)
    }
  }, [employeeId, accessToken, graphqlClient])

  useEffect(() => {
    fetchKpis()
  }, [fetchKpis])

  return {
    kpis,
    loading,
    error,
    refetch: () => {
      void fetchKpis()
    }
  }
}
