// Data hook for the Workforce Agents overview screen.
//
// Fetches workforce-surface agents from prompt-manager's `/workforce/agents`
// endpoint (active + paused) and per-agent triggers, then layers Phase 6
// credit metrics on top via useWorkforceWorkspaceMetrics. The KPI roll-ups
// (creditsThisWeek, runsToday, per-tile credits) come from a single
// `/workforce/metrics` request rather than N+1 per-agent run fetches.
//
// We intentionally keep the recent-runs panel on its own hook
// (useWorkforceRuns) because its data is detail-level, not aggregated.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { WebhookTestOption } from './TestWebhookModal'
import { buildWorkforceDemoSummaries, readOrbitDemoCount } from './workforceDemoAgents'
import { useWorkforceWorkspaceMetrics } from './useWorkforceMetrics'
import {
  emptyMetricsTotals,
  normalizeWorkforceAgent,
  type WorkforceAgent,
  type WorkforceMetricsTotals,
  type WorkforceMetricsWindow,
  type WorkforceTrigger
} from './workforceTypes'

export type WorkforceFilter = 'all' | 'active' | 'paused'

export interface WorkforceCounts {
  active: number
  paused: number
  total: number
  activeTriggers: number
  creditsThisWeek: number
  runsToday: number
}

export interface WorkforceAgentSummary {
  agent: WorkforceAgent
  triggerCount: number
  activeTriggerCount: number
  metrics: WorkforceMetricsTotals
  creditsThisWeek: number
  runsThisWeek: number
  lastCompletedAt: string | null
}

export interface WorkforceData {
  isLoading: boolean
  error: string | null
  agents: WorkforceAgentSummary[]
  filtered: WorkforceAgentSummary[]
  counts: WorkforceCounts
  webhookOptions: WebhookTestOption[]
  refetch: () => Promise<void>
  activate: (agent: WorkforceAgent) => Promise<void>
  pause: (agent: WorkforceAgent) => Promise<void>
  archive: (agent: WorkforceAgent) => Promise<void>
  activatingAgentId: string | null
  pausingAgentId: string | null
  archivingAgentId: string | null
}

interface UseWorkforceDataOptions {
  accessToken: string
  filter: WorkforceFilter
  search: string
  workspaceId?: string | null
  metricsWindow?: WorkforceMetricsWindow
}

function matchesQuery(summary: WorkforceAgentSummary, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  const { agent } = summary
  const profile = agent.workforce_profile
  return (
    agent.name.toLowerCase().includes(q) ||
    agent.display_name.toLowerCase().includes(q) ||
    agent.description.toLowerCase().includes(q) ||
    agent.domain.toLowerCase().includes(q) ||
    profile.role.toLowerCase().includes(q) ||
    (profile.department ?? '').toLowerCase().includes(q) ||
    agent.tags.some(t => t.toLowerCase().includes(q))
  )
}

interface AgentTriggers {
  agent: WorkforceAgent
  triggers: WorkforceTrigger[]
}

