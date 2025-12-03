/**
 * useOutboxFlows Hook
 * Fetches workflows initiated by the user
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'
import { Flow, FlowStatus } from '../types'

const FLOW_ENGINE_API = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'

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
      // Reduce limit to 50 and add timeout to prevent 524 errors
      const url = `${FLOW_ENGINE_API}/api/flows/user/${userId}/initiated?limit=50&offset=0`

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
        if (response.status === 524) {
          throw new Error('Flow engine is taking too long to respond. Please try again.')
        }
        throw new Error(`Flow engine API error: ${response.status}`)
      }

      const data = await response.json()
      // API response structure: { status: "success", data: { flows: [...], totalCount: N } }
      const rawFlows: any[] = data.data?.flows || []

      return rawFlows.map(flow => transformFlow(flow))
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Request timed out. The server is taking too long to respond.')
      }

      throw err
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

      // Group flows by blinkGroupId
      const groupedFlows = groupFlowsByBlinkId(initiatedFlows)

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

  // Extract blinkGroupId and assignedUserId from tags
  const tags = rawFlow.tags || {}
  const blinkGroupId = tags.blinkGroupId || undefined
  const assignedUserId = tags.assignedUserId || undefined

  return {
    id: rawFlow.flowId || rawFlow.workflowId,
    templateName: rawFlow.flowName || rawFlow.templateName || rawFlow.name || 'Unnamed Flow',
    templateId: rawFlow.templateId,
    status,
    initiatedBy: rawFlow.initiatedBy || rawFlow.initiator || '',
    startedAt: rawFlow.startTime || rawFlow.createdAt,
    completedAt: rawFlow.endTime || rawFlow.completedAt,
    currentStep: rawFlow.currentStep || 0,
    totalSteps: rawFlow.stepStatus?.total || 0,
    steps: [],
    progressPercentage: rawFlow.progressPercentage,
    tags: rawFlow.tags, // Include tags for filtering and badge display
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
