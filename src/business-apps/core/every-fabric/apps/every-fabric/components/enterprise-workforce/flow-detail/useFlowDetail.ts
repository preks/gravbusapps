// Fetches full Custom Flow Engine detail for one workflow and keeps it fresh
// while the flow is still running.
//
//   - GET /flows/:id          -> overview (status, progress, steps)
//   - GET /flows/:id/history  -> events with resolved display names
//
// Polls both every `pollIntervalMs` until the flow status reaches a terminal
// code, mirroring the lifecycle of `useLiveFlowProgress`. No-op without a
// workflow id, access token, or when `enabled === false`.

import { useCallback, useEffect, useRef, useState } from 'react'

import { labelForStatusCode, variantForStatusCode, type ActionCardStatus } from '../../../utils/actionCardTrace'
import {
  asNumber,
  asString,
  flowEngineApiBase,
  isRecord,
  isTerminalFlowStatus,
  unwrapFlow
} from '../../../utils/flowEngineShared'
import type { FlowDetailOverview, FlowDetailProgress, FlowDetailStep, FlowHistoryEvent } from './flowDetailTypes'

export interface UseFlowDetailOptions {
  workflowId: string | null | undefined
  accessToken: string | null | undefined
  initialStatus?: ActionCardStatus
  enabled?: boolean
  pollIntervalMs?: number
}

export interface FlowDetailState {
  overview: FlowDetailOverview | null
  history: FlowHistoryEvent[]
  status: ActionCardStatus
  isLoading: boolean
  error: string | null
}

const DEFAULT_INITIAL: ActionCardStatus = {
  code: 'PENDING',
  label: 'Pending',
  variant: 'pending'
}

function parseProgress(value: unknown): FlowDetailProgress | undefined {
  if (!isRecord(value)) return undefined
  return {
    currentStep: asNumber(value.currentStep),
    totalSteps: asNumber(value.totalSteps),
    completedSteps: asNumber(value.completedSteps),
    percentage: asNumber(value.percentage)
  }
}

function parseStep(value: unknown, index: number): FlowDetailStep {
  const raw = isRecord(value) ? value : {}
  const title = asString(raw.title) ?? asString(raw.name) ?? `Step ${index + 1}`
  return {
    stepIndex: asNumber(raw.stepIndex) ?? index,
    title,
    type: asString(raw.type),
    status: asString(raw.status) ?? 'UNKNOWN',
    // Task identifiers are only present on waiting human steps; carry them
    // through so the run UI can act on an APPROVAL task (claim/complete/reject).
    taskId: asString(raw.taskId),
    taskBusinessId: asString(raw.taskBusinessId),
    actionId: asString(raw.actionId),
    lifecycleId: asString(raw.lifecycleId),
    assignmentStatus: asString(raw.assignmentStatus),
    assignedUserId: asString(raw.assignedUserId),
    assignmentMode: asString(raw.assignmentMode),
    assignedTo: asString(raw.assignedTo),
    completedBy: asString(raw.completedBy),
    totalTasks: asNumber(raw.totalTasks),
    completedTasks: asNumber(raw.completedTasks),
    totalForks: asNumber(raw.totalForks),
    completedForks: asNumber(raw.completedForks),
    inProgressForks: asNumber(raw.inProgressForks),
    startedAt: asString(raw.startedAt),
    completedAt: asString(raw.completedAt),
    claimedAt: asString(raw.claimedAt),
    availableAt: asString(raw.availableAt),
    scheduledAt: asString(raw.scheduledAt),
    dueDate: asString(raw.dueDate) ?? null,
    completionTimeMinutes: asNumber(raw.completionTimeMinutes)
  }
}

function parseOverview(flow: Record<string, unknown>): FlowDetailOverview | null {
  const id = asString(flow.id) ?? asString(flow.flowId)
  const status = asString(flow.status)
  if (!id || !status) return null
  const stepsRaw = Array.isArray(flow.steps) ? flow.steps : []
  return {
    id,
    templateId: asString(flow.templateId),
    name: asString(flow.name),
    status,
    createdAt: asString(flow.createdAt),
    completedAt: asString(flow.completedAt),
    initiatedBy: asString(flow.initiatedBy),
    initiatedById: asString(flow.initiatedById),
    progress: parseProgress(flow.progress),
    steps: stepsRaw.map((step, index) => parseStep(step, index)),
    tags: isRecord(flow.tags) ? flow.tags : undefined
  }
}

