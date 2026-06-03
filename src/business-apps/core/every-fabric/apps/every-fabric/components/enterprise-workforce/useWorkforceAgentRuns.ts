// Phase A: filterable / paginated runs hook for the per-agent Runs +
// Inbox tabs in the agent detail screen.
//
// Separate from `useWorkforceRuns` (which powers the RecentRunsPanel
// with auto-polling) because the detail screen needs richer query
// parameters and exposes total count for pagination. Polling lives on
// the original hook so this one stays a pure read.

import { useCallback, useEffect, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { WorkforceRun, WorkforceRunListParams } from './workforceTypes'

export interface UseWorkforceAgentRunsOptions {
  accessToken: string
  agentId: string | null
  params?: WorkforceRunListParams
  // When false, the hook stays idle (no fetch on mount). Useful for the
  // Inbox / Runs tabs which only become visible after navigation.
  enabled?: boolean
}

export interface UseWorkforceAgentRunsState {
  runs: WorkforceRun[]
  total: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  clearError: () => void
}

function describeError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

// Deep-but-shallow equality on the params bag. Sufficient because the
// shape is a single level of primitives — we just need to avoid
// triggering refetches on referentially-new but value-equal objects.
function paramsKey(params?: WorkforceRunListParams): string {
  if (!params) return ''
  return JSON.stringify({
    status: params.status ?? null,
    source: params.source ?? null,
    since: params.since ?? null,
    until: params.until ?? null,
    q: params.q ?? null,
    limit: params.limit ?? null,
    offset: params.offset ?? null
  })
}

export function useWorkforceAgentRuns({
  accessToken,
  agentId,
  params,
  enabled = true
}: UseWorkforceAgentRunsOptions): UseWorkforceAgentRunsState {
  const client = usePromptManagerClient(accessToken)
  const [runs, setRuns] = useState<WorkforceRun[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cacheKey = paramsKey(params)

  const refetch = useCallback(async () => {
    if (!agentId || !enabled) {
      setRuns([])
      setTotal(0)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const page = await client.listWorkforceRuns(agentId, params)
      setRuns(page.data ?? [])
      setTotal(page.total ?? 0)
    } catch (err) {
      setError(describeError(err, 'Failed to load workforce runs.'))
      setRuns([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
    // The params object is intentionally excluded; cacheKey captures its value.
  }, [agentId, client, enabled, cacheKey])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const clearError = useCallback(() => setError(null), [])

  return { runs, total, isLoading, error, refetch, clearError }
}
