import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GuardianVelocityInsightsResponse } from '../types/guardianTypes'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'

// Base URL for the flow engine API - using the same env var as other flow apps
const API_BASE = getFlowEngineApiBaseUrl()

const authHeaders = (accessToken?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  return headers
}

export interface GuardianApiFilters {
  timeframe?: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom'
  startDate?: string
  endDate?: string
  departmentId?: string
  templateId?: string
  userId?: string
  status?: string
  includeApprovalMetrics?: boolean
  limitUsers?: number
}

// Guardian Velocity Insights (combined endpoint)
export const getGuardianVelocityInsights = async (
  accessToken: string,
  filters: GuardianApiFilters = {}
): Promise<GuardianVelocityInsightsResponse> => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, value.toString())
    }
  })

  const response = await fetch(`${API_BASE}/analytics/guardian/velocity?${params}`, {
    headers: authHeaders(accessToken)
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch guardian velocity insights: ${response.statusText}`)
  }

  return response.json()
}

// Guardian Org graph (departments/users/relationships) for network visualization
export const getGuardianOrgGraph = async (accessToken: string, filters: GuardianApiFilters = {}): Promise<any> => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, value.toString())
    }
  })

  const response = await fetch(`${API_BASE}/analytics/guardian/org?${params}`, {
    headers: authHeaders(accessToken)
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch guardian org graph: ${response.statusText}`)
  }

  return response.json()
}

// Analytics API calls
export const getFlowAnalytics = async (accessToken: string, filters: GuardianApiFilters = {}): Promise<any> => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, value.toString())
    }
  })

  const response = await fetch(`${API_BASE}/analytics/flows?${params}`, {
    headers: authHeaders(accessToken)
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch flow analytics: ${response.statusText}`)
  }

  return response.json()
}

export const getFlowManagementAnalytics = async (
  accessToken: string,
  filters: GuardianApiFilters = {}
): Promise<any> => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, value.toString())
    }
  })

  const response = await fetch(`${API_BASE}/analytics/flow-management?${params}`, {
    headers: authHeaders(accessToken)
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch flow management analytics: ${response.statusText}`)
  }

  return response.json()
}

export const getTaskAnalytics = async (accessToken: string, filters: GuardianApiFilters = {}): Promise<any> => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, value.toString())
    }
  })

  const response = await fetch(`${API_BASE}/analytics/tasks?${params}`, {
    headers: authHeaders(accessToken)
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch task analytics: ${response.statusText}`)
  }

  return response.json()
}

export const getTaskPerformanceAnalytics = async (
  accessToken: string,
  filters: GuardianApiFilters = {}
): Promise<any> => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, value.toString())
    }
  })

  const response = await fetch(`${API_BASE}/analytics/task-performance?${params}`, {
    headers: authHeaders(accessToken)
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch task performance analytics: ${response.statusText}`)
  }

  return response.json()
}

export const getTemplatePerformanceAnalytics = async (
  accessToken: string,
  filters: GuardianApiFilters & {
    limit?: number
    offset?: number
    sortBy?: 'completionRate' | 'totalWorkflows' | 'avgCycleTime' | 'templateName'
    sortOrder?: 'asc' | 'desc'
  } = {}
): Promise<any> => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, value.toString())
    }
  })

  const response = await fetch(`${API_BASE}/analytics/template-performance?${params}`, {
    headers: authHeaders(accessToken)
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch template performance analytics: ${response.statusText}`)
  }

  return response.json()
}

// Real-time workflow and task data
export const getActiveWorkflows = async (accessToken: string): Promise<any> => {
  const response = await fetch(`${API_BASE}/flows/list?status=IN_PROGRESS,SCHEDULED`, {
    headers: authHeaders(accessToken)
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch active workflows: ${response.statusText}`)
  }

  return response.json()
}

export const getUserTasks = async (
  accessToken: string,
  userId: string,
  options: {
    includeAssigned?: boolean
    includeClaimable?: boolean
    status?: string
    limit?: number
    flowId?: string
  } = {}
): Promise<any> => {
  const params = new URLSearchParams()
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, value.toString())
    }
  })

  const response = await fetch(`${API_BASE}/tasks/user/${userId}?${params}`, {
    headers: authHeaders(accessToken)
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch user tasks: ${response.statusText}`)
  }

  return response.json()
}

export const getClaimableTasks = async (accessToken: string, userId: string): Promise<any> => {
  const response = await fetch(`${API_BASE}/tasks/user/${userId}/claimable`, {
    headers: authHeaders(accessToken)
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch claimable tasks: ${response.statusText}`)
  }

  return response.json()
}

export const getWorkflowDetails = async (accessToken: string, flowId: string): Promise<any> => {
  const response = await fetch(`${API_BASE}/flows/${flowId}`, {
    headers: authHeaders(accessToken)
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch workflow details: ${response.statusText}`)
  }

  return response.json()
}

// System metrics for health monitoring
export const getSystemMetrics = async (accessToken: string, filters: GuardianApiFilters = {}): Promise<any> => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, value.toString())
    }
  })

  const response = await fetch(`${API_BASE}/analytics/system?${params}`, {
    headers: authHeaders(accessToken)
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch system metrics: ${response.statusText}`)
  }

  return response.json()
}

// Trend analysis for historical comparisons
export const getTrendAnalytics = async (accessToken: string, filters: GuardianApiFilters = {}): Promise<any> => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, value.toString())
    }
  })

  const response = await fetch(`${API_BASE}/analytics/trends?${params}`, {
    headers: authHeaders(accessToken)
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch trend analytics: ${response.statusText}`)
  }

  return response.json()
}

// Audit log data for timeline view
export const getAuditLogs = async (
  accessToken: string,
  filters: {
    userId?: string
    department?: string
    templateId?: string
    flowId?: string
    taskId?: string
    action?: string
    status?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  } = {}
): Promise<any> => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, value.toString())
    }
  })

  const response = await fetch(`${API_BASE}/audit/logs?${params}`, {
    headers: authHeaders(accessToken)
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch audit logs: ${response.statusText}`)
  }

  return response.json()
}
