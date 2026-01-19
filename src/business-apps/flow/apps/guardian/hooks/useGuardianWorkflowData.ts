import { useState, useCallback } from 'react'
import { GuardianViewMode, GuardianFilter } from '../types/guardianTypes'
import {
  getFlowAnalytics,
  getFlowManagementAnalytics,
  getTaskAnalytics,
  getGuardianVelocityInsights,
  getActiveWorkflows,
  getTaskPerformanceAnalytics,
  getTemplatePerformanceAnalytics,
  getUserTasks,
  GuardianApiFilters
} from '../queries/GuardianQueries'

interface WorkflowDataParams {
  viewMode: GuardianViewMode
  filters: GuardianFilter
}

interface WorkflowDataResult {
  workflows: any[]
  tasks: any[]
  metadata: {
    totalCount: number
    activeCount: number
    lastUpdated: string
  }
  analytics?: {
    velocityInsights?: any
    flowAnalytics: any
    flowManagement: any
    taskAnalytics: any
    templatePerformance: any
  }
}

const toApiDateTime = (d: Date): string => d.toISOString().slice(0, 19).replace('T', ' ')

// Build explicit time windows so "7d" really means last 7 days (not week-to-date)
function buildTimeFilter(timeRange: string): GuardianApiFilters {
  const now = new Date()
  const endDate = toApiDateTime(now)

  switch (timeRange) {
    case '1h': {
      const startDate = toApiDateTime(new Date(now.getTime() - 60 * 60 * 1000))
      return { timeframe: 'custom', startDate, endDate }
    }
    case '6h': {
      const startDate = toApiDateTime(new Date(now.getTime() - 6 * 60 * 60 * 1000))
      return { timeframe: 'custom', startDate, endDate }
    }
    case '24h': {
      const startDate = toApiDateTime(new Date(now.getTime() - 24 * 60 * 60 * 1000))
      return { timeframe: 'custom', startDate, endDate }
    }
    case '7d': {
      const startDate = toApiDateTime(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
      return { timeframe: 'custom', startDate, endDate }
    }
    case '30d': {
      const startDate = toApiDateTime(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))
      return { timeframe: 'custom', startDate, endDate }
    }
    case 'all':
    default:
      return { timeframe: 'ytd' }
  }
}

export const useGuardianWorkflowData = (accessToken: string, userId?: string) => {
  const [isLoading, setIsLoading] = useState(false)

  const fetchWorkflowData = useCallback(
    async (params: WorkflowDataParams): Promise<WorkflowDataResult> => {
      setIsLoading(true)

      try {
        // Convert Guardian filters to API filters
        const apiFilters: GuardianApiFilters = {
          ...buildTimeFilter(params.filters.timeRange),
          ...(params.filters.selectedDepartments.length > 0 && { departmentId: params.filters.selectedDepartments[0] }),
          ...(params.filters.selectedWorkflowTemplates.length > 0 && {
            templateId: params.filters.selectedWorkflowTemplates[0]
          }),
          ...(params.filters.selectedUsers.length > 0 && { userId: params.filters.selectedUsers[0] })
        }

        // Fetch real data from multiple endpoints in parallel
        const settled = await Promise.allSettled([
          getGuardianVelocityInsights(accessToken, apiFilters),
          getFlowAnalytics(accessToken, apiFilters),
          getFlowManagementAnalytics(accessToken, apiFilters),
          getTaskAnalytics(accessToken, apiFilters),
          getActiveWorkflows(accessToken),
          getTemplatePerformanceAnalytics(accessToken, { ...apiFilters, limit: 10 }),
          getTaskPerformanceAnalytics(accessToken, apiFilters),
          getUserTasks(accessToken, userId || 'user-001')
        ])

        // Log failed requests for debugging
        settled.forEach((result, index) => {
          const names = [
            'velocityInsights',
            'flowAnalytics',
            'flowManagement',
            'taskAnalytics',
            'activeWorkflows',
            'templatePerformance',
            'taskPerformance',
            'userTasks'
          ]
          if (result.status === 'rejected') {
            console.warn(`Guardian API call failed for ${names[index]}:`, result.reason)
          }
        })

        const [
          velocityInsights,
          flowAnalytics,
          flowManagement,
          taskAnalytics,
          activeWorkflows,
          templatePerformance,
          taskPerformance,
          userTasks
        ] = settled.map(r => (r.status === 'fulfilled' ? r.value : undefined))

        // Transform real data into our expected format
        // Flows API returns: { status: "success", data: { flows: [] } }
        // Tasks API returns: { tasks: [] }
        const workflows = activeWorkflows?.data?.flows ?? []
        const tasks = userTasks?.tasks ?? []

        // Apply client-side filters
        let filteredWorkflows = workflows
        let filteredTasks = tasks

        if (!params.filters.showActiveWorkflows) {
          filteredWorkflows = filteredWorkflows.filter((wf: any) => wf.status !== 'RUNNING')
        }

        if (!params.filters.showCompleted) {
          filteredWorkflows = filteredWorkflows.filter((wf: any) => wf.status !== 'COMPLETED')
          filteredTasks = filteredTasks.filter((task: any) => task.status !== 'COMPLETED')
        }

        // Filter by workflow statuses
        if (params.filters.workflowStatuses.length > 0) {
          const statusMap: Record<string, string> = {
            IN_PROGRESS: 'RUNNING',
            COMPLETED: 'COMPLETED',
            SCHEDULED: 'PAUSED',
            QUEUED: 'RUNNING'
          }
          const mappedStatuses = params.filters.workflowStatuses.map(s => statusMap[s] || s)
          filteredWorkflows = filteredWorkflows.filter((wf: any) => mappedStatuses.includes(wf.status))
        }

        return {
          workflows: filteredWorkflows,
          tasks: filteredTasks,
          metadata: {
            totalCount: filteredWorkflows.length,
            activeCount: filteredWorkflows.filter((wf: any) => wf.status === 'RUNNING').length,
            lastUpdated: new Date().toISOString()
          },
          // Include raw analytics data for advanced visualizations
          // Analytics APIs return: { status: "success", data: {...} }
          analytics: {
            velocityInsights: velocityInsights?.data,
            flowAnalytics: flowAnalytics?.data,
            flowManagement: flowManagement?.data,
            taskAnalytics: taskAnalytics?.data,
            templatePerformance: templatePerformance?.data,
            taskPerformance: taskPerformance?.data
          }
        }
      } catch (error) {
        console.error('Error fetching workflow data:', error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, userId]
  )

  return {
    fetchWorkflowData,
    isLoading
  }
}
