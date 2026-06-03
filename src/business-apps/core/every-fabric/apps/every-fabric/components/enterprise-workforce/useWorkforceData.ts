// Data hook for the Enterprise Workforce overview screen.
//
// Combines three sources from the prompt-manager backend into a single,
// memoised view-model:
//   - active agents (`/agents/registry`)
//   - archived agents (`/agents/registry?status=archived`)
//   - built-in sub-agents (`/agents/builtins`) — task-matched specialists
//     activated automatically by the orchestrator
//
// Exposes filtered slices + counts that the screen drives off of, plus
// activate / archive mutations that locally reconcile state without a
// full refetch (the same pattern AgentsScreen uses).

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AgentRegistryEntry } from '@/business-apps/platform/apps/agent-mesh/types/agentMesh'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { BuiltinSubagent, FabricAgent } from '../agents/agentTypes'

export type WorkforceFilter = 'all' | 'active' | 'inactive' | 'builtin' | 'archived'

export interface WorkforceCounts {
  active: number
  archived: number
  builtin: number
  total: number
}

export interface WorkforceData {
  isLoading: boolean
  error: string | null
  activeAgents: FabricAgent[]
  archivedAgents: FabricAgent[]
  builtinAgents: BuiltinSubagent[]
  counts: WorkforceCounts
  filtered: FabricAgent[]
  refetch: () => Promise<void>
  activate: (agent: FabricAgent) => Promise<void>
  archive: (agent: FabricAgent) => Promise<void>
  activatingAgentId: string | null
  archivingAgentId: string | null
}

function mapRegistryEntryToFabricAgent(entry: AgentRegistryEntry, statusFallback: 'active' | 'archived'): FabricAgent {
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description,
    agent_type: entry.agent_type,
    specialty: entry.specialty,
    domain: ((entry as Record<string, unknown>).domain as string | null) ?? entry.specialty,
    avatar: entry.avatar,
    color: entry.color,
    is_public: entry.is_public,
    tags: entry.tags ?? [],
    tools_count: entry.tools_count ?? 0,
    knowledge_sources_count: entry.knowledge_sources_count ?? 0,
    skill_ids: entry.skill_ids ?? [],
    skills_count: entry.skills_count ?? 0,
    source: entry.source ?? 'prompt_odm',
    status: entry.status ?? statusFallback,
    created_at: entry.created_at
  }
}

function builtinAsFabricAgent(b: BuiltinSubagent): FabricAgent {
  return {
    id: b.id,
    name: b.name,
    description: b.description,
    agent_type: 'builtin',
    specialty: b.categories[0] ?? null,
    domain: b.categories[0] ?? null,
    avatar: null,
    color: '#f59e0b',
    is_public: true,
    tags: b.categories,
    tools_count: 0,
    knowledge_sources_count: 0,
    skill_ids: [],
    skills_count: 0,
    source: b.source ?? 'builtin_subagent',
    status: 'active',
    created_at: null
  }
}

function matchesQuery(agent: FabricAgent, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    agent.name.toLowerCase().includes(q) ||
    agent.description.toLowerCase().includes(q) ||
    (agent.specialty ?? '').toLowerCase().includes(q) ||
    agent.tags.some(t => t.toLowerCase().includes(q))
  )
}

interface UseWorkforceDataOptions {
  accessToken: string
  filter: WorkforceFilter
  search: string
}

export function useWorkforceData({ accessToken, filter, search }: UseWorkforceDataOptions): WorkforceData {
  const client = usePromptManagerClient(accessToken)

  const [activeAgents, setActiveAgents] = useState<FabricAgent[]>([])
  const [archivedAgents, setArchivedAgents] = useState<FabricAgent[]>([])
  const [builtinAgents, setBuiltinAgents] = useState<BuiltinSubagent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activatingAgentId, setActivatingAgentId] = useState<string | null>(null)
  const [archivingAgentId, setArchivingAgentId] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [entries, builtinEntries, archivedEntries] = await Promise.all([
        client.getAgentRegistry({ limit: 200 }),
        client.getBuiltinSubagents().catch(() => [] as BuiltinSubagent[]),
        client.getAgentRegistry({ limit: 200, status: 'archived' }).catch(() => [] as AgentRegistryEntry[])
      ])
      setActiveAgents(entries.map(e => mapRegistryEntryToFabricAgent(e, 'active')))
      setArchivedAgents(archivedEntries.map(e => mapRegistryEntryToFabricAgent(e, 'archived')))
      setBuiltinAgents(builtinEntries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workforce')
    } finally {
      setIsLoading(false)
    }
  }, [client])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const activate = useCallback(
    async (agent: FabricAgent) => {
      setActivatingAgentId(agent.id)
      setError(null)
      try {
        await client.activateAgent(agent.id)
        setArchivedAgents(prev => prev.filter(a => a.id !== agent.id))
        setActiveAgents(prev => (prev.some(a => a.id === agent.id) ? prev : [...prev, { ...agent, status: 'active' }]))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to activate agent')
      } finally {
        setActivatingAgentId(null)
      }
    },
    [client]
  )

  const archive = useCallback(
    async (agent: FabricAgent) => {
      setArchivingAgentId(agent.id)
      setError(null)
      try {
        await client.archiveAgent(agent.id)
        setActiveAgents(prev => prev.filter(a => a.id !== agent.id))
        setArchivedAgents(prev =>
          prev.some(a => a.id === agent.id) ? prev : [...prev, { ...agent, status: 'archived' }]
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to archive agent')
      } finally {
        setArchivingAgentId(null)
      }
    },
    [client]
  )

  const counts: WorkforceCounts = useMemo(
    () => ({
      active: activeAgents.length,
      archived: archivedAgents.length,
      builtin: builtinAgents.length,
      total: activeAgents.length + archivedAgents.length + builtinAgents.length
    }),
    [activeAgents.length, archivedAgents.length, builtinAgents.length]
  )

  const filtered: FabricAgent[] = useMemo(() => {
    const builtinAsAgents = builtinAgents.map(builtinAsFabricAgent)
    let pool: FabricAgent[]
    switch (filter) {
      case 'active':
        pool = activeAgents
        break
      case 'inactive':
      case 'archived':
        pool = archivedAgents
        break
      case 'builtin':
        pool = builtinAsAgents
        break
      case 'all':
      default:
        pool = [...activeAgents, ...builtinAsAgents, ...archivedAgents]
        break
    }
    return pool.filter(a => matchesQuery(a, search.trim()))
  }, [filter, search, activeAgents, archivedAgents, builtinAgents])

  return {
    isLoading,
    error,
    activeAgents,
    archivedAgents,
    builtinAgents,
    counts,
    filtered,
    refetch,
    activate,
    archive,
    activatingAgentId,
    archivingAgentId
  }
}