function parseHistory(body: unknown): FlowHistoryEvent[] {
  const data = isRecord(body) && isRecord(body.data) ? body.data : body
  const events = isRecord(data) && Array.isArray(data.events) ? data.events : []
  return events.filter(isRecord).map(event => ({
    type: asString(event.type),
    timestamp: asString(event.timestamp),
    stepIndex: asNumber(event.stepIndex),
    stepTitle: asString(event.stepTitle),
    eventTitle: asString(event.eventTitle),
    description: asString(event.description),
    action: asString(event.action),
    userId: asString(event.userId),
    userName: asString(event.userName)
  }))
}

export function useFlowDetail({
  workflowId,
  accessToken,
  initialStatus,
  enabled = true,
  pollIntervalMs = 25_000
}: UseFlowDetailOptions): FlowDetailState {
  const [state, setState] = useState<FlowDetailState>({
    overview: null,
    history: [],
    status: initialStatus ?? DEFAULT_INITIAL,
    isLoading: false,
    error: null
  })
  const statusCodeRef = useRef<string>(state.status.code)

  const shouldFetch = Boolean(enabled) && Boolean(workflowId) && Boolean(accessToken)

  const refresh = useCallback(
    async (signal?: AbortSignal): Promise<string | null> => {
      if (!shouldFetch || !workflowId || !accessToken) return null
      const apiBase = flowEngineApiBase()
      const auth = { Authorization: `Bearer ${accessToken}` }
      try {
        const [overviewResp, historyResp] = await Promise.all([
          fetch(`${apiBase}/flows/${workflowId}`, { method: 'GET', headers: auth, signal }),
          fetch(`${apiBase}/flows/${workflowId}/history?limit=100`, { method: 'GET', headers: auth, signal }).catch(
            () => null
          )
        ])
        if (!overviewResp.ok) {
          setState(prev => ({ ...prev, isLoading: false, error: `Flow request failed (${overviewResp.status})` }))
          return null
        }
        const overview = parseOverview(unwrapFlow(await overviewResp.json()) ?? {})
        const history = historyResp && historyResp.ok ? parseHistory(await historyResp.json()) : []
        if (!overview) {
          setState(prev => ({ ...prev, isLoading: false, error: 'Flow response could not be parsed' }))
          return null
        }
        statusCodeRef.current = overview.status
        setState({
          overview,
          history,
          status: {
            code: overview.status,
            label: labelForStatusCode(overview.status),
            variant: variantForStatusCode(overview.status)
          },
          isLoading: false,
          error: null
        })
        return overview.status
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return null
        setState(prev => ({ ...prev, isLoading: false, error: 'Could not load flow detail' }))
        return null
      }
    },
    [shouldFetch, workflowId, accessToken]
  )

  useEffect(() => {
    if (!shouldFetch) return
    const ctrl = new AbortController()
    type IntervalHandle = ReturnType<typeof globalThis.setInterval>
    const local = { cancelled: false, intervalId: null as IntervalHandle | null }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    const stopPolling = () => {
      if (local.intervalId !== null) {
        globalThis.clearInterval(local.intervalId)
        local.intervalId = null
      }
    }

    const startInterval = () => {
      local.intervalId = globalThis.setInterval(() => {
        if (isTerminalFlowStatus(statusCodeRef.current)) {
          stopPolling()
          return
        }
        refresh(ctrl.signal).catch(() => null)
      }, pollIntervalMs)
    }

    refresh(ctrl.signal)
      .then(code => {
        if (local.cancelled) return
        if (isTerminalFlowStatus(code ?? statusCodeRef.current)) return
        startInterval()
      })
      .catch(() => null)

    return () => {
      local.cancelled = true
      ctrl.abort()
      stopPolling()
    }
  }, [shouldFetch, refresh, pollIntervalMs])

  return state
}
