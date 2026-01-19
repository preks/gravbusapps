import { useState, useEffect, useCallback } from 'react'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'

interface FlowAnalyticsFilters {
  timeframe?: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom'
  startDate?: string
  endDate?: string
  departmentId?: string
  templateId?: string
  userId?: string
  includeBusinessMetrics?: boolean
  includeOperationalMetrics?: boolean
  accessToken: string
}

interface BusinessKpis {
  totalWorkflows: number
  completionRate: number
  avgCycleTime: number
  slaAdherence: number
}

interface DepartmentPerformance {
  departmentId: string
  departmentName: string
  workflowCount: number
  completionRate: number
  avgCycleTime: number
  slaAdherence: number
  efficiency: number
}

interface FlowEffectiveness {
  flowId: string
  flowName: string
  usageCount: number
  successRate: number
  avgCompletionTime: number
}

interface TrendAnalysis {
  period: string
  workflowsStarted: number
  workflowsCompleted: number
  avgCycleTime: number
  completionRate: number
}

interface UserMetrics {
  activeUsers: number
  totalUsers: number
  avgTasksPerUser: number
  avgResponseTime: number
  userEngagement: number
}

interface SystemHealth {
  uptime: number
  throughput: number
  errorRate: number
  avgResponseTime: number
  memoryUsage: number
  cpuUsage: number
}

interface FlowAnalyticsData {
  businessKpis?: BusinessKpis
  departmentPerformance?: DepartmentPerformance[]
  flowEffectiveness?: FlowEffectiveness[]
  trendAnalysis?: TrendAnalysis[]
  userMetrics?: UserMetrics
  systemHealth?: SystemHealth
  [key: string]: any
}

