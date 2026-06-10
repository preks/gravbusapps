/**
 * useInboundRuns — the live data behind the Customer360 Inbound tab.
 *
 * Inbound triage is powered by the EveryFabric Workforce: when an email hits
 * an agent's inbound-email trigger, the agent starts a run (a DeepAgentSession
 * with `source: 'inbound_email'`). This hook resolves *every* agent that opted
 * into Customer 360 (via the "Show inbound runs in Customer 360" toggle in its
 * Enterprise Workforce settings) and merges their inbound runs into a single
 * stream — sender, subject, status, and the customer the agent matched.
 *
 * Multiple agents can be opted in (e.g. a dedicated analyst plus a claims
 * specialist), so we aggregate across all of them rather than picking one.
 *
 * Workforce runs are served by prompt-manager; we reuse the platform's
 * `PromptManagerClient` rather than re-implementing.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import {
  hasCustomer360InboundTag,
  type WorkforceRun,
  type WorkforceRunListParams
} from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/workforceTypes'

/**
 * Fallback agent name (matches `AGENT_NAME` in
 * prompt-manager/scripts/customer_360_defs.py). Used only when no agent has
 * opted into Customer 360 via the toggle in its Enterprise Workforce settings,
 * so the seeded analyst keeps working out of the box.
 */
const CUSTOMER_360_AGENT_NAME = 'customer_360_analyst'

export const INBOUND_PAGE_SIZE = 25

/**
 * Safety cap on how many runs we pull per agent before merging. Inbound
 * volumes are modest, so a single generous page per agent keeps the merge
 * bounded without needing server-side cross-agent pagination.
 */
const MAX_RUNS_PER_AGENT = 200

export interface UseInboundRunsResult {
  runs: WorkforceRun[]
  total: number
  /** First resolved agent id, or null until resolved / when none opted in. */
  agentId: string | null
  /** True once the agent-resolution attempt has finished. */
  agentResolved: boolean
  /** True when resolution finished but no agent opted into Customer 360. */
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
  const [agentIds, setAgentIds] = useState<string[]>([])
  const [agentResolved, setAgentResolved] = useState(false)
  const [agentError, setAgentError] = useState<string | null>(null)
  const [allRuns, setAllRuns] = useState<WorkforceRun[]>([])
  const [runsLoading, setRunsLoading] = useState(false)
  const [runsError, setRunsError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')

  // 1) Resolve every agent opted into Customer 360 inbound (by tag); fall back
  //    to the seeded analyst by name so the demo works untouched.
  useEffect(() => {
    if (!accessToken) return undefined
    let cancelled = false
    setAgentResolved(false)
    const resolveAgents = async () => {
      try {
        const result = await client.listWorkforceAgents({ status: 'active', limit: 200 })
        if (cancelled) return
        const agents = result.data ?? []
        const tagged = agents.filter(hasCustomer360InboundTag)
        const resolved = tagged.length > 0 ? tagged : agents.filter(agent => agent.name === CUSTOMER_360_AGENT_NAME)
        setAgentIds(resolved.map(agent => agent.agent_id))
        setAgentError(null)
      } catch (err) {
        if (cancelled) return
        setAgentIds([])
        setAgentError(err instanceof Error ? err.message : 'Failed to resolve the Customer 360 agent')
      } finally {
        if (!cancelled) setAgentResolved(true)
      }
    }
    void resolveAgents()
    return () => {
      cancelled = true
    }
  }, [accessToken, client])

  const trimmedSearch = search.trim()

  // 2) Fetch + merge inbound runs across all resolved agents.
  const loadRuns = useCallback(async () => {
    if (agentIds.length === 0) {
      setAllRuns([])
      return
    }
    setRunsLoading(true)
    setRunsError(null)
    try {
      const params: WorkforceRunListParams = {
        source: 'inbound_email',
        limit: MAX_RUNS_PER_AGENT,
        offset: 0,
        ...(trimmedSearch ? { q: trimmedSearch } : {})
      }
      const pages = await Promise.all(agentIds.map(id => client.listWorkforceRuns(id, params)))
      const merged = pages.flatMap(result => result.data ?? [])
      merged.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      setAllRuns(merged)
    } catch (err) {
      setRunsError(err instanceof Error ? err.message : 'Failed to load workforce runs.')
      setAllRuns([])
    } finally {
      setRunsLoading(false)
    }
  }, [client, agentIds, trimmedSearch])

  useEffect(() => {
    void loadRuns()
  }, [loadRuns])

  const totalPages = Math.max(1, Math.ceil(allRuns.length / INBOUND_PAGE_SIZE))
  const pageRuns = useMemo(
    () => allRuns.slice(page * INBOUND_PAGE_SIZE, page * INBOUND_PAGE_SIZE + INBOUND_PAGE_SIZE),
    [allRuns, page]
  )

  const handleSetSearch = useCallback((next: string) => {
    setSearch(next)
    setPage(0)
  }, [])

  const refetch = useCallback(() => {
    void loadRuns()
  }, [loadRuns])

  return {
    runs: pageRuns,
    total: allRuns.length,
    agentId: agentIds[0] ?? null,
    agentResolved,
    agentMissing: agentResolved && agentIds.length === 0 && !agentError,
    loading: !agentResolved || runsLoading,
    error: agentError ?? runsError,
    page,
    totalPages,
    setPage,
    search,
    setSearch: handleSetSearch,
    refetch
  }
}
