import { useCallback, useEffect, useState } from 'react'
import { useRestClient } from '@/common/network/rest/useRestClient'
import type { StepInstance } from '@/business-apps/ser/types'
import type { StepStatus } from '@/business-apps/ser/packages/services-plus-core/src'
import { FLOW_ENGINE_API_BASE, ONBOARDING_APP_TAG } from '../constants'

const VALID_STEP_STATUSES = new Set<StepStatus>([
  'SCHEDULED',
  'OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
  'FAILED',
  'PAUSED',
  'READY',
  'QUEUED',
  'RUNNING',
  'DONE',
  'CANCELLED',
  'SKIPPED',
  'TIMED_OUT',
  'CANCELED',
  'UNKNOWN'
])

function mapTaskStatus(status: string | undefined): StepStatus {
  const upper = status?.toUpperCase() as StepStatus
  return VALID_STEP_STATUSES.has(upper) ? upper : 'SCHEDULED'
}

/** Form field from flow-engine task (e.g. SELECT for entity) */
export interface OnboardingTaskFormField {
  name: string
  type: string
  label?: string
  value?: string
  required?: boolean
  dataSource?: { type?: string; entity?: string; labelField?: string; valueField?: string }
}

/** Extended StepInstance with assignment and detail fields from flow-engine API */
export type OnboardingTask = StepInstance & {
  assignment?: { assignmentMode?: string; assignmentStatus?: string; assignedTo?: string }
  /** Task priority: LOW, MEDIUM, HIGH */
  priority?: string
  /** Urgency level from API (e.g. high, medium, low) */
  urgency_level?: string
  /** Form fields to complete (e.g. SELECT Employee) */
  form?: OnboardingTaskFormField[]
  /** User can withdraw the flow/task */
  canWithdraw?: boolean
  /** Business/lifecycle ID for display (e.g. REQ-xxx) */
  taskBusinessId?: string
  lifecycleId?: string
  /** Flow status (e.g. RUNNING) for overall request panel */
  flowStatus?: string
  /** Total comment count from API */
  totalComments?: number
}

function mapTaskToStepInstance(task: Record<string, unknown>): OnboardingTask {
  const assignment = (task.assignment ?? {}) as Record<string, unknown>
  const assignmentStatus = assignment.assignmentStatus as string | undefined
  const assignmentMode = assignment.assignmentMode as string | undefined
  const assignedTo = assignment.assignedTo as string | undefined

  let assignedToUserId: string | undefined
  let claimedByUserId: string | undefined
  if (assignedTo) {
    if (assignmentStatus === 'ASSIGNED') {
      assignedToUserId = assignedTo
      claimedByUserId = undefined
    } else if (assignmentStatus === 'CLAIMED') {
      assignedToUserId = undefined
      claimedByUserId = assignedTo
    } else {
      assignedToUserId = undefined
      claimedByUserId = undefined
    }
  }

  const availableActions = task.availableActions as Record<string, boolean> | undefined
  return {
    id: (task.id as string) ?? '',
    defId: (task.actionId as string) ?? (task.id as string) ?? '',
    name: (task.title as string) ?? 'Unnamed Task',
    status: mapTaskStatus(task.status as string),
    desk: 'HR',
    requestId: (task.flowId as string) ?? 'unknown',
    requesterId: (task.requesterId as string) ?? undefined,
    flowInitiatedById: task.flowInitiatedById as string | undefined,
    flowInitiatedBy: task.flowInitiatedBy as string | undefined,
    requesterName: undefined,
    startedAt: (task.scheduledAt as string) ?? new Date().toISOString(),
    updatedAt: (task.updatedAt as string) ?? (task.scheduledAt as string) ?? undefined,
    dueDate: task.dueDate as string | undefined,
    comments: Array.isArray(task.comments) ? (task.comments as StepInstance['comments']) : [],
    assignedToUserId,
    claimedByUserId,
    flowName: task.flowName as string | undefined,
    message: task.message as string | undefined,
    availableActions: availableActions
      ? {
          canClaim: availableActions.canClaim ?? false,
          canUnclaim: availableActions.canUnclaim ?? false,
          canComplete: availableActions.canComplete ?? false,
          canReassign: availableActions.canReassign ?? false,
          canReject: availableActions.canReject ?? false,
          canComment: availableActions.canComment !== false
        }
      : undefined,
    assignment: task.assignment
      ? {
          assignmentMode,
          assignmentStatus,
          assignedTo: assignment.assignedTo as string | undefined
        }
      : undefined,
    priority: task.priority as string | undefined,
    urgency_level: task.urgency_level as string | undefined,
    form: Array.isArray(task.form) ? (task.form as OnboardingTaskFormField[]) : undefined,
    canWithdraw: task.canWithdraw as boolean | undefined,
    taskBusinessId: task.taskBusinessId as string | undefined,
    lifecycleId: task.lifecycleId as string | undefined,
    flowStatus: task.flowStatus as string | undefined,
    totalComments: typeof task.totalComments === 'number' ? task.totalComments : undefined
  } as OnboardingTask
}

