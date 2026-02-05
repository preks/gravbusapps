/**
 * useOutboxFlows Hook
 * Fetches workflows initiated by the user
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Flow, FlowStatus } from '../types'
import { getCflowEndpoint } from '../../every-api/utils/config'
import { getEveryboxServiceApiUrl } from '../../every-api/utils/everyboxServiceUrl'

const FLOW_ENGINE_API = getCflowEndpoint()

export const useOutboxFlows = (context: BusinessAppContextProps) => {
  const [flows, setFlows] = useState<Flow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use Keycloak user ID for CFlow (flows are initiated by Keycloak ID, not employee ID)
  const userId = context.userInfo?.id || ''

  // Track last flow data to avoid unnecessary re-renders
  const lastFlowDataRef = useRef<string>('')

  /**
   * Fetch initiated workflows
   */
  const fetchInitiatedFlows = useCallback(async (): Promise<Flow[]> => {
    if (!userId) {
      return []
    }

    try {
      // Prefer everybox-service (server-side normalization + grouping + caching)
      const everyboxApi = (() => {
        try {
          return getEveryboxServiceApiUrl()
        } catch {
          return null
        }
      })()

      if (!everyboxApi) {
        throw new Error('Everybox service URL not configured')
      }

      const url = `${everyboxApi}/flows/user/${userId}/initiated?limit=50&offset=0`

      // Add timeout to prevent hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(context.accessToken && { Authorization: `Bearer ${context.accessToken}` })
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Everybox service API error: ${response.status}`)
      }

      const data = await response.json()
      const flowsFromService: Flow[] = data.flows || []
      return flowsFromService
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Request timed out. The server is taking too long to respond.')
      }

      // Fallback to Flow Engine direct call if everybox-service is not routed yet
      try {
        const url = `${FLOW_ENGINE_API}/api/flows/user/${userId}/initiated?limit=50&offset=0`
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)

        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...(context.accessToken && { Authorization: `Bearer ${context.accessToken}` })
          },
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          if (response.status === 524) {
            throw new Error('Flow engine is taking too long to respond. Please try again.')
          }
          throw new Error(`Flow engine API error: ${response.status}`)
        }

        const data = await response.json()
        const rawFlows: any[] = data.data?.flows || []
        const transformed = rawFlows.map(flow => transformFlow(flow))
        return groupFlowsByBlinkId(transformed)
      } catch {
        throw err
      }
    }
  }, [userId, context.accessToken])

  /**
   * Load all flows
   */
  const loadFlows = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const initiatedFlows = await fetchInitiatedFlows()
      const groupedFlows = initiatedFlows

      // Only update state if data has actually changed (optimization for polling)
      const newFlowData = JSON.stringify(
        groupedFlows.map(f => ({
          id: f.id,
          status: f.status,
          startedAt: f.startedAt,
          completedAt: f.completedAt,
          blinkGroupId: f.blinkGroupId,
          completedAssignees: f.completedAssignees,
          assigneeCount: f.assigneeCount
        }))
      )

      if (newFlowData !== lastFlowDataRef.current) {
        lastFlowDataRef.current = newFlowData
        setFlows(groupedFlows)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load flows'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [fetchInitiatedFlows])

  /**
   * Initial load
   */
  useEffect(() => {
    if (context.accessToken && userId) {
      loadFlows()
    }
  }, [context.accessToken, userId, loadFlows])

  return {
    flows,
    isLoading,
    error,
    refetch: loadFlows
  }
}

/**
 * Transform raw flow to unified format
 */
const transformFlow = (rawFlow: any): Flow => {
  const status = mapFlowStatus(rawFlow.status)

  const isUuid = (value: unknown): value is string =>
    typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

  // Normalize tags: can come back as object, JSON string, or different keys
  const parseTags = (value: unknown): Record<string, any> => {
    if (!value) return {}
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, any>) : {}
      } catch {
        return {}
      }
    }
    if (typeof value === 'object') return value as Record<string, any>
    return {}
  }

  const tags = parseTags(rawFlow.tags || rawFlow.workflowTags || rawFlow.workflow_meta?.tags)

  // Extract blinkGroupId and assignedUserId from tags (support snake_case too)
  const blinkGroupId = tags.blinkGroupId || tags.blink_group_id || undefined
  const assignedUserId = tags.assignedUserId || tags.assigned_user_id || undefined

  // Extract initiator userId (best-effort, varies by backend)
  const initiatorUserId =
    (isUuid(rawFlow.initiatedById) && rawFlow.initiatedById) ||
    (isUuid(rawFlow.initiatorUserId) && rawFlow.initiatorUserId) ||
    (isUuid(rawFlow.initiatorId) && rawFlow.initiatorId) ||
    (isUuid(rawFlow.flowInitiatedById) && rawFlow.flowInitiatedById) ||
    undefined

  return {
    id: rawFlow.flowId || rawFlow.workflowId,
    templateName: rawFlow.flowName || rawFlow.templateName || rawFlow.name || 'Unnamed Flow',
    templateId: rawFlow.templateId,
    status,
    initiatedBy: rawFlow.initiatedBy || rawFlow.initiator || '',
    initiatorUserId,
    startedAt: rawFlow.startTime || rawFlow.createdAt,
    completedAt: rawFlow.endTime || rawFlow.completedAt,
    currentStep: rawFlow.currentStep || 0,
    totalSteps: rawFlow.stepStatus?.total || 0,
    steps: [],
    progressPercentage: rawFlow.progressPercentage,
    tags, // Normalized tags for filtering and badge display
    blinkGroupId, // Add blinkGroupId for grouping
    assignedUserId, // Add assignedUserId to identify who this workflow is for
    metadata: {
      rawFlow
    }
  }
}

/**
 * Group flows by blinkGroupId
 * Multi-assignee blinks with the same groupId are displayed as a single entry
 */
const groupFlowsByBlinkId = (flows: Flow[]): Flow[] => {
  // Separate flows with and without group IDs
  const groupedFlowsMap = new Map<string, Flow[]>()
  const ungroupedFlows: Flow[] = []

  flows.forEach(flow => {
    if (flow.blinkGroupId) {
      const existing = groupedFlowsMap.get(flow.blinkGroupId) || []
      existing.push(flow)
      groupedFlowsMap.set(flow.blinkGroupId, existing)
    } else {
      ungroupedFlows.push(flow)
    }
  })

  // Create grouped flow entries
  const groupedFlowEntries: Flow[] = []
  groupedFlowsMap.forEach(groupFlows => {
    if (groupFlows.length === 1) {
      // Single flow in group, treat as ungrouped
      ungroupedFlows.push(groupFlows[0])
    } else {
      // Multiple flows in group, create a grouped entry
      const completedCount = groupFlows.filter(f => f.status === 'COMPLETED').length
      const allCompleted = completedCount === groupFlows.length

      // Use the first flow as the base, but aggregate data
      const representativeFlow = groupFlows[0]

      groupedFlowEntries.push({
        ...representativeFlow,
        isGrouped: true,
        groupedFlows: groupFlows,
        assigneeCount: groupFlows.length,
        completedAssignees: completedCount,
        status: allCompleted ? 'COMPLETED' : 'RUNNING', // Mark as completed only if all are done
        completedAt: allCompleted
          ? groupFlows.reduce(
              (latest, f) => (!latest || (f.completedAt && f.completedAt > latest) ? f.completedAt : latest),
              groupFlows[0].completedAt
            )
          : undefined
      })
    }
  })

  // Combine and sort by start date (newest first)
  return [...groupedFlowEntries, ...ungroupedFlows].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  )
}

/**
 * Map flow status to unified status
 */
const mapFlowStatus = (status: string): FlowStatus => {
  switch (status.toUpperCase()) {
    case 'RUNNING':
    case 'IN_PROGRESS':
      return 'RUNNING'
    case 'COMPLETED':
      return 'COMPLETED'
    case 'FAILED':
    case 'TIMED_OUT':
      return 'FAILED'
    case 'TERMINATED':
    case 'CANCELED':
      return 'TERMINATED'
    default:
      return 'RUNNING'
  }
}
