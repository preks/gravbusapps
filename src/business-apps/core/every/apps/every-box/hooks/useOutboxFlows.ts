/**
 * useOutboxFlows Hook
 * Fetches workflows initiated by the user
 */

import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Flow, FlowStatus } from '../types'
import { getCflowEndpoint } from '../../every-api/utils/config'
import { getEveryboxServiceApiUrl } from '../../every-api/utils/everyboxServiceUrl'
import { EVERYBOX_FIRST_PAGE_LIMIT } from '../../every-api/constants/everyboxPagination'
import { fetchCflowUserInitiatedFlowsCount } from '../../every-api/utils/CflowClient'

const FLOW_ENGINE_API = getCflowEndpoint()

export const useOutboxFlows = (
  context: BusinessAppContextProps,
  options?: { enabled?: boolean; initialTotalCount?: number }
) => {
  const enabled = options?.enabled !== false
  const [flows, setFlows] = useState<Flow[]>([])
  const [totalCount, setTotalCount] = useState(options?.initialTotalCount ?? 0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use Keycloak user ID for CFlow (flows are initiated by Keycloak ID, not employee ID)
  const userId = context.userInfo?.id || ''

  /**
   * Fetch initiated workflows
   */
  const fetchInitiatedFlows = useCallback(async (): Promise<{ flows: Flow[]; totalCount: number }> => {
    if (!userId) {
      return { flows: [], totalCount: 0 }
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

      const url = `${everyboxApi}/flows/user/${userId}/initiated?limit=${EVERYBOX_FIRST_PAGE_LIMIT}&offset=0`

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
      return {
        flows: flowsFromService,
        totalCount: data.totalCount ?? flowsFromService.length
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Request timed out. The server is taking too long to respond.')
      }

      // Fallback to Flow Engine direct call if everybox-service is not routed yet
      try {
        const url = `${FLOW_ENGINE_API}/api/flows/user/${userId}/initiated?limit=${EVERYBOX_FIRST_PAGE_LIMIT}&offset=0`
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
        const grouped = groupFlowsByBlinkId(transformed)
        const totalCount = await fetchCflowUserInitiatedFlowsCount(userId, context.accessToken)
        return { flows: grouped, totalCount }
      } catch {
        throw err
      }
    }
  }, [userId, context.accessToken])

  /**
   * Load all flows (shows loading spinner — use for manual refresh / initial load)
   *
   * Always applies the latest list to state. A previous fingerprint optimization skipped
   * setState when id/status/completedAssignees matched; new child flows merged into the same
   * blink group keep the same representative id/status, so the UI never updated until a full
   * remount (e.g. tab visibility) forced a fresh tree.
   */
  const loadFlows = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { flows: groupedFlows, totalCount: nextTotalCount } = await fetchInitiatedFlows()
      setTotalCount(nextTotalCount)
      setFlows(groupedFlows)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load flows'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [fetchInitiatedFlows])

  /**
   * Background refresh — does NOT set isLoading (no spinner during polling)
   */
  const backgroundRefresh = useCallback(async () => {
    try {
      const { flows: groupedFlows, totalCount: nextTotalCount } = await fetchInitiatedFlows()
      setTotalCount(nextTotalCount)
      setFlows(groupedFlows)
    } catch {
      // Ignore background refresh errors silently
    }
  }, [fetchInitiatedFlows])

  /**
   * While outbox is hidden, keep total in sync with bootstrap badge counts (no network).
   * Do not mix this with the load effect: including initialTotalCount there re-fetched initiated
   * every time bootstrap completed (duplicate /initiated requests).
   */
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      setTotalCount(options?.initialTotalCount ?? 0)
    }
  }, [enabled, options?.initialTotalCount])

  /**
   * One network load when the outbox tab becomes active — deps intentionally omit initialTotalCount.
   */
  useEffect(() => {
    if (!enabled || !context.accessToken || !userId) {
      return
    }
    void loadFlows()
  }, [enabled, context.accessToken, userId, loadFlows])

  return {
    flows,
    totalCount,
    isLoading,
    error,
    refetch: loadFlows,
    backgroundRefresh
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