function normalizeTasksResponse(raw: unknown): OnboardingTask[] {
  const data = raw && typeof raw === 'object' && 'tasks' in raw ? (raw as { tasks?: unknown[] }).tasks : null
  const tasks = Array.isArray(data) ? data : []
  return tasks.map((t: unknown) => mapTaskToStepInstance((t ?? {}) as Record<string, unknown>))
}

export interface UseOnboardingTicketsProps {
  accessToken: string
  userInfo?: { id?: string }
}

export interface UseOnboardingTicketsReturn {
  tickets: OnboardingTask[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetches onboarding tasks (tickets) for the current user from the flow engine.
 * Same pattern as useOnboardingFlows / useCases: direct API call with tag AppCatalog:1:HR_ONBOARDING.
 */
export function useOnboardingTickets({ accessToken, userInfo }: UseOnboardingTicketsProps): UseOnboardingTicketsReturn {
  const userId = userInfo?.id
  const client = useRestClient(FLOW_ENGINE_API_BASE)
  const headers = useCallback(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken])
  const [tickets, setTickets] = useState<OnboardingTask[]>([])
  const [isLoading, setIsLoading] = useState(!!userId)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!accessToken || !userInfo || !userId) {
      setTickets([])
      setError('Missing authentication or user information')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const res = await client.get<unknown>(`/tasks/user/${userId}?tags.app=${ONBOARDING_APP_TAG}`, {
        headers: headers()
      })
      setTickets(normalizeTasksResponse(res ?? {}))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets')
      setTickets([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, userInfo, userId, client, headers])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { tickets, isLoading, error, refetch }
}

export interface UseOnboardingTaskDetailProps {
  taskId: string | null
  accessToken: string
  userInfo?: { id?: string }
}

export interface UseOnboardingTaskDetailReturn {
  ticket: StepInstance | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetches a single task detail from flow-engine (same base URL as useOnboardingTickets).
 * Use this so the detail request goes to /flow-engine/api/tasks/... not /api/tasks/...
 */
export function useOnboardingTaskDetail({
  taskId,
  accessToken,
  userInfo
}: UseOnboardingTaskDetailProps): UseOnboardingTaskDetailReturn {
  const userId = userInfo?.id
  const client = useRestClient(FLOW_ENGINE_API_BASE)
  const headers = useCallback(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken])
  const [ticket, setTicket] = useState<StepInstance | null>(null)
  const [isLoading, setIsLoading] = useState(!!taskId)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!taskId || !accessToken || !userInfo || !userId) {
      setTicket(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const res = await client.get<unknown>(`/tasks/${taskId}`, {
        headers: headers(),
        params: { userId }
      })
      const raw = res && typeof res === 'object' ? res : {}
      const taskData = (raw as { task?: Record<string, unknown> }).task ?? raw
      setTicket(mapTaskToStepInstance((taskData ?? {}) as Record<string, unknown>))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task')
      setTicket(null)
    } finally {
      setIsLoading(false)
    }
  }, [taskId, accessToken, userInfo, userId, client, headers])

  useEffect(() => {
    if (taskId) refetch()
    else {
      setTicket(null)
      setError(null)
      setIsLoading(false)
    }
  }, [taskId, refetch])

  return { ticket, isLoading, error, refetch }
}
