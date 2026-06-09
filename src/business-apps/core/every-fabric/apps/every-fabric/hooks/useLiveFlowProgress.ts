/**
 * Live client-side progress refresh for a Flow Engine workflow.
 *
 * A superset of `useLiveFlowStatus`: besides the status badge it also
 * surfaces step progress (completed / total / percentage) and the
 * currently active step title, so callers can show "Step 2 of 4 ·
 * Review claim" for a still-running process. A single `GET /flows/{id}`
 * returns all of it (status + progress + steps), so this stays one
 * request per poll.
 *
 * Behaviour mirrors `useLiveFlowStatus`: one immediate fetch on mount, a
 * follow-up at 8s, then a poller at `pollIntervalMs` until the status
 * reaches a terminal code. No-op without a workflow id, access token, or
 * when `enabled === false`.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { labelForStatusCode, variantForStatusCode, type ActionCardStatus } from '../utils/actionCardTrace'
import {
  ACTIVE_STEP_STATES,
  asNumber,
  flowEngineApiBase,
  isRecord,
  isTerminalFlowStatus,
  unwrapFlow
} from '../utils/flowEngineShared'

export interface LiveFlowProgress {
  status: ActionCardStatus
  currentStep?: number
  completedSteps?: number
  totalSteps?: number
  percentage?: number
  currentStepTitle?: string
}

export interface UseLiveFlowProgressOptions {
  workflowId: string | null | undefined
  accessToken: string | null | undefined
  initialStatus?: ActionCardStatus
  enabled?: boolean
  pollIntervalMs?: number
}

const DEFAULT_INITIAL: ActionCardStatus = {
  code: 'PENDING',
  label: 'Pending',
  variant: 'pending'
}

function stepTitle(step: unknown): string | undefined {
  if (!isRecord(step)) return undefined
  const title = typeof step.title === 'string' ? step.title : step.name
  return typeof title === 'string' && title.trim() ? title.trim() : undefined
}

// Resolve the title of the step the workflow is currently waiting on.
// Prefer a step whose status is active (mirrors the Services+ adapter);
// fall back to the 1-based `progress.currentStep` index when statuses are
// unavailable or use an enum we do not recognise.
function currentStepTitle(steps: unknown, currentStep: number | undefined): string | undefined {
  if (!Array.isArray(steps)) return undefined
  for (const state of ACTIVE_STEP_STATES) {
    const match = steps.find(step => isRecord(step) && step.status === state)
    const title = stepTitle(match)
    if (title) return title
  }
  if (currentStep && currentStep >= 1 && currentStep <= steps.length) {
    return stepTitle(steps[currentStep - 1])
  }
  return undefined
}

function parseProgress(flow: Record<string, unknown>): Omit<LiveFlowProgress, 'status'> {
  const progress = isRecord(flow.progress) ? flow.progress : {}
  const currentStep = asNumber(progress.currentStep)
  return {
    currentStep,
    completedSteps: asNumber(progress.completedSteps),
    totalSteps: asNumber(progress.totalSteps),
    percentage: asNumber(progress.percentage),
    currentStepTitle: currentStepTitle(flow.steps, currentStep)
  }
}

export function useLiveFlowProgress({
  workflowId,
  accessToken,
  initialStatus,
  enabled = true,
  pollIntervalMs = 25_000
}: UseLiveFlowProgressOptions): LiveFlowProgress {
  const [progress, setProgress] = useState<LiveFlowProgress>({
    status: initialStatus ?? DEFAULT_INITIAL
  })
  const statusCodeRef = useRef<string>(progress.status.code)

  const shouldPoll = Boolean(enabled) && Boolean(workflowId) && Boolean(accessToken)

  const refresh = useCallback(
    async (signal?: AbortSignal): Promise<string | null> => {
      if (!shouldPoll || !workflowId || !accessToken) return null
      try {
        const apiBase = flowEngineApiBase()
        const resp = await fetch(`${apiBase}/flows/${workflowId}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
          signal
        })
        if (!resp.ok) return null
        const body = await resp.json()
        const flow = unwrapFlow(body)
        if (!flow) return null
        const raw = flow.status
        if (typeof raw !== 'string' || !raw) return null
        const next = parseProgress(flow)
        setProgress({
          status: {
            code: raw,
            label: labelForStatusCode(raw),
            variant: variantForStatusCode(raw)
          },
          ...next
        })
        statusCodeRef.current = raw
        return raw
      } catch {
        return null
      }
    },
    [shouldPoll, workflowId, accessToken]
  )

  useEffect(() => {
    if (!shouldPoll) return
    const ctrl = new AbortController()
    type IntervalHandle = ReturnType<typeof globalThis.setInterval>
    const state = { cancelled: false, intervalId: null as IntervalHandle | null }

    const stopPolling = () => {
      if (state.intervalId !== null) {
        globalThis.clearInterval(state.intervalId)
        state.intervalId = null
      }
    }

    const startInterval = () => {
      state.intervalId = globalThis.setInterval(() => {
        if (isTerminalFlowStatus(statusCodeRef.current)) {
          stopPolling()
          return
        }
        refresh(ctrl.signal).catch(() => null)
      }, pollIntervalMs)
    }

    const onEarlyRefresh = (code: string | null) => {
      if (state.cancelled) return
      if (isTerminalFlowStatus(code ?? statusCodeRef.current)) {
        stopPolling()
        return
      }
      startInterval()
    }

    const onInitialRefresh = (code: string | null) => {
      if (state.cancelled) return
      if (isTerminalFlowStatus(code ?? statusCodeRef.current)) return
      globalThis.setTimeout(() => {
        if (state.cancelled) return
        refresh(ctrl.signal)
          .then(onEarlyRefresh)
          .catch(() => null)
      }, 8_000)
    }

    refresh(ctrl.signal)
      .then(onInitialRefresh)
      .catch(() => null)

    return () => {
      state.cancelled = true
      ctrl.abort()
      stopPolling()
    }
  }, [shouldPoll, refresh, pollIntervalMs])

  return progress
}