interface UseFlowAnalyticsResult {
  data: FlowAnalyticsData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useFlowAnalytics = (filters: FlowAnalyticsFilters): UseFlowAnalyticsResult => {
  const [data, setData] = useState<FlowAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const API_BASE = getFlowEngineApiBaseUrl()

  const fetchAnalytics = useCallback(async () => {
    if (!filters.accessToken) {
      setError(new Error('Access token is required'))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams()

      // Add all filters as query parameters
      if (filters.timeframe) queryParams.append('timeframe', filters.timeframe)
      if (filters.startDate) queryParams.append('startDate', filters.startDate)
      if (filters.endDate) queryParams.append('endDate', filters.endDate)
      if (filters.departmentId) queryParams.append('departmentId', filters.departmentId)
      if (filters.templateId) queryParams.append('templateId', filters.templateId)
      if (filters.userId) queryParams.append('userId', filters.userId)
      if (filters.includeBusinessMetrics !== undefined) {
        queryParams.append('includeBusinessMetrics', filters.includeBusinessMetrics.toString())
      }
      if (filters.includeOperationalMetrics !== undefined) {
        queryParams.append('includeOperationalMetrics', filters.includeOperationalMetrics.toString())
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${filters.accessToken}`
      }

      const response = await fetch(`${API_BASE}/analytics/flows?${queryParams.toString()}`, { headers })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch analytics`)
      }

      const result = await response.json()

      if (result.status === 'success' && result.data) {
        setData(result.data)
        console.log('Flow analytics loaded successfully', {
          timeframe: filters.timeframe,
          dataKeys: Object.keys(result.data)
        })
      } else {
        throw new Error(result.message || 'Invalid response format')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics'
      setError(new Error(errorMessage))
      console.error('Error fetching flow analytics:', err)
    } finally {
      setIsLoading(false)
    }
  }, [
    API_BASE,
    filters.accessToken,
    filters.timeframe,
    filters.startDate,
    filters.endDate,
    filters.departmentId,
    filters.templateId,
    filters.userId,
    filters.includeBusinessMetrics,
    filters.includeOperationalMetrics
  ])

  // Fetch data when filters change
  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return {
    data,
    isLoading,
    error,
    refetch: fetchAnalytics
  }
}

// Additional specialized hooks for specific analytics endpoints

export const useTaskAnalytics = (filters: {
  timeframe?: 'last24h' | 'wtd' | 'mtd' | 'ytd' | 'custom'
  startDate?: string
  endDate?: string
  userId?: string
  taskType?: string
  status?: string
  includeApprovalMetrics?: boolean
  accessToken: string
}) => {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const API_BASE = getFlowEngineApiBaseUrl()

  const fetchTaskAnalytics = useCallback(async () => {
    if (!filters.accessToken) {
      setError(new Error('Access token is required'))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams()

      if (filters.timeframe) queryParams.append('timeframe', filters.timeframe)
      if (filters.startDate) queryParams.append('startDate', filters.startDate)
      if (filters.endDate) queryParams.append('endDate', filters.endDate)
      if (filters.userId) queryParams.append('userId', filters.userId)
      if (filters.taskType) queryParams.append('taskType', filters.taskType)
      if (filters.status) queryParams.append('status', filters.status)
      if (filters.includeApprovalMetrics !== undefined) {
        queryParams.append('includeApprovalMetrics', filters.includeApprovalMetrics.toString())
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${filters.accessToken}`
      }

      const response = await fetch(`${API_BASE}/analytics/tasks?${queryParams.toString()}`, { headers })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch task analytics`)
      }

      const result = await response.json()

      if (result.status === 'success' && result.data) {
        setData(result.data)
      } else {
        throw new Error(result.message || 'Invalid response format')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch task analytics'
      setError(new Error(errorMessage))
      console.error('Error fetching task analytics:', err)
    } finally {
      setIsLoading(false)
    }
  }, [
    API_BASE,
    filters.accessToken,
    filters.timeframe,
    filters.startDate,
    filters.endDate,
    filters.userId,
    filters.taskType,
    filters.status,
    filters.includeApprovalMetrics
  ])

  useEffect(() => {
    fetchTaskAnalytics()
  }, [fetchTaskAnalytics])

  return {
    data,
    isLoading,
    error,
    refetch: fetchTaskAnalytics
  }
}

export const useSystemAnalytics = (filters: {
  timeframe?: 'last24h' | 'wtd' | 'mtd' | 'ytd' | 'custom'
  startDate?: string
  endDate?: string
  includeResourceMetrics?: boolean
  includeSecurityMetrics?: boolean
  accessToken: string
}) => {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const API_BASE = getFlowEngineApiBaseUrl()

  const fetchSystemAnalytics = useCallback(async () => {
    if (!filters.accessToken) {
      setError(new Error('Access token is required'))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams()

      if (filters.timeframe) queryParams.append('timeframe', filters.timeframe)
      if (filters.startDate) queryParams.append('startDate', filters.startDate)
      if (filters.endDate) queryParams.append('endDate', filters.endDate)
      if (filters.includeResourceMetrics !== undefined) {
        queryParams.append('includeResourceMetrics', filters.includeResourceMetrics.toString())
      }
      if (filters.includeSecurityMetrics !== undefined) {
        queryParams.append('includeSecurityMetrics', filters.includeSecurityMetrics.toString())
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${filters.accessToken}`
      }

      const response = await fetch(`${API_BASE}/analytics/system?${queryParams.toString()}`, { headers })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch system analytics`)
      }

      const result = await response.json()

      if (result.status === 'success' && result.data) {
        setData(result.data)
      } else {
        throw new Error(result.message || 'Invalid response format')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch system analytics'
      setError(new Error(errorMessage))
      console.error('Error fetching system analytics:', err)
    } finally {
      setIsLoading(false)
    }
  }, [
    API_BASE,
    filters.accessToken,
    filters.timeframe,
    filters.startDate,
    filters.endDate,
    filters.includeResourceMetrics,
    filters.includeSecurityMetrics
  ])

  useEffect(() => {
    fetchSystemAnalytics()
  }, [fetchSystemAnalytics])

  return {
    data,
    isLoading,
    error,
    refetch: fetchSystemAnalytics
  }
}

// Trend Comparison Analytics Hook
export interface TrendComparisonData {
  current: {
    workflowsStarted: number
    workflowsCompleted: number
    completionRate: number
    avgCycleTime: number
    activeUsers: number
    avgTasksPerUser: number
  }
  previous: {
    workflowsStarted: number
    workflowsCompleted: number
    completionRate: number
    avgCycleTime: number
    activeUsers: number
    avgTasksPerUser: number
  }
  trends: {
    workflowsStarted: { change: number; percentage: number; direction: 'up' | 'down' | 'stable'; note?: string }
    workflowsCompleted: { change: number; percentage: number; direction: 'up' | 'down' | 'stable'; note?: string }
    completionRate: { change: number; percentage: number; direction: 'up' | 'down' | 'stable'; note?: string }
    avgCycleTime: { change: number; percentage: number; direction: 'up' | 'down' | 'stable'; note?: string }
    activeUsers: { change: number; percentage: number; direction: 'up' | 'down' | 'stable'; note?: string }
    avgTasksPerUser: { change: number; percentage: number; direction: 'up' | 'down' | 'stable'; note?: string }
  }
  metadata?: {
    hasPreviousData: boolean
    message: string
  }
}

export interface UseTrendComparisonResult {
  data: TrendComparisonData | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export const useTrendComparison = (filters: {
  timeframe?: string
  startDate?: string
  endDate?: string
  departmentId?: string
  templateId?: string
  userId?: string
  accessToken: string
}): UseTrendComparisonResult => {
  const [data, setData] = useState<TrendComparisonData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const API_BASE = getFlowEngineApiBaseUrl()

  const fetchData = useCallback(async () => {
    if (!filters.accessToken) {
      setError(new Error('Access token is required'))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filters.timeframe) params.append('timeframe', filters.timeframe)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.departmentId) params.append('departmentId', filters.departmentId)
      if (filters.templateId) params.append('templateId', filters.templateId)
      if (filters.userId) params.append('userId', filters.userId)

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${filters.accessToken}`
      }

      const response = await fetch(`${API_BASE}/analytics/trends?${params.toString()}`, { headers })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch trend comparison`)
      }

