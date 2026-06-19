// Detects a flow-engine human APPROVAL task waiting on one of the workflows a
// run triggered, so the run Overview can surface an interactive Approve/Reject
// section (same idea as compose_email, but the interrupt lives in the Flow
// Engine, not in `run.pending_structured_input`). Resolves triggered flow ids
// from the run's domain actions, polls each flow overview, and exposes the
// first waiting approval per flow with the reference of the preceding step (the
// proposed patch the human reviews).

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  ACTIVE_STEP_STATES,
  asNumber,
  asString,
  flowEngineApiBase,
  isRecord,
  isTerminalFlowStatus,
  unwrapFlow
} from '../../../utils/flowEngineShared'
import { resolveDomainActions } from '../run-detail/runDetailFacts'
import type { WorkforceRun } from '../workforceTypes'
import type { FlowDetailStep } from './flowDetailTypes'

const APPROVAL_POLL_MS = 8_000

interface RunFlowRef {
  workflowId: string
  name: string
}

export interface RunFlowApproval {
  flowId: string
  flowName: string
  step: FlowDetailStep
  /** Canonical reference of the step before the approval (the proposed patch). */
  prevStepReference: string | null
}

export interface UseRunFlowApprovalsState {
  approvals: RunFlowApproval[]
  isLoading: boolean
  /**
   * True while a run that triggered flows has not yet produced a settled
   * approval result (from first render through the first poll). Lets callers
   * hold a "resolved/done" state until we actually know whether an approval is
   * pending, instead of flashing it before the first fetch returns.
   */
  isResolving: boolean
  refresh: () => Promise<void>
}

/** Triggered workflow ids (deduped) the run produced, from its domain actions. */
function flowRefsFromRun(run: WorkforceRun | null | undefined): RunFlowRef[] {
  if (!run) return []
  const refs: RunFlowRef[] = []
  const seen = new Set<string>()
  for (const action of resolveDomainActions(run)) {
    if (action.domain !== 'flow') continue
    const workflowId = action.record_ids?.workflow_id
    if (!workflowId || seen.has(workflowId)) continue
    seen.add(workflowId)
    refs.push({ workflowId, name: action.record_labels?.[workflowId] || 'Workflow' })
  }
  return refs
}

function parseApprovalStep(value: unknown, index: number): FlowDetailStep {
  const raw = isRecord(value) ? value : {}
  return {
    stepIndex: asNumber(raw.stepIndex) ?? index,
    title: asString(raw.title) ?? asString(raw.name) ?? `Step ${index + 1}`,
    type: asString(raw.type),
    status: asString(raw.status) ?? 'UNKNOWN',
    taskId: asString(raw.taskId),
    taskBusinessId: asString(raw.taskBusinessId),
    actionId: asString(raw.actionId),
    lifecycleId: asString(raw.lifecycleId),
    assignmentStatus: asString(raw.assignmentStatus),
    assignedUserId: asString(raw.assignedUserId),
    assignmentMode: asString(raw.assignmentMode),
    assignedTo: asString(raw.assignedTo)
  }
}

/**
 * First step that is an APPROVAL task currently waiting on a human: an active
 * status and a resolvable task id to act on. Returns null otherwise.
 */
export function getWaitingApprovalStep(steps: readonly FlowDetailStep[]): FlowDetailStep | null {
  for (const step of steps) {
    if ((step.type ?? '').toUpperCase() !== 'APPROVAL') continue
    const taskId = step.taskId ?? step.taskBusinessId
    if (!taskId) continue
    if (!ACTIVE_STEP_STATES.includes((step.status ?? '').toUpperCase())) continue
    return step
  }
  return null
}

function prevStepReference(step: FlowDetailStep): string | null {
  return step.stepIndex > 0 ? `step_${step.stepIndex - 1}` : null
}

async function fetchWaitingApproval(
  flow: RunFlowRef,
  accessToken: string,
  signal: AbortSignal
): Promise<{ approval: RunFlowApproval | null; terminal: boolean }> {
  const apiBase = flowEngineApiBase()
  const resp = await fetch(`${apiBase}/flows/${flow.workflowId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    signal
  })
  if (!resp.ok) return { approval: null, terminal: false }
  const overview = unwrapFlow(await resp.json())
  if (!overview) return { approval: null, terminal: false }
  const terminal = isTerminalFlowStatus(asString(overview.status))
  const stepsRaw = Array.isArray(overview.steps) ? overview.steps : []
  const steps = stepsRaw.map((step, index) => parseApprovalStep(step, index))
  const waiting = getWaitingApprovalStep(steps)
  if (!waiting) return { approval: null, terminal }
  return {
    approval: {
      flowId: flow.workflowId,
      flowName: flow.name,
      step: waiting,
      prevStepReference: prevStepReference(waiting)
    },
    terminal
  }
}

/**
 * Polls the workflows a run triggered for any waiting human APPROVAL task.
 * Stops polling once every flow has reached a terminal status. No-op without an
 * access token or triggered flows.
 */
export function useRunFlowApprovals(
  run: WorkforceRun | null | undefined,
  accessToken: string | null | undefined
): UseRunFlowApprovalsState {
  const [approvals, setApprovals] = useState<RunFlowApproval[]>([])
  const [isLoading, setIsLoading] = useState(false)
  // Whether the first poll for the current set of flows has settled. Drives
  // ``isResolving`` so callers don't show a "done" state before we know if an
  // approval is pending.
  const [hasResolved, setHasResolved] = useState(false)
  const allTerminalRef = useRef(false)

  const flowKey = flowRefsFromRun(run)
    .map(ref => ref.workflowId)
    .join(',')

  const refresh = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      const flows = flowRefsFromRun(run)
      if (!accessToken || flows.length === 0) {
        setApprovals([])
        setHasResolved(true)
        return
      }
      setIsLoading(true)
      try {
        const results = await Promise.all(
          flows.map(flow =>
            fetchWaitingApproval(flow, accessToken, signal ?? new AbortController().signal).catch(() => ({
              approval: null as RunFlowApproval | null,
              terminal: false
            }))
          )
        )
        const found = results.map(result => result.approval).filter((value): value is RunFlowApproval => value !== null)
        allTerminalRef.current = results.every(result => result.terminal)
        setApprovals(found)
      } finally {
        setIsLoading(false)
        setHasResolved(true)
      }
    },
    // flowKey captures the set of triggered flows; run identity is stable per detail view.
    [accessToken, flowKey]
  )

  useEffect(() => {
    if (!accessToken || flowKey.length === 0) {
      setApprovals([])
      return
    }
    const ctrl = new AbortController()
    allTerminalRef.current = false
    // New flow set: treat as unresolved until the first poll returns.
    setHasResolved(false)
    void refresh(ctrl.signal)
    const intervalId = globalThis.setInterval(() => {
      if (allTerminalRef.current) return
      void refresh(ctrl.signal)
    }, APPROVAL_POLL_MS)
    return () => {
      ctrl.abort()
      globalThis.clearInterval(intervalId)
    }
  }, [accessToken, flowKey, refresh])

  const publicRefresh = useCallback(async () => {
    await refresh()
  }, [refresh])

  // Resolving = this run triggered flows but the first result has not settled.
  const isResolving = flowKey.length > 0 && !hasResolved

  return { approvals, isLoading, isResolving, refresh: publicRefresh }
}