export function useWorkforceData({
  accessToken,
  filter,
  search,
  workspaceId,
  metricsWindow = 'week'
}: UseWorkforceDataOptions): WorkforceData {
  const client = usePromptManagerClient(accessToken)

  const [agentTriggers, setAgentTriggers] = useState<AgentTriggers[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activatingAgentId, setActivatingAgentId] = useState<string | null>(null)
  const [pausingAgentId, setPausingAgentId] = useState<string | null>(null)
  const [archivingAgentId, setArchivingAgentId] = useState<string | null>(null)

  const metrics = useWorkforceWorkspaceMetrics({
    accessToken,
    workspaceId,
    window: metricsWindow
  })

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [activePage, pausedPage] = await Promise.all([
        client.listWorkforceAgents({ status: 'active', limit: 100 }),
        client.listWorkforceAgents({ status: 'paused', limit: 100 })
      ])
      const allAgents = [...activePage.data, ...pausedPage.data].map(normalizeWorkforceAgent)

      // Triggers per agent still need a per-agent fetch (they are not part
      // of the credit ledger). The N+1 here is bounded by the agent count,
      // which we expect to stay in the low tens, and the requests run in
      // parallel. Failures collapse to empty arrays.
      const rows = await Promise.all(
        allAgents.map(async agent => {
          const triggers = await client.listWorkforceTriggers(agent.agent_id).catch(() => [] as WorkforceTrigger[])
          return { agent, triggers }
        })
      )
      setAgentTriggers(rows)
      await metrics.refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workforce')
    } finally {
      setIsLoading(false)
    }
    // metrics.refetch identity changes when workspaceId/window change.
  }, [client, metrics.refetch])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const updateAgentInPlace = useCallback((agentId: string, updater: (agent: WorkforceAgent) => WorkforceAgent) => {
    setAgentTriggers(prev =>
      prev.map(row => (row.agent.agent_id === agentId ? { ...row, agent: updater(row.agent) } : row))
    )
  }, [])

  const activate = useCallback(
    async (agent: WorkforceAgent) => {
      setActivatingAgentId(agent.agent_id)
      setError(null)
      try {
        const updated = normalizeWorkforceAgent(await client.activateWorkforceAgent(agent.agent_id))
        updateAgentInPlace(agent.agent_id, () => updated)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to activate agent')
      } finally {
        setActivatingAgentId(null)
      }
    },
    [client, updateAgentInPlace]
  )

  const pause = useCallback(
    async (agent: WorkforceAgent) => {
      setPausingAgentId(agent.agent_id)
      setError(null)
      try {
        const updated = normalizeWorkforceAgent(await client.pauseWorkforceAgent(agent.agent_id))
        updateAgentInPlace(agent.agent_id, () => updated)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to pause agent')
      } finally {
        setPausingAgentId(null)
      }
    },
    [client, updateAgentInPlace]
  )

  const archive = useCallback(
    async (agent: WorkforceAgent) => {
      setArchivingAgentId(agent.agent_id)
      setError(null)
      try {
        await client.archiveWorkforceAgent(agent.agent_id)
        // Archiving drops the workforce surface, so the agent is no longer
        // a Workforce Agent — remove it from the local list immediately.
        setAgentTriggers(prev => prev.filter(row => row.agent.agent_id !== agent.agent_id))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to archive agent')
      } finally {
        setArchivingAgentId(null)
      }
    },
    [client]
  )

  const breakdownByAgent = useMemo(() => {
    const index = new Map<string, { totals: WorkforceMetricsTotals; lastCompletedAt: string | null }>()
    for (const row of metrics.metrics?.by_agent ?? []) {
      if (!row.agent_id) continue
      index.set(row.agent_id, {
        totals: row.totals,
        lastCompletedAt: row.last_completed_at ?? null
      })
    }
    return index
  }, [metrics.metrics])

  const agents: WorkforceAgentSummary[] = useMemo(() => {
    return agentTriggers.map(row => {
      const slice = breakdownByAgent.get(row.agent.agent_id)
      const totals = slice?.totals ?? emptyMetricsTotals()
      return {
        agent: row.agent,
        triggerCount: row.triggers.length,
        activeTriggerCount: row.triggers.filter(t => t.enabled).length,
        metrics: totals,
        creditsThisWeek: totals.total_credits,
        runsThisWeek: totals.runs,
        lastCompletedAt: slice?.lastCompletedAt ?? null
      }
    })
  }, [agentTriggers, breakdownByAgent])

  // Dev-only preview seed (opt-in via `?orbitDemo=N`); no-op in production.
  const demoSummaries = useMemo(() => buildWorkforceDemoSummaries(readOrbitDemoCount()), [])
  const allAgents = useMemo(
    () => (demoSummaries.length > 0 ? [...agents, ...demoSummaries] : agents),
    [agents, demoSummaries]
  )

  const counts: WorkforceCounts = useMemo(() => {
    const active = allAgents.filter(s => s.agent.status === 'active').length
    const paused = allAgents.filter(s => s.agent.status === 'paused').length
    const activeTriggers = allAgents.reduce((acc, s) => acc + s.activeTriggerCount, 0)
    const workspaceTotals = metrics.metrics?.totals
    const creditsThisWeek =
      demoSummaries.length === 0 && workspaceTotals
        ? workspaceTotals.total_credits
        : allAgents.reduce((acc, s) => acc + s.creditsThisWeek, 0)
    const runsToday = metrics.metrics?.runs_today ?? 0
    return {
      active,
      paused,
      total: allAgents.length,
      activeTriggers,
      creditsThisWeek,
      runsToday
    }
  }, [allAgents, demoSummaries.length, metrics.metrics])

  const filtered: WorkforceAgentSummary[] = useMemo(() => {
    const trimmed = search.trim()
    return allAgents.filter(summary => {
      if (filter === 'active' && summary.agent.status !== 'active') return false
      if (filter === 'paused' && summary.agent.status !== 'paused') return false
      return matchesQuery(summary, trimmed)
    })
  }, [filter, search, allAgents])

  const combinedError = error ?? metrics.error

  const webhookOptions = useMemo((): WebhookTestOption[] => {
    return agentTriggers.flatMap(row =>
      row.triggers
        .filter(trigger => trigger.type === 'webhook' && trigger.enabled)
        .map(trigger => ({
          agentId: row.agent.agent_id,
          agentName: row.agent.display_name || row.agent.name,
          triggerId: trigger.trigger_id,
          triggerName: trigger.name || 'Webhook'
        }))
    )
  }, [agentTriggers])

  return {
    isLoading: isLoading || metrics.isLoading,
    error: combinedError,
    agents: allAgents,
    filtered,
    counts,
    webhookOptions,
    refetch,
    activate,
    pause,
    archive,
    activatingAgentId,
    pausingAgentId,
    archivingAgentId
  }
}
