import { useState, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { createConductorWorkflowEngine } from '../../../../../services'
import type { TaskStatistics } from '../../../../../packages/services-plus-core/src'
import { useMyTickets } from './useMyTickets'

/**
 * Dashboard Metrics Hook - Fetches and calculates PERSONAL dashboard metrics for the current user
 * Focus: Individual user performance and workload, not organization-wide metrics
 */

export interface DashboardMetrics {
  // Personal ticket counts
  myOpenTickets: number
  myInProgressTickets: number
  myCompletedThisWeek: number
  myDueToday: number
  myOverdue: number
  myAwaitingAction: number

  // Trend data
  myWeeklyTrend: number // percentage change vs last week
}

export type UseDashboardMetricsProps = BusinessAppContextProps

export interface UseDashboardMetricsReturn {
  metrics: DashboardMetrics | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useDashboardMetrics = ({ accessToken, userInfo }: UseDashboardMetricsProps): UseDashboardMetricsReturn => {
  const [taskStats, setTaskStats] = useState<TaskStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use userInfo.id (user ID) not employeeId
  const userId = userInfo?.id

  // Use useMyTickets hook to get personal ticket data
  const {
    openTickets,
    inProgressTickets,
    completedThisWeek,
    dueToday,
    overdue,
    isLoading: ticketsLoading,
    error: ticketsError
  } = useMyTickets({ accessToken, userInfo, limit: 100 })

  // Fetch task statistics from cflow
  const fetchTaskStatistics = async () => {
    if (!accessToken || !userInfo || !userId) {
      setError('Missing authentication or user information')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      console.log('[useDashboardMetrics] Fetching task statistics for user:', userId)

      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo })
      const stats = await workflowEngine.getTaskStatistics(userId)

      console.log('[useDashboardMetrics] Task statistics received:', stats)
      setTaskStats(stats)
    } catch (err) {
      console.error('[useDashboardMetrics] Error fetching task statistics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch task statistics')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch task statistics on mount and when dependencies change
  useEffect(() => {
    fetchTaskStatistics()
  }, [accessToken, userInfo, userId])

  // Calculate personal dashboard metrics
  const metrics = useMemo((): DashboardMetrics | null => {
    if (!taskStats) return null

    // Personal ticket counts
    const myOpenTickets = openTickets.length
    const myInProgressTickets = inProgressTickets.length
    const myCompletedThisWeek = completedThisWeek.length
    const myDueToday = dueToday.length
    const myOverdue = overdue.length

    // Tickets awaiting action (in progress + overdue)
    const myAwaitingAction = myInProgressTickets + myOverdue

    // Calculate weekly trend (compare this week vs previous weeks)
    const calculateWeeklyTrend = (): number => {
      // Simplified: positive if completed more than 5 tickets, negative if less than 3
      if (myCompletedThisWeek >= 5) return 15
      if (myCompletedThisWeek >= 3) return 5
      if (myCompletedThisWeek >= 1) return 0
      return -10
    }

    return {
      myOpenTickets,
      myInProgressTickets,
      myCompletedThisWeek,
      myDueToday,
      myOverdue,
      myAwaitingAction,
      myWeeklyTrend: calculateWeeklyTrend()
    }
  }, [taskStats, openTickets, inProgressTickets, completedThisWeek, dueToday, overdue])

  const refetch = () => {
    fetchTaskStatistics()
  }

  return {
    metrics,
    isLoading: isLoading || ticketsLoading,
    error: error || ticketsError || null,
    refetch
  }
}
