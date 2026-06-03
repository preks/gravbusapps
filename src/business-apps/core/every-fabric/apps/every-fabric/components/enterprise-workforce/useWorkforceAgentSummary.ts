// Phase A: one-shot KPI feed for the per-agent Overview tab.
//
// Wraps GET /workforce/agents/{id}/metrics/summary so the Overview
// tab gets today + week + month + per-source breakdown in a single
// round-trip instead of three or four parallel requests.

import { useCallback, useEffect, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { WorkforceAgentMetricsSummary } from './workforceTypes'

export interface UseWorkforceAgentSummaryOptions {
  accessToken: string
  agentId: string | null
}

export interface UseWorkforceAgentSummaryState {
  summary: WorkforceAgentMetricsSummary | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

function describeError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

export function useWorkforceAgentSummary({
  accessToken,
  agentId
}: UseWorkforceAgentSummaryOptions): UseWorkforceAgentSummaryState {
  const client = usePromptManagerClient(accessToken)
  const [summary, setSummary] = useState<WorkforceAgentMetricsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!agentId) {
      setSummary(null)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await client.getWorkforceAgentMetricsSummary(agentId)
      setSummary(result)
    } catch (err) {
      setError(describeError(err, 'Failed to load agent summary.'))
      setSummary(null)
    } finally {
      setIsLoading(false)
    }
  }, [client, agentId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { summary, isLoading, error, refetch }
}