      const result = await response.json()
      console.log('Trend comparison result:', result)

      if (result.status === 'success' && result.data) {
        setData(result.data)
      } else {
        throw new Error(result.message || 'Invalid response format')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trend comparison'
      setError(new Error(errorMessage))
      console.error('Error fetching trend comparison:', err)
    } finally {
      setIsLoading(false)
    }
  }, [
    API_BASE,
    filters.accessToken,
    filters.timeframe,
    filters.startDate,
    filters.endDate,
    filters.departmentId,
    filters.templateId,
    filters.userId
  ])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData
  }
}

/**
 * Hook for flow management analytics - focused on actionable flow insights
 */
export const useFlowManagementAnalytics = ({
  timeframe = 'mtd',
  accessToken,
  departmentId,
  templateId,
  userId,
  tags
}: {
  timeframe?: 'wtd' | 'mtd' | 'qtd' | 'ytd'
  accessToken: string
  departmentId?: string
  templateId?: string
  userId?: string
  tags?: Record<string, string>
}) => {
  const [data, setData] = useState<FlowManagementAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchAnalytics = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ timeframe })
      if (departmentId) params.append('departmentId', departmentId)
      if (templateId) params.append('templateId', templateId)
      if (userId) params.append('userId', userId)
      if (tags) {
        Object.entries(tags).forEach(([k, v]) => params.append(`tag.${k}`, String(v)))
      }

      const API_BASE = getFlowEngineApiBaseUrl()
      const response = await fetch(`${API_BASE}/analytics/flow-management?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Analytics request failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      if (result.status === 'success') {
        setData(result.data)
      } else {
        throw new Error(result.message || 'Failed to fetch flow management analytics')
      }
    } catch (err) {
      console.error('Error fetching flow management analytics:', err)
      setError(err instanceof Error ? err : new Error('Unknown error occurred'))
    } finally {
      setIsLoading(false)
    }
  }, [timeframe, accessToken, departmentId, templateId, userId, JSON.stringify(tags)])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return {
    data,
    isLoading,
    error,
    refetch: fetchAnalytics
  }
}

interface FlowManagementAnalytics {
  statusMetrics: {
    total_workflows: number
    completed_workflows: number
    pending_workflows: number
    total_tasks: number
    completed_tasks: number
    pending_tasks: number
    overdue_tasks: number
    scheduled_future_tasks: number
    workflow_completion_rate: number
    task_completion_rate: number
    overdue_percentage: number
  }
  slaKillers: Array<{
    flow_name: string
    step_name: string
    total_tasks: number
    sla_violations: number
    violation_rate: number
    avg_overdue_hours: number
  }>
  longestCycleFlows: Array<{
    flow_name: string
    workflow_count: number
    avg_cycle_hours: number
    max_cycle_hours: number
  }>
  longestCycleTasks: Array<{
    task_name: string
    flow_name: string
    task_count: number
    avg_cycle_hours: number
    max_cycle_hours: number
  }>
  timeSeries: Array<{
    date: string
    workflows_started: number
    workflows_completed: number
    tasks_started: number
    tasks_completed: number
    daily_workflow_completion_rate: number
    daily_task_completion_rate: number
  }>
}

// Task Performance Analytics Interfaces
interface TaskPerformanceAnalytics {
  pendingTasks: number
  overdueTasks: number
  taskTypePerformance: Array<{
    taskType: string
    totalTasks: number
    completedTasks: number
    completionRate: number
    avgResponseTime: number
    medianResponseTime: number
    p75ResponseTime?: number
    p95ResponseTime?: number
  }>
  assignmentModeAnalytics: Array<{
    assignmentMode: string
    totalTasks: number
    avgClaimTime: number
    avgCompletionTime: number
    completionRate: number
  }>
  taskStatusDistribution: Array<{
    status: string
    totalTasks: number
    percentage: number
  }>
  completionTimeDistribution: Array<{
    bucket: string
    totalTasks: number
    percentage: number
  }>
  timeSeries?: Array<{
    date: string
    tasks_started: number
    tasks_completed: number
  }>
  userProductivity: Array<{
    userId: string
    userName: string
    tasksCompleted: number
    avgCompletionTime: number
    productivityScore: number
  }>
}

// Hook for Task Performance Analytics
export const useTaskPerformanceAnalytics = (filters: {
  timeframe?: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom'
  startDate?: string
  endDate?: string
  departmentId?: string
  templateId?: string
  userId?: string
  stepType?: string
  workflowType?: string
  tags?: Record<string, string>
  accessToken: string
}): {
  data: TaskPerformanceAnalytics | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
} => {
  const [data, setData] = useState<TaskPerformanceAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const API_BASE = getFlowEngineApiBaseUrl()

  const fetchTaskPerformanceAnalytics = useCallback(async () => {
    if (!filters.accessToken) {
      setError(new Error('Access token is required'))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams()

      // Add all filters as query parameters
      if (filters.timeframe) queryParams.append('timeframe', filters.timeframe)
      if (filters.startDate) queryParams.append('startDate', filters.startDate)
      if (filters.endDate) queryParams.append('endDate', filters.endDate)
      if (filters.departmentId) queryParams.append('departmentId', filters.departmentId)
      if (filters.templateId) queryParams.append('templateId', filters.templateId)
      if (filters.userId) queryParams.append('userId', filters.userId)
      if (filters.stepType) queryParams.append('stepType', filters.stepType)
      if (filters.workflowType) queryParams.append('workflowType', filters.workflowType)

      if (filters.tags) {
        Object.entries(filters.tags).forEach(([k, v]) => queryParams.append(`tag.${k}`, String(v)))
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${filters.accessToken}`
      }

      const response = await fetch(`${API_BASE}/analytics/task-performance?${queryParams.toString()}`, { headers })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch task performance analytics`)
      }

      const result = await response.json()

      if (result.status === 'success' && result.data) {
        setData(result.data)
        console.log('Task performance analytics loaded successfully', {
          timeframe: filters.timeframe,
          dataKeys: Object.keys(result.data)
        })
      } else {
        throw new Error(result.message || 'Invalid response format')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch task performance analytics'
      setError(new Error(errorMessage))
      console.error('Error fetching task performance analytics:', err)
    } finally {
      setIsLoading(false)
    }
  }, [
    API_BASE,
    filters.accessToken,
    filters.timeframe,
    filters.startDate,
    filters.endDate,
    filters.departmentId,
    filters.templateId,
    filters.userId,
    filters.stepType,
    filters.workflowType,
    JSON.stringify(filters.tags)
  ])

  // Fetch data when filters change
  useEffect(() => {
    fetchTaskPerformanceAnalytics()
  }, [fetchTaskPerformanceAnalytics])

  return {
    data,
    isLoading,
    error,
    refetch: fetchTaskPerformanceAnalytics
  }
}

// User Capacity Analytics Interfaces
interface UserCapacityAnalytics {
  workloadDistribution: {
    totalActiveUsers: number
    averageTasksPerUser: number
    maxTasksPerUser: number
    utilizationRate: number
    overloadedUsers: number
    availableCapacity: number
  }
  userWorkloads: Array<{
    userId: string
    userName: string
    currentTasks: number
    inProgressTasks: number
    scheduledTasks: number
    overdueTasks: number
    utilizationRate: number
    avgCompletionTime: number
    capacity: 'underutilized' | 'optimal' | 'overloaded'
    recommendations: string[]
  }>
  departmentCapacity: Array<{
    departmentId: string
    departmentName: string
    totalUsers: number
    activeUsers: number
    totalTasks: number
    avgTasksPerUser: number
    utilizationRate: number
    capacityTrend: 'increasing' | 'stable' | 'decreasing'
  }>
  capacityTrends: Array<{
    period: string
    totalTasks: number
    activeUsers: number
    avgUtilization: number
    peakHour: string
    efficiency: number
  }>
  bottlenecks: Array<{
    type: 'user' | 'department' | 'task_type'
    identifier: string
    name: string
    severity: 'low' | 'medium' | 'high'
    description: string
    impact: string
    recommendation: string
  }>
  scalingRecommendations: Array<{
    category: string
    recommendation: string
    impact: string
    priority: 'low' | 'medium' | 'high'
    timeframe: string
  }>
}

// Hook for User Capacity Analytics
export const useUserCapacityAnalytics = (filters: {
  timeframe?: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom'
  startDate?: string
  endDate?: string
  departmentId?: string
  includeWorkloadDistribution?: boolean
  includeCapacityTrends?: boolean
  includeRecommendations?: boolean
  accessToken: string
}): {
  data: UserCapacityAnalytics | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
} => {
  const [data, setData] = useState<UserCapacityAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const API_BASE = getFlowEngineApiBaseUrl()

  const fetchUserCapacityAnalytics = useCallback(async () => {
    if (!filters.accessToken) {
      setError(new Error('Access token is required'))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams()

      // Add all filters as query parameters
      if (filters.timeframe) queryParams.append('timeframe', filters.timeframe)
      if (filters.startDate) queryParams.append('startDate', filters.startDate)
      if (filters.endDate) queryParams.append('endDate', filters.endDate)
      if (filters.departmentId) queryParams.append('departmentId', filters.departmentId)
      if (filters.includeWorkloadDistribution !== undefined) {
        queryParams.append('includeWorkloadDistribution', filters.includeWorkloadDistribution.toString())
      }
      if (filters.includeCapacityTrends !== undefined) {
        queryParams.append('includeCapacityTrends', filters.includeCapacityTrends.toString())
      }
      if (filters.includeRecommendations !== undefined) {
        queryParams.append('includeRecommendations', filters.includeRecommendations.toString())
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${filters.accessToken}`
      }

      const response = await fetch(`${API_BASE}/analytics/user-capacity?${queryParams.toString()}`, { headers })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch user capacity analytics`)
      }

      const result = await response.json()

      if (result.status === 'success' && result.data) {
        setData(result.data)
        console.log('User capacity analytics loaded successfully', {
          timeframe: filters.timeframe,
          dataKeys: Object.keys(result.data)
        })
      } else {
        throw new Error(result.message || 'Invalid response format')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user capacity analytics'
      setError(new Error(errorMessage))
      console.error('Error fetching user capacity analytics:', err)
    } finally {
      setIsLoading(false)
    }
  }, [
    API_BASE,
    filters.accessToken,
    filters.timeframe,
    filters.startDate,
    filters.endDate,
    filters.departmentId,
    filters.includeWorkloadDistribution,
    filters.includeCapacityTrends,
    filters.includeRecommendations
  ])

  // Fetch data when filters change
  useEffect(() => {
    fetchUserCapacityAnalytics()
  }, [fetchUserCapacityAnalytics])

  return {
    data,
    isLoading,
    error,
    refetch: fetchUserCapacityAnalytics
  }
}

// Enhanced Flow interface matching backend WorkflowListItem
interface StepStatus {
  completed: number
  total: number
  remaining: number
}

interface ProcessHealth {
  isOnTrack: boolean
  hasFailures: boolean
  isStalled: boolean
  statusMessage: string
}

interface TimeInsights {
  avgStepDurationHours?: number
  estimatedCompletionDate?: string
  isOverdue: boolean
  daysRunning: number
  daysSinceLastUpdate: number
}

interface Flow {
  flowId: string
  flowName: string
  templateId: string
  status: string
  startTime: string
  updateTime: string
  endTime?: string
  lastActivityTime?: string // Most recent workflow or task activity

  // Enhanced meaningful metrics
  progressPercentage: number
  stepStatus: StepStatus
  currentStep: number
  processHealth: ProcessHealth
  timeInsights: TimeInsights

  // Duration info
  durationHours?: number
  durationMinutes?: number
}

interface FlowsListData {
  flows: Flow[]
  totalCount: number
  hasMore: boolean
}

// Template Performance Analytics Interfaces
interface TemplatePerformanceAnalytics {
  templates: Array<{
    templateId: string
    templateName: string
    totalWorkflows: number
    completedWorkflows: number
    completionRate: number
    avgCycleTime: number
    medianCycleTime: number
    p75CycleTime: number
    p95CycleTime: number
  }>
  totalCount: number
  hasMore: boolean
  summary: {
    topPerformers: Array<{ templateName: string; completionRate: number }>
    worstPerformers: Array<{ templateName: string; completionRate: number }>
    avgCompletionRate: number
    totalTemplates: number
  }
}

interface FlowsListFilters {
  status?: string
  templateId?: string
  search?: string
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'ASC' | 'DESC'
  accessToken: string
}

export const useFlowsList = (
  filters: FlowsListFilters
): {
  data: FlowsListData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
} => {
  const [data, setData] = useState<FlowsListData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchFlowsList = useCallback(async () => {
    if (!filters.accessToken) {
      setError(new Error('Access token is required'))
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const queryParams = new URLSearchParams()
      if (filters.status) queryParams.append('status', filters.status)
      if (filters.templateId) queryParams.append('templateId', filters.templateId)
      if (filters.search) queryParams.append('search', filters.search)
      if (filters.limit) queryParams.append('limit', filters.limit.toString())
      if (filters.offset) queryParams.append('offset', filters.offset.toString())
      if (filters.orderBy) queryParams.append('orderBy', filters.orderBy)
      if (filters.orderDirection) queryParams.append('orderDirection', filters.orderDirection)

      const API_BASE = getFlowEngineApiBaseUrl()
      const url = `${API_BASE}/flows/list?${queryParams.toString()}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${filters.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch flows list: ${response.status} ${response.statusText}`)
      }

      const responseData = await response.json()

      if (responseData.status === 'success') {
        setData(responseData.data)
      } else {
        throw new Error(responseData.error || 'Failed to fetch flows list')
      }
    } catch (err) {
      console.error('Error fetching flows list:', err)
      setError(err instanceof Error ? err : new Error('Unknown error occurred'))
    } finally {
      setIsLoading(false)
    }
  }, [
    filters.accessToken,
    filters.status,
    filters.templateId,
    filters.search,
    filters.limit,
    filters.offset,
    filters.orderBy,
    filters.orderDirection
  ])

  useEffect(() => {
    fetchFlowsList()
  }, [fetchFlowsList])

  return {
    data,
    isLoading,
    error,
    refetch: fetchFlowsList
  }
}

/**
 * Hook for template performance analytics with pagination and sorting
 */
export const useTemplatePerformanceAnalytics = ({
  timeframe = 'mtd',
  accessToken,
  limit = 20,
  offset = 0,
  sortBy = 'completionRate',
  sortOrder = 'desc',
  departmentId,
  userId,
  tags
}: {
  timeframe?: 'wtd' | 'mtd' | 'qtd' | 'ytd'
  accessToken: string
  limit?: number
  offset?: number
  sortBy?: 'completionRate' | 'totalWorkflows' | 'avgCycleTime' | 'templateName'
  sortOrder?: 'asc' | 'desc'
  departmentId?: string
  userId?: string
  tags?: Record<string, string>
}) => {
  const [data, setData] = useState<TemplatePerformanceAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchAnalytics = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ timeframe, limit: String(limit), offset: String(offset), sortBy, sortOrder })
      if (departmentId) params.append('departmentId', departmentId)
      if (userId) params.append('userId', userId)
      if (tags) Object.entries(tags).forEach(([k, v]) => params.append(`tag.${k}`, String(v)))

      const API_BASE = getFlowEngineApiBaseUrl()
      const response = await fetch(`${API_BASE}/analytics/template-performance?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Template performance analytics request failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      if (result.status === 'success') {
        setData(result.data)
      } else {
        throw new Error(result.message || 'Failed to fetch template performance analytics')
      }
    } catch (err) {
      console.error('Error fetching template performance analytics:', err)
      setError(err instanceof Error ? err : new Error('Unknown error occurred'))
    } finally {
      setIsLoading(false)
    }
  }, [timeframe, accessToken, limit, offset, sortBy, sortOrder, departmentId, userId, JSON.stringify(tags)])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return {
    data,
    isLoading,
    error,
    refetch: fetchAnalytics
  }
}
