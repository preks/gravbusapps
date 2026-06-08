/**
 * useInboundRuns — the live data behind the Customer360 Inbound tab.
 *
 * Inbound triage is powered by the EveryFabric Workforce: when an email hits
 * the "Customer 360 Analyst" agent's inbound-email trigger, the agent starts a
 * run (a DeepAgentSession with `source: 'inbound_email'`). This hook resolves
 * that agent by name and lists its inbound runs so they render as the inbound
 * stream — sender, subject, status, and the customer the agent matched.
 *
 * Workforce runs are served by prompt-manager; we reuse the platform's
 * `PromptManagerClient` / `useWorkforceAgentRuns` rather than re-implementing.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { useWorkforceAgentRuns } from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/useWorkforceAgentRuns'
import {
  hasCustomer360InboundTag,
  type WorkforceRun,
  type WorkforceRunListParams
} from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/workforceTypes'

/**
 * Fallback agent name (matches `DEMO_AGENT_NAME` in
 * prompt-manager/scripts/seed_customer_360.py). Used only when no agent has
 * opted into Customer 360 via the "Customer 360" toggle in its Enterprise
 * Workforce settings — so the seeded demo agent keeps working out of the box.
 */
const CUSTOMER_360_AGENT_NAME = 'customer_360_analyst'

export const INBOUND_PAGE_SIZE = 25

export interface UseInboundRunsResult {
  runs: WorkforceRun[]
  total: number
  /** Resolved workforce agent id, or null until resolved / when missing. */
  agentId: string | null
  /** True once the agent-resolution attempt has finished. */
  agentResolved: boolean
  /** True when resolution finished but the agent is not provisioned yet. */
  agentMissing: boolean
  loading: boolean
  error: string | null
  page: number
  totalPages: number
  setPage: (page: number) => void
  search: string
  setSearch: (search: string) => void
  refetch: () => void
}

export function useInboundRuns(accessToken: string): UseInboundRunsResult {
  const client = usePromptManagerClient(accessToken)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [agentResolved, setAgentResolved] = useState(false)
  const [agentError, setAgentError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!accessToken) return undefined
    let cancelled = false
    setAgentResolved(false)
    const resolveAgent = async () => {
      try {
        const result = await client.listWorkforceAgents({ status: 'active', limit: 200 })
        if (cancelled) return
        const agents = result.data ?? []
        // Prefer agents explicitly opted in via their Workforce settings; fall
        // back to the seeded analyst by name so the demo works untouched.
        const match =
          agents.find(hasCustomer360InboundTag) ?? agents.find(agent => agent.name === CUSTOMER_360_AGENT_NAME)
        setAgentId(match?.agent_id ?? null)
        setAgentError(null)
      } catch (err) {
        if (cancelled) return
        setAgentId(null)
        setAgentError(err instanceof Error ? err.message : 'Failed to resolve the Customer 360 agent')
      } finally {
        if (!cancelled) setAgentResolved(true)
      }
    }
    void resolveAgent()
    return () => {
      cancelled = true
    }
  }, [accessToken, client])

  const params = useMemo<WorkforceRunListParams>(
    () => ({
      source: 'inbound_email',
      limit: INBOUND_PAGE_SIZE,
      offset: page * INBOUND_PAGE_SIZE,
      ...(search.trim() ? { q: search.trim() } : {})
    }),
    [page, search]
  )

  const {
    runs,
    total,
    isLoading,
    error: runsError,
    refetch
  } = useWorkforceAgentRuns({ accessToken, agentId, params, enabled: Boolean(agentId) })

  const handleSetSearch = useCallback((next: string) => {
    setSearch(next)
    setPage(0)
  }, [])

  return {
    runs,
    total,
    agentId,
    agentResolved,
    agentMissing: agentResolved && !agentId && !agentError,
    loading: !agentResolved || isLoading,
    error: agentError ?? runsError,
    page,
    totalPages: Math.max(1, Math.ceil(total / INBOUND_PAGE_SIZE)),
    setPage,
    search,
    setSearch: handleSetSearch,
    refetch
  }
}
