/**
 * Live client-side status refresh for a Flow Engine workflow.
 *
 * Reused by:
 *   - components/renderers/ActionCard.tsx (per-card badge refresh)
 *   - components/workspace/CasePanel.tsx  (per-row badge refresh)
 *
 * Behaviour:
 *   - On mount: one immediate GET /flows/{workflowId}, plus a
 *     follow-up GET after 8s while the status is still non-terminal.
 *   - A long-running poller continues at `pollIntervalMs` until the
 *     status reaches a terminal code (COMPLETED / FAILED / REJECTED /
 *     CANCELED / TERMINATED / TIMED_OUT). The poller is cancelled on
 *     unmount or when the badge transitions to terminal.
 *   - No-op when there is no workflow id, no access token, or
 *     `enabled === false`.
 *
 * The hook returns the latest `ActionCardStatus` (code + label +
 * variant). Callers can pass an `initialStatus` so the badge starts
 * at the agent-reported state and only changes when the live poll
 * disagrees — avoids a "Pending → Running → Completed" flash on
 * mount when the workflow has already finished.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'

import { labelForStatusCode, variantForStatusCode, type ActionCardStatus } from '../utils/actionCardTrace'

const normalizeApiBase = (value: string): string => {
  let result = value.trim()
  while (result.length > 0 && result.charAt(result.length - 1) === '/') {
    result = result.slice(0, -1)
  }
  return result
}

const TERMINAL_CODES: ReadonlySet<string> = new Set([
  'COMPLETED',
  'FAILED',
  'REJECTED',
  'CANCELED',
  'CANCELLED',
  'TERMINATED',
  'TIMED_OUT'
])

export interface UseLiveFlowStatusOptions {
  workflowId: string | null | undefined
  accessToken: string | null | undefined
  initialStatus?: ActionCardStatus
  /** Enable the long-running poller. Defaults to true. */
  enabled?: boolean
  /**
   * Poll interval (ms) used after the initial 8s follow-up. Defaults
   * to 25_000 — cheap on the FE side (a handful of rows × 1 GET
   * every 25s) and fast enough for the user to see the badge flip
   * from "in progress" to "completed" within ~half a minute.
   */
  pollIntervalMs?: number
}

const DEFAULT_INITIAL: ActionCardStatus = {
  code: 'PENDING',
  label: 'Pending',
  variant: 'pending'
}

function isTerminal(code: string | undefined): boolean {
  if (!code) return false
  return TERMINAL_CODES.has(code.toUpperCase())
}

export function useLiveFlowStatus({
  workflowId,
  accessToken,
  initialStatus,
  enabled = true,
  pollIntervalMs = 25_000
}: UseLiveFlowStatusOptions): ActionCardStatus {
  const [status, setStatus] = useState<ActionCardStatus>(initialStatus ?? DEFAULT_INITIAL)
  // Track latest status code in a ref so the poller loop can decide
  // when to stop without re-creating itself on every status flip.
  const statusCodeRef = useRef<string>(status.code)

  const shouldPoll = Boolean(enabled) && Boolean(workflowId) && Boolean(accessToken)

  const refresh = useCallback(
    async (signal?: AbortSignal): Promise<string | null> => {
      if (!shouldPoll || !workflowId || !accessToken) return null
      try {
        const apiBase = normalizeApiBase(CUSTOM_FLOW_ENGINE_API_URL)
        const resp = await fetch(`${apiBase}/flows/${workflowId}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
          signal
        })
        if (!resp.ok) return null
        const body = await resp.json()
        const raw: unknown = body?.data?.status ?? body?.data?.flow?.status ?? body?.status ?? body?.flow?.status
        if (typeof raw !== 'string' || !raw) return null
        setStatus(prev => {
          if (prev.code.toUpperCase() === raw.toUpperCase()) return prev
          return {
            code: raw,
            label: labelForStatusCode(raw),
            variant: variantForStatusCode(raw)
          }
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
        if (isTerminal(statusCodeRef.current)) {
          stopPolling()
          return
        }
        refresh(ctrl.signal).catch(() => null)
      }, pollIntervalMs)
    }

    const onEarlyRefresh = (code: string | null) => {
      if (state.cancelled) return
      if (isTerminal(code ?? statusCodeRef.current)) {
        stopPolling()
        return
      }
      startInterval()
    }

    const onInitialRefresh = (code: string | null) => {
      if (state.cancelled) return
      if (isTerminal(code ?? statusCodeRef.current)) return
      // Quick follow-up at 8s to catch the common "workflow finished
      // a couple of seconds after being triggered" case before the
      // longer poll cadence kicks in.
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

  return status
}
