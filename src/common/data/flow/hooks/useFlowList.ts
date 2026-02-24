import { useState, useEffect } from 'react'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'

const API_BASE = getFlowEngineApiBaseUrl()

export interface FlowFilters {
  status?: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED' | 'TERMINATED'
  template?: string[]
  dateRange?: { start: string; end: string }
  participants?: string[]
  searchTerm?: string
  limit?: number
  offset?: number
}

export interface FlowSummary {
  flowId: string
  workflowId: string
  flowName: string
  templateId: string
  templateName: string
  status: string
  startTime: string
  endTime?: string
  updateTime: string
  lastActivityTime?: string // Most recent workflow or task activity
  progressPercentage: number
  currentStep: number
  totalSteps: number
  initiatedBy: string
  participants: string[]
  priority?: 'HIGH' | 'MEDIUM' | 'LOW'
  isOverdue?: boolean
  durationMinutes?: number
}

export interface FlowListResponse {
  flows: FlowSummary[]
  totalCount: number
  hasMore: boolean
}

export type FlowListVariant = 'initiated' | 'participated' | 'monitoring' | 'active' | 'completed'

function buildEndpoint(variant: FlowListVariant, userId: string): string {
  switch (variant) {
    case 'initiated':
      return `${API_BASE}/flows/user/${userId}/initiated`
    case 'participated':
      return `${API_BASE}/flows/user/${userId}/participated`
    default:
      return `${API_BASE}/flows/list`
  }
}

function buildQueryParams(variant: FlowListVariant, filters: FlowFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (variant === 'completed' && !filters.status) {
    params.append('status', 'COMPLETED')
  } else if ((variant === 'active' || variant === 'monitoring') && !filters.status) {
    params.append('status', 'IN_PROGRESS')
  }
  if (filters.status) params.append('status', filters.status)
  if (filters.searchTerm) params.append('search', filters.searchTerm)
  if (filters.limit) params.append('limit', filters.limit.toString())
  if (filters.offset) params.append('offset', filters.offset.toString())
  if (filters.dateRange?.start) params.append('startDate', filters.dateRange.start)
  if (filters.dateRange?.end) params.append('endDate', filters.dateRange.end)
  return params
}

export const useFlowList = (
  variant: FlowListVariant,
  userId: string,
  accessToken: string,
  filters: FlowFilters = {}
) => {
  const [flows, setFlows] = useState<FlowSummary[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFlows = async () => {
    if (!userId || !accessToken) return

    setLoading(true)
    setError(null)

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      }

      const endpoint = buildEndpoint(variant, userId)
      const params = buildQueryParams(variant, filters)
      const finalEndpoint = params.toString() ? `${endpoint}?${params}` : endpoint
      const response = await fetch(finalEndpoint, { headers })

      if (!response.ok) {
        throw new Error(`Failed to fetch ${variant} flows: ${response.statusText}`)
      }

      const result = await response.json()
      console.debug('API Response structure:', {
        status: result.status,
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : [],
        flowsCount: result.data?.flows?.length || 0
      })

      // Debug: Check if lastActivityTime is present in the response
      if (result.data?.flows?.length > 0) {
        console.debug('First flow data sample:', {
          flowId: result.data.flows[0].flowId,
          startTime: result.data.flows[0].startTime,
          updateTime: result.data.flows[0].updateTime,
          lastActivityTime: result.data.flows[0].lastActivityTime
        })
      }

      // The backend returns { status: 'success', data: { flows: [], totalCount: number } }
      let flowData = result.data?.flows || []

      // Ensure flowData is an array
      if (!Array.isArray(flowData)) {
        console.warn('Expected flowData to be an array, got:', typeof flowData, flowData)
        flowData = []
      }

      // For participated flows, show flows where user has participated
      // This includes flows they initiated (because they likely claim tasks in their own flows)
      // For now, we'll show all flows as a user can participate in any flow
      // Add proper backend participation tracking once the task API is available
      if (variant === 'participated') {
        // For now, show all flows because:
        // 1. A user who initiated a flow likely has tasks in it (participation)
        // 2. A user can be assigned tasks in any flow regardless of who initiated
        // This is a reasonable default until we have proper backend filtering
      }

      // Transform the data to match our interface
      const transformedFlows: FlowSummary[] = flowData.map((flow: any) => ({
        flowId: flow.flowId,
        workflowId: flow.flowId, // Backend uses flowId as the main identifier
        flowName: flow.flowName || 'Unknown Flow',
        templateId: flow.templateId || '',
        templateName: flow.templateName || flow.templateId || '',
        status: flow.status || 'UNKNOWN',
        startTime: flow.startTime,
        endTime: flow.endTime,
        updateTime: flow.updateTime,
        lastActivityTime: flow.lastActivityTime, // Include the enhanced ordering field
        progressPercentage: flow.progressPercentage || 0,
        currentStep: flow.stepStatus?.completed || 0,
        totalSteps: flow.stepStatus?.total || 0,
        initiatedBy: flow.initiatedBy || 'System',
        participants: flow.participants || [],
        priority: flow.priority,
        isOverdue: flow.timeInsights?.isOverdue || false,
        durationMinutes: flow.durationMinutes
      }))

      setFlows(transformedFlows)
      setTotalCount(result.data?.totalCount || transformedFlows.length)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to fetch ${variant} flows`
      setError(errorMessage)
      console.error(`Error fetching ${variant} flows:`, err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFlows()
  }, [variant, userId, accessToken, JSON.stringify(filters)])

  return {
    flows,
    totalCount,
    loading,
    error,
    refetch: fetchFlows
  }
}
