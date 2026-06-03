// Phase 6: workforce credit metrics hook.
//
// Replaces the previous N+1 "list runs per agent and sum credits" path
// inside useWorkforceData. Two modes:
//
//   1. Workspace-scoped metrics: a single GET /workforce/metrics that
//      returns workspace-wide totals AND per-agent breakdown. The hook
//      indexes the breakdown by agent_id so tiles can look up their
//      slice in O(1).
//
//   2. Agent-scoped metrics: GET /workforce/agents/{id}/metrics for the
//      WorkforceAgentConfigView trend sparkline.
//
// Both routes aggregate from the credit ledger collection, so the read
// cost is decoupled from the size of the deep-agent sessions table.

import { useCallback, useEffect, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import {
  emptyMetricsTotals,
  type WorkforceAgentMetrics,
  type WorkforceMetricsTotals,
  type WorkforceMetricsWindow,
  type WorkforceWorkspaceMetrics
} from './workforceTypes'

export interface UseWorkforceWorkspaceMetricsOptions {
  accessToken: string
  workspaceId?: string | null
  window?: WorkforceMetricsWindow
  /** SLA target in ms; backend measures attainment against it (0 = none). */
  slaTargetMs?: number
}

export interface UseWorkforceWorkspaceMetricsState {
  metrics: WorkforceWorkspaceMetrics | null
  totalsByAgent: Map<string, WorkforceMetricsTotals>
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const DEFAULT_WINDOW: WorkforceMetricsWindow = 'week'

function describeError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

function buildTotalsIndex(metrics: WorkforceWorkspaceMetrics | null): Map<string, WorkforceMetricsTotals> {
  const index = new Map<string, WorkforceMetricsTotals>()
  if (!metrics) return index
  for (const row of metrics.by_agent ?? []) {
    if (row.agent_id) {
      index.set(row.agent_id, row.totals)
    }
  }
  return index
}

export function useWorkforceWorkspaceMetrics({
  accessToken,
  workspaceId,
  window = DEFAULT_WINDOW,
  slaTargetMs = 0
}: UseWorkforceWorkspaceMetricsOptions): UseWorkforceWorkspaceMetricsState {
  const client = usePromptManagerClient(accessToken)
  const [metrics, setMetrics] = useState<WorkforceWorkspaceMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const page = await client.getWorkforceWorkspaceMetrics(workspaceId ?? '', window, slaTargetMs)
      setMetrics(page)
    } catch (err) {
      setError(describeError(err, 'Failed to load workforce metrics.'))
      setMetrics(null)
    } finally {
      setIsLoading(false)
    }
  }, [client, workspaceId, window, slaTargetMs])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return {
    metrics,
    totalsByAgent: buildTotalsIndex(metrics),
    isLoading,
    error,
    refetch
  }
}

export interface UseWorkforceAgentMetricsOptions {
  accessToken: string
  agentId: string | null
  window?: WorkforceMetricsWindow
}

export interface UseWorkforceAgentMetricsState {
  metrics: WorkforceAgentMetrics | null
  totals: WorkforceMetricsTotals
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useWorkforceAgentMetrics({
  accessToken,
  agentId,
  window = DEFAULT_WINDOW
}: UseWorkforceAgentMetricsOptions): UseWorkforceAgentMetricsState {
  const client = usePromptManagerClient(accessToken)
  const [metrics, setMetrics] = useState<WorkforceAgentMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!agentId) {
      setMetrics(null)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await client.getWorkforceAgentMetrics(agentId, window)
      setMetrics(result)
    } catch (err) {
      setError(describeError(err, 'Failed to load agent metrics.'))
      setMetrics(null)
    } finally {
      setIsLoading(false)
    }
  }, [client, agentId, window])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return {
    metrics,
    totals: metrics?.totals ?? emptyMetricsTotals(),
    isLoading,
    error,
    refetch
  }
}
