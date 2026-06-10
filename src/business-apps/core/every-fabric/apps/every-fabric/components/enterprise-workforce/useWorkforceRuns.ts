// Data hook for the Workforce Agent run history + manual test runs.
//
// Mirrors the shape of `useWorkforceAgentConfig`: one fetch on mount,
// explicit refetch, and tightly scoped mutations. The hook owns a small
// auto-poll loop that re-fetches the run list while any run is in a
// non-terminal state, so the UI shows a freshly completed run without
// the operator having to click refresh.
//
// Backend contract:
//   GET  /workforce/agents/{id}/runs
//   GET  /workforce/runs/{sessionId}
//   POST /workforce/agents/{id}/runs   (body: WorkforceRunCreateInput)

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { WorkforceRun, WorkforceRunCreateInput, WorkforceRunStatus } from './workforceTypes'

export interface UseWorkforceRunsOptions {
  accessToken: string
  agentId: string | null
  pageSize?: number
  // Polling cadence in milliseconds while at least one run is in a
  // non-terminal state. Defaults to 3s. Set to 0 to disable auto-poll
  // (useful in tests that drive their own timing).
  pollIntervalMs?: number
}

export interface UseWorkforceRunsState {
  runs: WorkforceRun[]
  isLoading: boolean
  isStarting: boolean
  isPolling: boolean
  error: string | null
  refetch: () => Promise<void>
  startRun: (input: WorkforceRunCreateInput) => Promise<WorkforceRun>
  getRun: (sessionId: string) => Promise<WorkforceRun>
  clearError: () => void
}

const TERMINAL_STATUSES: ReadonlySet<WorkforceRunStatus> = new Set<WorkforceRunStatus>([
  'completed',
  'failed',
  'cancelled'
])

const DEFAULT_POLL_INTERVAL_MS = 3000

export function isTerminalRunStatus(status: WorkforceRunStatus): boolean {
  return TERMINAL_STATUSES.has(status)
}

export function hasInFlightRun(runs: readonly WorkforceRun[]): boolean {
  return runs.some(run => !isTerminalRunStatus(run.status))
}

function describeError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

export function useWorkforceRuns({
  accessToken,
  agentId,
  pageSize = 25,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS
}: UseWorkforceRunsOptions): UseWorkforceRunsState {
  const client = usePromptManagerClient(accessToken)

  const [runs, setRuns] = useState<WorkforceRun[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const refetch = useCallback(async () => {
    if (!agentId) {
      setRuns([])
      return
    }
    setIsLoading(true)
    try {
      const page = await client.listWorkforceRuns(agentId, { limit: pageSize })
      setRuns(page.data ?? [])
    } catch (err) {
      setError(describeError(err, 'Failed to load workforce runs.'))
    } finally {
      setIsLoading(false)
    }
  }, [agentId, client, pageSize])

  useEffect(() => {
    void refetch()
  }, [refetch])

  // Auto-poll while any run is still in-flight. Uses setTimeout chains
  // (not setInterval) so a slow API call cannot stack up overlapping
  // refetches, and so disabling polling mid-flight just stops the chain.
  useEffect(() => {
    if (!agentId) return
    if (pollIntervalMs <= 0) return
    if (!hasInFlightRun(runs)) {
      setIsPolling(false)
      return
    }

    setIsPolling(true)
    let cancelled = false

    const timer = setTimeout(async () => {
      if (cancelled) return
      try {
        const page = await client.listWorkforceRuns(agentId, { limit: pageSize })
        if (!cancelled) setRuns(page.data ?? [])
      } catch (err) {
        if (!cancelled) setError(describeError(err, 'Failed to refresh workforce runs.'))
      }
    }, pollIntervalMs)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [agentId, client, pageSize, pollIntervalMs, runs])

  const startRun = useCallback(
    async (input: WorkforceRunCreateInput): Promise<WorkforceRun> => {
      if (!agentId) {
        throw new Error('Cannot start a run without an agent.')
      }
      setIsStarting(true)
      try {
        const created = await client.startWorkforceRun(agentId, input)
        // Optimistically prepend so the new run shows up immediately even
        // before the next poll tick.
        setRuns(prev => [created, ...prev.filter(r => r.session_id !== created.session_id)])
        return created
      } catch (err) {
        const message = describeError(err, 'Failed to start workforce run.')
        setError(message)
        throw err
      } finally {
        setIsStarting(false)
      }
    },
    [agentId, client]
  )

  const getRun = useCallback(
    async (sessionId: string): Promise<WorkforceRun> => {
      try {
        const run = await client.getWorkforceRun(sessionId)
        setRuns(prev => {
          const next = [...prev]
          const idx = next.findIndex(r => r.session_id === run.session_id)
          if (idx === -1) return [run, ...next]
          next[idx] = run
          return next
        })
        return run
      } catch (err) {
        setError(describeError(err, 'Failed to load workforce run.'))
        throw err
      }
    },
    [client]
  )

  // Belt-and-braces ref so callers (e.g. drawers) reading the latest
  // run array outside the render lifecycle never see stale data.
  const runsRef = useRef(runs)
  useEffect(() => {
    runsRef.current = runs
  }, [runs])

  return {
    runs,
    isLoading,
    isStarting,
    isPolling,
    error,
    refetch,
    startRun,
    getRun,
    clearError
  }
}
