import { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'

export interface FlowDashboardStats {
  // Header KPIs
  activeTasks: number
  activeFlows: number
  completedTasksMonth: number

  // Manager/Admin KPIs
  teamActiveTasks: number
  teamPendingApprovals: number
  systemActiveWorkflows: number

  // Card KPIs
  totalCompletedTasks: number
  totalInitiatedFlows: number
  overdueTasks: number
  upcomingTasks: number
  tasksCompletedToday: number
  avgCompletionTime: number // in hours
}

export interface FlowDashboardStatsView {
  stats: FlowDashboardStats
  isLoading: boolean
  error: string | null
  refetch: () => void
}

const API_BASE = getFlowEngineApiBaseUrl()

const safeNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const num = Number(value)
    return Number.isFinite(num) ? num : 0
  }
  return 0
}

const unwrapData = (payload: any): any => payload?.statistics ?? payload?.data ?? payload

const deriveOpenTasksCount = (taskStats: any): number => {
  const total = safeNumber(taskStats?.total)
  if (total > 0) return total

  const assigned = safeNumber(taskStats?.assigned)
  const claimable = safeNumber(taskStats?.claimable)
  const inProgress = safeNumber(taskStats?.inProgress)
  const scheduled = safeNumber(taskStats?.scheduled)

  return assigned + claimable + inProgress + scheduled
}

export const useFlowDashboardStats = (context: BusinessAppContextProps): FlowDashboardStatsView => {
  const [stats, setStats] = useState<FlowDashboardStats>({
    // Header KPIs
    activeTasks: 0,
    activeFlows: 0,
    completedTasksMonth: 0,

    // Manager/Admin KPIs
    teamActiveTasks: 0,
    teamPendingApprovals: 0,
    systemActiveWorkflows: 0,

    // Card KPIs
    totalCompletedTasks: 0,
    totalInitiatedFlows: 0,
    overdueTasks: 0,
    upcomingTasks: 0,
    tasksCompletedToday: 0,
    avgCompletionTime: 0
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    const flowUserId =
      context?.userInfo?.id ||
      context?.userInfo?.employeeDetails?.employeeId ||
      context?.userInfo?.employeeDetails?.employeeNumber ||
      ''

    if (!flowUserId) {
      setError('User identifier not found. Cannot fetch dashboard statistics.')
      setIsLoading(false)
      return
    }

    if (!context.accessToken) {
      setError('Access token not found. Cannot fetch dashboard statistics.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${context.accessToken}`
      }

      const initiatedAllUrl = `${API_BASE}/flows/user/${flowUserId}/initiated`
      const systemActiveUrl = `${API_BASE}/flows/list?status=IN_PROGRESS,SCHEDULED`
      const taskStatsUrl = `${API_BASE}/tasks/user/${flowUserId}/stats`
      const taskAnalyticsMtdUrl = `${API_BASE}/analytics/tasks?timeframe=mtd&userId=${encodeURIComponent(flowUserId)}`
      const flowManagementAnalyticsUrl = `${API_BASE}/analytics/flow-management`

      const [taskStatsRes, initiatedAllRes, systemActiveRes, flowMgmtRes] = await Promise.all([
        fetch(taskStatsUrl, { headers }),
        fetch(initiatedAllUrl, { headers }),
        fetch(systemActiveUrl, { headers }),
        fetch(flowManagementAnalyticsUrl, { headers })
      ])

      if (!taskStatsRes.ok) {
        throw new Error(`Failed to fetch task stats (HTTP ${taskStatsRes.status})`)
      }

      const [taskStatsJson, initiatedAllJson, systemActiveJson, flowMgmtJson] = await Promise.all([
        taskStatsRes.json(),
        initiatedAllRes.ok ? initiatedAllRes.json() : Promise.resolve(null),
        systemActiveRes.ok ? systemActiveRes.json() : Promise.resolve(null),
        flowMgmtRes.ok ? flowMgmtRes.json() : Promise.resolve(null)
      ])

      const taskStats = unwrapData(taskStatsJson)

      const initiatedAllData = unwrapData(initiatedAllJson)
      const systemActiveData = unwrapData(systemActiveJson)
      const flowMgmtData = unwrapData(flowMgmtJson)

      const totalInitiatedFlows = safeNumber(initiatedAllData?.totalCount) || safeNumber(initiatedAllData?.count)

      const systemActiveWorkflows =
        safeNumber(systemActiveData?.data?.totalCount) ||
        safeNumber(systemActiveData?.totalCount) ||
        (Array.isArray(systemActiveData?.data?.flows)
          ? systemActiveData.data.flows.length
          : Array.isArray(systemActiveData?.flows)
            ? systemActiveData.flows.length
            : 0)

      // Company-wide active flows should come from an aggregated analytics API if possible.
      // If not available/authorized, fall back to the /flows/list count.
      const companyWideActiveFlowsFromAnalytics =
        safeNumber(flowMgmtData?.statusMetrics?.pending_workflows) ||
        safeNumber(flowMgmtData?.statusMetrics?.pendingWorkflows) ||
        safeNumber(flowMgmtData?.statusMetrics?.total_workflows) ||
        safeNumber(flowMgmtData?.statusMetrics?.totalWorkflows) ||
        0

      const activeFlows = companyWideActiveFlowsFromAnalytics || systemActiveWorkflows

      // Best-effort “completed this month” from analytics endpoint; fallback to total completed count.
      let completedTasksMonth = 0
      try {
        const mtdRes = await fetch(taskAnalyticsMtdUrl, { headers })
        if (mtdRes.ok) {
          const mtdJson = await mtdRes.json()
          const mtdData = unwrapData(mtdJson)
          completedTasksMonth =
            safeNumber(mtdData?.tasksCompleted) ||
            safeNumber(mtdData?.completedTasks) ||
            safeNumber(mtdData?.completed) ||
            safeNumber(mtdData?.tasks_completed) ||
            0
        }
      } catch {
        // Ignore analytics failures; the rest of the dashboard should still render.
      }

      const totalCompletedTasks = safeNumber(taskStats?.completed)

      setStats({
        // Header KPIs
        activeTasks: deriveOpenTasksCount(taskStats),
        activeFlows,
        completedTasksMonth: completedTasksMonth || totalCompletedTasks,

        // Manager/Admin KPIs (best-effort only; keep zero until endpoints are available)
        teamActiveTasks: 0,
        teamPendingApprovals: 0,
        systemActiveWorkflows: activeFlows,

        // Card KPIs
        totalCompletedTasks,
        totalInitiatedFlows,
        overdueTasks: safeNumber(taskStats?.overdue),
        upcomingTasks: safeNumber(taskStats?.dueSoon) || safeNumber(taskStats?.upcoming),
        tasksCompletedToday: safeNumber(taskStats?.tasksCompletedToday),
        avgCompletionTime: safeNumber(taskStats?.avgCompletionTime)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (context.accessToken && context.userInfo?.employeeDetails?.employeeId) {
      fetchStats()
    }
  }, [context.accessToken, context.userInfo?.employeeDetails?.employeeId])

  const refetch = () => {
    fetchStats()
  }

  return {
    stats,
    isLoading,
    error,
    refetch
  }
}
