import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { ActivityStatisticsData } from '@/common/components/common-relations/view-layouts/activity-layout/components/ActivityStatisticsCard'
import dayjs from 'dayjs'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(quarterOfYear)
dayjs.extend(isoWeek)

export interface ActivityStatistics {
  myActivitiesStatistics: ActivityStatisticsData
  teamActivitiesStatistics: ActivityStatisticsData
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

interface ActivityStatisticsQueryResult {
  // My Activities - Current
  myTotal: { aggregate: { count: number } }
  myLastYearTotal: { aggregate: { count: number } }
  myThisWeek: { aggregate: { count: number } }
  myLastWeek: { aggregate: { count: number } }
  myThisMonth: { aggregate: { count: number } }
  myLastMonth: { aggregate: { count: number } }
  myThisQuarter: { aggregate: { count: number } }
  myLastQuarter: { aggregate: { count: number } }
  // Team Activities - Current
  teamTotal: { aggregate: { count: number } }
  teamLastYearTotal: { aggregate: { count: number } }
  teamThisWeek: { aggregate: { count: number } }
  teamLastWeek: { aggregate: { count: number } }
  teamThisMonth: { aggregate: { count: number } }
  teamLastMonth: { aggregate: { count: number } }
  teamThisQuarter: { aggregate: { count: number } }
  teamLastQuarter: { aggregate: { count: number } }
}

const calculateTrend = (current: number, previous: number): number => {
  if (previous > 0) return ((current - previous) / previous) * 100
  if (current > 0) return 100
  return 0
}

const emptyStats = (): ActivityStatisticsData => ({
  total: { value: 0, trend: 0, description: 'vs last year' },
  thisWeek: { value: 0, trend: 0, description: 'vs last week' },
  thisMonth: { value: 0, trend: 0, description: 'vs last month' },
  thisQuarter: { value: 0, trend: 0, description: 'vs last quarter' }
})

/**
 * Shared base hook for fetching activity statistics (my activities and team activities).
 * Mirrors useTaskStatistics — same architecture, same return shape concept.
 *
 * @param context - Business app context with access token and user info
 * @param query   - GraphQL query string (must follow the my-prefix/team-prefix naming convention)
 */
export const useActivityStatistics = (context: BusinessAppContextProps, query: string): ActivityStatistics => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const isFirstLoadRef = useRef(true)

  const [state, setState] = useState({
    isLoading: true,
    error: null as Error | null,
    myActivitiesStatistics: emptyStats(),
    teamActivitiesStatistics: emptyStats()
  })

  const loadStatistics = useCallback(async () => {
    if (!context.accessToken) return

    if (isFirstLoadRef.current) {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
    }

    try {
      const employeeId = context.userInfo?.employeeDetails?.employeeId || context.userInfo?.id

      const now = dayjs()
      const variables = {
        employeeId: employeeId || null,
        thisWeekStart: now.startOf('isoWeek').toISOString(),
        lastWeekStart: now.subtract(1, 'week').startOf('isoWeek').toISOString(),
        lastWeekEnd: now.subtract(1, 'week').endOf('isoWeek').toISOString(),
        thisMonthStart: now.startOf('month').toISOString(),
        lastMonthStart: now.subtract(1, 'month').startOf('month').toISOString(),
        lastMonthEnd: now.subtract(1, 'month').endOf('month').toISOString(),
        thisQuarterStart: now.startOf('quarter').toISOString(),
        lastQuarterStart: now.subtract(1, 'quarter').startOf('quarter').toISOString(),
        lastQuarterEnd: now.subtract(1, 'quarter').endOf('quarter').toISOString(),
        lastYearStart: now.subtract(1, 'year').startOf('year').toISOString(),
        lastYearEnd: now.subtract(1, 'year').endOf('year').toISOString()
      }

      const result = await graphqlClient.request<ActivityStatisticsQueryResult>(query, variables)

      const c = (r: { aggregate: { count: number } }) => r?.aggregate?.count ?? 0

      setState({
        isLoading: false,
        error: null,
        myActivitiesStatistics: {
          total: {
            value: c(result.myTotal),
            trend: calculateTrend(c(result.myTotal), c(result.myLastYearTotal)),
            description: 'vs last year'
          },
          thisWeek: {
            value: c(result.myThisWeek),
            trend: calculateTrend(c(result.myThisWeek), c(result.myLastWeek)),
            description: 'vs last week'
          },
          thisMonth: {
            value: c(result.myThisMonth),
            trend: calculateTrend(c(result.myThisMonth), c(result.myLastMonth)),
            description: 'vs last month'
          },
          thisQuarter: {
            value: c(result.myThisQuarter),
            trend: calculateTrend(c(result.myThisQuarter), c(result.myLastQuarter)),
            description: 'vs last quarter'
          }
        },
        teamActivitiesStatistics: {
          total: {
            value: c(result.teamTotal),
            trend: calculateTrend(c(result.teamTotal), c(result.teamLastYearTotal)),
            description: 'vs last year'
          },
          thisWeek: {
            value: c(result.teamThisWeek),
            trend: calculateTrend(c(result.teamThisWeek), c(result.teamLastWeek)),
            description: 'vs last week'
          },
          thisMonth: {
            value: c(result.teamThisMonth),
            trend: calculateTrend(c(result.teamThisMonth), c(result.teamLastMonth)),
            description: 'vs last month'
          },
          thisQuarter: {
            value: c(result.teamThisQuarter),
            trend: calculateTrend(c(result.teamThisQuarter), c(result.teamLastQuarter)),
            description: 'vs last quarter'
          }
        }
      })

      isFirstLoadRef.current = false
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err : new Error('Failed to load activity statistics')
      }))
      isFirstLoadRef.current = false
    }
  }, [context.accessToken, context.userInfo?.employeeDetails?.employeeId, context.userInfo?.id, query])

  useEffect(() => {
    if (context.accessToken) {
      loadStatistics()
    }
  }, [context.accessToken, loadStatistics])

  return useMemo(
    () => ({
      myActivitiesStatistics: state.myActivitiesStatistics,
      teamActivitiesStatistics: state.teamActivitiesStatistics,
      isLoading: state.isLoading,
      error: state.error,
      refetch: loadStatistics
    }),
    [state.myActivitiesStatistics, state.teamActivitiesStatistics, state.isLoading, state.error, loadStatistics]
  )
}
