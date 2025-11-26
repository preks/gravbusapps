import { useState, useEffect, useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { createConductorWorkflowEngine } from '../../../../../services'
import dayjs from 'dayjs'

/**
 * Chart Data Hook - Fetches REAL USER-SPECIFIC analytics data from Flow Engine API
 * Uses the same analytics endpoints as Manager Analytics but filtered for current user
 * Focus: Personal productivity and workload visualization with real aggregated data
 */

export interface ChartDataPoint {
  [key: string]: string | number
}

export type UseChartDataProps = BusinessAppContextProps

export interface UseChartDataReturn {
  myStatusDistribution: ChartDataPoint[]
  myWeeklyActivity: ChartDataPoint[]
  myResponseTimeTrend: ChartDataPoint[]
  isLoading: boolean
  error: string | null
}

export const useChartData = ({ accessToken, userInfo }: UseChartDataProps): UseChartDataReturn => {
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentUserId = userInfo?.id

  // Fetch real analytics data from Flow Engine API
  const fetchAnalyticsData = useCallback(async () => {
    if (!accessToken || !currentUserId) {
      setError('Missing authentication or user information')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo })

      // Fetch user-specific task performance analytics (last 7 days for weekly activity)
      const result = await (workflowEngine as any).getTaskPerformanceAnalytics({
        timeframe: 'wtd', // Week to date
        userId: currentUserId // Filter for current user only
      })

      console.log('[useChartData] Fetched real analytics data:', result)
      setAnalyticsData(result)
    } catch (err) {
      console.error('[useChartData] Error fetching analytics data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch chart data')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, currentUserId])

  useEffect(() => {
    fetchAnalyticsData()
  }, [fetchAnalyticsData])

  // 1. My Ticket Status Distribution (Pie Chart) - from real API data
  const myStatusDistribution = useMemo((): ChartDataPoint[] => {
    if (!analyticsData?.data) return []

    const pending = analyticsData.data.pendingTasks || 0
    const overdue = analyticsData.data.overdueTasks || 0
    const completed = analyticsData.data.completedTasks || 0

    return [
      { status: 'Open', count: pending, fill: 'var(--nw-chart-3)' },
      { status: 'Overdue', count: overdue, fill: 'var(--nw-chart-4)' },
      { status: 'Completed', count: completed, fill: 'var(--nw-chart-2)' }
    ].filter(item => item.count > 0)
  }, [analyticsData])

  // 2. My Weekly Activity (Bar Chart - tickets completed per day) - from real API data
  const myWeeklyActivity = useMemo((): ChartDataPoint[] => {
    if (!analyticsData?.data?.userProductivity) {
      // Return empty data structure for all days of the week
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
        day,
        completed: 0
      }))
    }

    // Find current user's productivity data
    const userProductivity = analyticsData.data.userProductivity.find((user: any) => user.userId === currentUserId)

    if (!userProductivity?.dailyActivity) {
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
        day,
        completed: 0
      }))
    }

    // Map daily activity to chart format
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const activityByDay: Record<string, number> = {}

    // Initialize all days to 0
    days.forEach(day => (activityByDay[day] = 0))

    // Fill in actual data from API
    userProductivity.dailyActivity.forEach((activity: any) => {
      const date = dayjs(activity.date)
      const dayOfWeek = date.format('ddd')
      if (activityByDay[dayOfWeek] !== undefined) {
        activityByDay[dayOfWeek] = activity.tasksCompleted || 0
      }
    })

    return days.map(day => ({
      day,
      completed: activityByDay[day] || 0
    }))
  }, [analyticsData, currentUserId])

  // 3. My Response Time Trend (Line Chart - last 4 weeks) - from real API data
  const myResponseTimeTrend = useMemo((): ChartDataPoint[] => {
    if (!analyticsData?.data?.taskTypePerformance) {
      return ['Week 1', 'Week 2', 'Week 3', 'Week 4'].map(week => ({
        week,
        avgTime: 0,
        target: 4.0
      }))
    }

    // Calculate average response time from task type performance
    const avgResponseTime =
      analyticsData.data.taskTypePerformance.reduce((sum: number, task: any) => sum + (task.avgResponseTime || 0), 0) /
      (analyticsData.data.taskTypePerformance.length || 1)

    // For now, show current week's average
    // In a real implementation, we'd fetch historical data for each week
    return ['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((week, index) => ({
      week,
      avgTime: index === 3 ? Math.round(avgResponseTime * 10) / 10 : 0, // Show data for current week only
      target: 4.0
    }))
  }, [analyticsData])

  return {
    myStatusDistribution,
    myWeeklyActivity,
    myResponseTimeTrend,
    isLoading,
    error
  }
}
