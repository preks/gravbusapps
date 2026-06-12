// Agents screen — browsable catalog of available AI agents.

import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'
import {
  ArrowLeftIcon,
  CaretDownIcon,
  CaretRightIcon,
  InfoIcon,
  LightbulbIcon,
  MagnifyingGlassIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
  WrenchIcon
} from '@phosphor-icons/react'
import { type FC, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import type { AgentRegistryEntry } from '@/business-apps/platform/apps/agent-mesh/types/agentMesh'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { AgentCard } from './AgentCard'
import { AgentConfigView } from './AgentConfigView'
import { CreateAgentScreen } from './CreateAgentScreen'
import { ConfirmDialog } from './ConfirmDialog'
import { getAllSourceTypes, getSourceDisplay } from './agentSourceUtils'
import { evaluateAgentReadiness } from './agentStandard'
import type { BuiltinSubagent, FabricAgent } from './agentTypes'
import { agentDisplayLabel } from './agentTypes'
import type { WorkforceAgent } from '../enterprise-workforce/workforceTypes'

function mapRegistryEntryToFabricAgent(
  e: AgentRegistryEntry,
  statusFallback: 'active' | 'archived',
  skillToolMap: Map<string, string[]>
): FabricAgent {
  const skillIds = e.skill_ids ?? []
  const skillToolsById: Record<string, string[]> = {}
  for (const sid of skillIds) {
    const tools = skillToolMap.get(sid)
    if (tools && tools.length > 0) skillToolsById[sid] = tools
  }
  return {
    id: e.id,
    name: e.name,
    display_name: e.display_name ?? null,
    description: e.description,
    agent_type: e.agent_type,
    specialty: e.specialty,
    domain: ((e as unknown as Record<string, unknown>).domain as string | null) ?? e.specialty,
    avatar: e.avatar,
    color: e.color,
    is_public: e.is_public,
    tags: e.tags ?? [],
    tools_count: e.tools_count ?? 0,
    system_prompt_length: e.system_prompt_length ?? 0,
    knowledge_sources_count: e.knowledge_sources_count ?? 0,
    skill_ids: skillIds,
    skills_count: e.skills_count ?? 0,
    skill_tools_by_id: skillToolsById,
    source: e.source ?? 'prompt_odm',
    status: e.status ?? statusFallback,
    created_at: e.created_at
  }
}

// Workforce agents live in a different collection (AutonomousAgentODM) than
// the registry (PromptODM-only), so the registry endpoint never returns them
// regardless of the surface filter. Map them into a FabricAgent here so they
// show in the same grid, flagged as workforce.
function mapWorkforceAgentToFabricAgent(wf: WorkforceAgent, skillToolMap: Map<string, string[]>): FabricAgent {
  const skillIds = wf.skill_ids ?? []
  const skillToolsById: Record<string, string[]> = {}
  for (const sid of skillIds) {
    const tools = skillToolMap.get(sid)
    if (tools && tools.length > 0) skillToolsById[sid] = tools
  }
  return {
    id: wf.agent_id,
    name: wf.name,
    display_name: wf.display_name ?? null,
    description: wf.description,
    agent_type: null,
    specialty: wf.workforce_profile?.role ?? null,
    domain: wf.domain ?? null,
    avatar: null,
    color: null,
    is_public: null,
    tags: wf.tags ?? [],
    tools_count: 0,
    // Workforce agents (AutonomousAgentODM) don't surface a prompt length here;
    // leave undefined so the card's prompt-quality check is skipped for them.
    system_prompt_length: null,
    knowledge_sources_count: wf.workforce_profile?.knowledge_refs?.length ?? 0,
    skill_ids: skillIds,
    skills_count: skillIds.length,
    skill_tools_by_id: skillToolsById,
    source: 'autonomous_agent',
    isWorkforce: true,
    status: wf.status,
    created_at: wf.created_at ?? null
  }
}

type SkillManifestEntry = { skill_id: string; tool_refs?: string[] }

/** Build a skill_id → tool_refs map from the skill manifest and admin skills. */
async function loadSkillToolMap(client: ReturnType<typeof usePromptManagerClient>): Promise<Map<string, string[]>> {
  const [manifest, adminSkills] = await Promise.all([
    client.get<SkillManifestEntry[]>('/skills/manifest').catch(() => [] as SkillManifestEntry[]),
    client.get<SkillManifestEntry[]>('/admin/skills/').catch(() => [] as SkillManifestEntry[])
  ])
  const map = new Map<string, string[]>()
  for (const skill of [...manifest, ...adminSkills]) {
    if (skill.tool_refs && skill.tool_refs.length > 0) map.set(skill.skill_id, skill.tool_refs)
  }
  return map
}

interface ConfirmRequest {
  title: string
  description: string
  confirmLabel: string
  destructive: boolean
  onConfirm: () => void | Promise<void>
}

/** Agents whose source supports archive/activate (others are read-only). */
function isSelectableAgent(agent: FabricAgent): boolean {
  return agent.source === 'prompt_odm' || agent.source === 'autonomous_agent'
}

function agentMatchesSearch(agent: FabricAgent, query: string): boolean {
  const q = query.toLowerCase()
  const label = agentDisplayLabel(agent)
  return (
    label.toLowerCase().includes(q) ||
    agent.name.toLowerCase().includes(q) ||
    agent.description.toLowerCase().includes(q) ||
    (agent.specialty ?? '').toLowerCase().includes(q) ||
    agent.tags.some(t => t.toLowerCase().includes(q))
  )
}

function filterAgentsBySearch(agents: FabricAgent[], search: string): FabricAgent[] {
  const q = search.trim()
  if (!q) return agents
  return agents.filter(a => agentMatchesSearch(a, q))
}

/** Run an async worker over items with a concurrency cap. Returns the failure count. */
async function runWithConcurrency<T>(items: T[], worker: (item: T) => Promise<void>, concurrency = 8): Promise<number> {
  let failures = 0
  let index = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index]
      index += 1
      try {
        await worker(current)
      } catch {
        failures += 1
      }
    }
  })
  await Promise.all(runners)
  return failures
}

interface CollapsibleFabricSectionProps {
  sectionTestId: string
  toggleTestId: string
  expanded: boolean
  onToggle: () => void
  title: string
  count: number
  description: string
  children: ReactNode
}

const CollapsibleFabricSection: FC<CollapsibleFabricSectionProps> = ({
  sectionTestId,
  toggleTestId,
  expanded,
  onToggle,
  title,
  count,
  description,
  children
}) => (
  <div className="gba:mt-8" data-testid={sectionTestId}>
    <button
      type="button"
      onClick={onToggle}
      className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-semibold gba:text-foreground gba:hover:text-foreground/80 gba:transition-colors"
      data-testid={toggleTestId}
    >
      {expanded ? <CaretDownIcon className="gba:h-4 gba:w-4" /> : <CaretRightIcon className="gba:h-4 gba:w-4" />}
      {title}
      <span className="gba:text-xs gba:font-normal gba:text-muted-foreground">({count})</span>
    </button>
    {expanded && (
      <>
        <p className="gba:mt-2 gba:text-xs gba:text-muted-foreground gba:max-w-2xl">{description}</p>
        <div className="gba:mt-3 gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:xl:grid-cols-3 gba:gap-3">
          {children}
        </div>
      </>
    )}
  </div>
)

interface AgentsScreenProps {
  accessToken: string
  onBack: () => void
  /** When true, the header bar is hidden (used when embedded inside SettingsScreen tabs). */
  embedded?: boolean
  /** Optional agent ID from URL state (when embedded in SettingsScreen). When provided, shows the agent detail view. */
  agentId?: string | null
  /** Optional callback to update agent ID in URL state (when embedded in SettingsScreen). */
  onAgentChange?: (agentId: string | null) => void
}

export const AgentsScreen: FC<AgentsScreenProps> = ({
  accessToken,
  onBack,
  embedded = false,
  agentId: agentIdProp,
  onAgentChange
}) => {
  const client = usePromptManagerClient(accessToken)
  const [agents, setAgents] = useState<FabricAgent[]>([])
  const [builtins, setBuiltins] = useState<BuiltinSubagent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [builtinsExpanded, setBuiltinsExpanded] = useState(false)
  const [archivedAgents, setArchivedAgents] = useState<FabricAgent[]>([])
  const [archivedExpanded, setArchivedExpanded] = useState(false)
  const [showLegend, setShowLegend] = useState(false)
  // Local state for non-embedded usage. When embedded, agentIdProp/onAgentChange drive the detail view.
  const [configuringAgentLocal, setConfiguringAgentLocal] = useState<FabricAgent | null>(null)
  // Ids of agents that also live on the Workforce surface (same
  // AutonomousAgentODM record + a workforce_profile). Drives whether the
  // per-agent config editor shows the workforce-only cards.
  const [workforceAgentIds, setWorkforceAgentIds] = useState<Set<string>>(new Set())

  // Derive configuring agent from either URL state (when embedded) or local state
  const configuringAgent = useMemo(() => {
    if (agentIdProp) {
      // Check both active and archived agents
      return agents.find(a => a.id === agentIdProp) ?? archivedAgents.find(a => a.id === agentIdProp) ?? null
    }
    return configuringAgentLocal
  }, [agentIdProp, agents, archivedAgents, configuringAgentLocal])

  // Handler that updates either URL state or local state depending on context
  const handleSetConfiguringAgent = useCallback(
    (agent: FabricAgent | null) => {
      if (onAgentChange) {
        onAgentChange(agent?.id ?? null)
      } else {
        setConfiguringAgentLocal(agent)
      }
    },
    [onAgentChange]
  )

  // Edge case: if agentId is in URL but agent isn't found after loading completes, clear the URL
  useEffect(() => {
    if (agentIdProp && !isLoading && agents.length > 0 && !configuringAgent && onAgentChange) {
      // Agent ID in URL but not found - clear it to return to list view
      onAgentChange(null)
    }
  }, [agentIdProp, isLoading, agents.length, configuringAgent, onAgentChange])
  const [creating, setCreating] = useState(false)
  const [archivingAgentId, setArchivingAgentId] = useState<string | null>(null)
  const [activatingAgentId, setActivatingAgentId] = useState<string | null>(null)
  const [selectedActiveIds, setSelectedActiveIds] = useState<Set<string>>(new Set())
  const [selectedArchivedIds, setSelectedArchivedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const renderHireAgentButton = () => (
    <button
      type="button"
      onClick={() => setCreating(true)}
      className="gba:inline-flex gba:h-8 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-md gba:bg-primary gba:px-3 gba:text-sm gba:font-medium gba:text-primary-foreground gba:shadow-sm gba:transition-colors gba:hover:bg-primary/90 gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring gba:focus-visible:ring-offset-2"
      data-testid="agents-hire-button"
    >
      + Create agent
    </button>
  )

  const loadAgents = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // surface: 'all' so workforce-only agents (surfaces=["workforce"]) are
      // included here too — the registry defaults to 'enterprise', which
      // would otherwise exclude them and leave the workforce cards unreachable.
      const [entries, builtinEntries, archivedEntries, skillToolMap, workforcePage] = await Promise.all([
        client.getAgentRegistry({ limit: 200, surface: 'all' }),
        client.getBuiltinSubagents().catch(() => [] as BuiltinSubagent[]),
        client
          .getAgentRegistry({ limit: 200, status: 'archived', surface: 'all' })
          .catch(() => [] as AgentRegistryEntry[]),
        loadSkillToolMap(client),
        client.listWorkforceAgents({ limit: 200 }).catch(() => ({ data: [], total: 0 }))
      ])
      const workforceIds = new Set(workforcePage.data.map(a => a.agent_id))
      const mapped: FabricAgent[] = entries.map(e => ({
        ...mapRegistryEntryToFabricAgent(e, 'active', skillToolMap),
        isWorkforce: workforceIds.has(e.id)
      }))
      // Workforce agents are not in the registry collection, so append the
      // ones the registry did not already return (dedupe by id).
      const registryIds = new Set(mapped.map(a => a.id))
      const workforceOnly = workforcePage.data
        .filter(wf => !registryIds.has(wf.agent_id))
        .map(wf => mapWorkforceAgentToFabricAgent(wf, skillToolMap))
      const mappedArchived: FabricAgent[] = archivedEntries.map(e => ({
        ...mapRegistryEntryToFabricAgent(e, 'archived', skillToolMap),
        isWorkforce: workforceIds.has(e.id)
      }))
      setAgents([...mapped, ...workforceOnly])
      setArchivedAgents(mappedArchived)
      setBuiltins(builtinEntries)
      setWorkforceAgentIds(workforceIds)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setIsLoading(false)
    }
  }, [client])

  useEffect(() => {
    void loadAgents()
  }, [loadAgents])

  const handleSkillsSaved = useCallback((agentId: string, updatedSkillIds: string[]) => {
    setAgents(prev =>
      prev.map(a => (a.id === agentId ? { ...a, skill_ids: updatedSkillIds, skills_count: updatedSkillIds.length } : a))
    )
  }, [])

  const runArchiveAgent = useCallback(
    async (agent: FabricAgent) => {
      setArchivingAgentId(agent.id)
      setError(null)
      try {
        await client.archiveAgent(agent.id)
        setAgents(prev => prev.filter(a => a.id !== agent.id))
        setArchivedAgents(prev => [...prev, { ...agent, status: 'archived' }])
        if (configuringAgent?.id === agent.id) handleSetConfiguringAgent(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to archive agent')
      } finally {
        setArchivingAgentId(null)
      }
    },
    [client, configuringAgent?.id]
  )

  const handleArchiveAgent = useCallback(
    (agent: FabricAgent) => {
      setConfirm({
        title: 'Archive agent',
        description: `Archive "${agentDisplayLabel(agent)}"? It will be hidden from agent selection and orchestration, but its history is preserved.`,
        confirmLabel: 'Archive',
        destructive: true,
        onConfirm: () => runArchiveAgent(agent)
      })
    },
    [runArchiveAgent]
  )

  const handleActivateAgent = useCallback(
    async (agent: FabricAgent) => {
      setActivatingAgentId(agent.id)
      setError(null)
      try {
        await client.activateAgent(agent.id)
        setArchivedAgents(prev => prev.filter(a => a.id !== agent.id))
        setAgents(prev => [...prev, { ...agent, status: 'active' }])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to activate agent')
      } finally {
        setActivatingAgentId(null)
      }
    },
    [client]
  )

  const toggleActiveSelect = useCallback((agent: FabricAgent) => {
    setSelectedActiveIds(prev => {
      const next = new Set(prev)
      if (next.has(agent.id)) next.delete(agent.id)
      else next.add(agent.id)
      return next
    })
  }, [])

  const toggleArchivedSelect = useCallback((agent: FabricAgent) => {
    setSelectedArchivedIds(prev => {
      const next = new Set(prev)
      if (next.has(agent.id)) next.delete(agent.id)
      else next.add(agent.id)
      return next
    })
  }, [])

  const runBulkArchive = useCallback(async () => {
    const targets = agents.filter(a => selectedActiveIds.has(a.id) && isSelectableAgent(a))
    if (targets.length === 0) return

    setBulkBusy(true)
    setError(null)
    const failures = await runWithConcurrency(targets, async a => {
      await client.archiveAgent(a.id)
    })
    await loadAgents()
    setSelectedActiveIds(new Set())
    setBulkBusy(false)
    if (failures > 0) setError(`Failed to archive ${failures} of ${targets.length} agent(s).`)
  }, [agents, selectedActiveIds, client, loadAgents])

  const handleBulkArchive = useCallback(() => {
    const count = agents.filter(a => selectedActiveIds.has(a.id) && isSelectableAgent(a)).length
    if (count === 0) return
    setConfirm({
      title: `Archive ${count} agent${count > 1 ? 's' : ''}`,
      description: `${count > 1 ? 'These agents' : 'This agent'} will be hidden from agent selection and orchestration, but ${
        count > 1 ? 'their' : 'its'
      } history is preserved.`,
      confirmLabel: `Archive ${count}`,
      destructive: true,
      onConfirm: () => runBulkArchive()
    })
  }, [agents, selectedActiveIds, runBulkArchive])

  const handleBulkActivate = useCallback(async () => {
    const targets = archivedAgents.filter(a => selectedArchivedIds.has(a.id) && isSelectableAgent(a))
    if (targets.length === 0) return

    setBulkBusy(true)
    setError(null)
    const failures = await runWithConcurrency(targets, async a => {
      await client.activateAgent(a.id)
    })
    await loadAgents()
    setSelectedArchivedIds(new Set())
    setBulkBusy(false)
    if (failures > 0) setError(`Failed to activate ${failures} of ${targets.length} agent(s).`)
  }, [archivedAgents, selectedArchivedIds, client, loadAgents])

  const handleConfirmAccept = useCallback(async () => {
    if (!confirm) return
    setConfirmBusy(true)
    try {
      await confirm.onConfirm()
    } finally {
      setConfirmBusy(false)
      setConfirm(null)
    }
  }, [confirm])

  const handleConfirmCancel = useCallback(() => {
    if (confirmBusy) return
    setConfirm(null)
  }, [confirmBusy])

  const filtered = useMemo(() => filterAgentsBySearch(agents, search), [agents, search])
  const filteredArchived = useMemo(() => filterAgentsBySearch(archivedAgents, search), [archivedAgents, search])

  const selectableFiltered = useMemo(() => filtered.filter(isSelectableAgent), [filtered])
  const selectableArchived = useMemo(() => filteredArchived.filter(isSelectableAgent), [filteredArchived])

  const hasSearch = search.trim().length > 0
  const hasAnyVisibleResults = filtered.length > 0 || filteredArchived.length > 0
  const showArchivedSection = hasSearch ? filteredArchived.length > 0 : archivedAgents.length > 0

  useEffect(() => {
    if (hasSearch && filteredArchived.length > 0) {
      setArchivedExpanded(true)
    }
  }, [hasSearch, filteredArchived.length])

  const selectAllActive = useCallback(() => {
    setSelectedActiveIds(new Set(selectableFiltered.map(a => a.id)))
  }, [selectableFiltered])
  const clearActiveSelection = useCallback(() => setSelectedActiveIds(new Set()), [])

  const selectAllArchived = useCallback(() => {
    setSelectedArchivedIds(new Set(selectableArchived.map(a => a.id)))
  }, [selectableArchived])
  const clearArchivedSelection = useCallback(() => setSelectedArchivedIds(new Set()), [])

  if (isLoading) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-3"
        data-testid="agents-screen-loading"
      >
        <SpinnerGapIcon className="gba:h-8 gba:w-8 gba:animate-spin gba:text-muted-foreground" />
        <p className="gba:text-sm gba:text-muted-foreground">Loading agents...</p>
      </div>
    )
  }

  if (creating) {
    return (
      <CreateAgentScreen
        client={client}
        accessToken={accessToken}
        onBack={() => setCreating(false)}
        onCreated={async () => {
          await loadAgents()
          setCreating(false)
        }}
      />
    )
  }

  if (configuringAgent) {
    return (
      <AgentConfigView
        agent={configuringAgent}
        accessToken={accessToken}
        isWorkforceEnabled={workforceAgentIds.has(configuringAgent.id)}
        onBack={() => handleSetConfiguringAgent(null)}
        onSkillsSaved={handleSkillsSaved}
        onAgentUpdated={(agentId, updates) => {
          setAgents(prev =>
            prev.map(a =>
              a.id === agentId
                ? {
                    ...a,
                    name: updates.name,
                    display_name: updates.display_name,
                    description: updates.description,
                    tags: updates.tags,
                    specialty: updates.specialty
                  }
                : a
            )
          )
          // Update local state if using local state mode
          if (!onAgentChange) {
            setConfiguringAgentLocal(prev =>
              prev && prev.id === agentId
                ? {
                    ...prev,
                    name: updates.name,
                    display_name: updates.display_name,
                    description: updates.description,
                    tags: updates.tags,
                    specialty: updates.specialty
                  }
                : prev
            )
          }
        }}
      />
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid="agents-screen">
      <div className={`gba:shrink-0 gba:px-6 gba:lg:px-10 ${embedded ? 'gba:pt-4' : 'gba:pt-8'} gba:pb-4`}>
        {embedded ? (
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
            <div>
              <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">Agents</h2>
              <p className="gba:text-sm gba:text-muted-foreground">
                Create agents, give them instructions, and attach skills, tools, and company policies.
              </p>
            </div>
            {renderHireAgentButton()}
          </div>
        ) : (
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-3">
              <button
                type="button"
                onClick={onBack}
                className="gba:inline-flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-lg gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
                data-testid="agents-back-button"
              >
                <ArrowLeftIcon className="gba:h-5 gba:w-5" />
              </button>
              <div>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <h1 className="gba:text-2xl gba:font-bold gba:text-foreground">Agents</h1>
                  <div className="gba:relative">
                    <button
                      type="button"
                      onClick={() => setShowLegend(prev => !prev)}
                      className="gba:inline-flex gba:items-center gba:justify-center gba:h-6 gba:w-6 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
                      data-testid="agents-info-button"
                      aria-label="Agent source types"
                    >
                      <InfoIcon className="gba:h-4 gba:w-4" />
                    </button>
                    {showLegend && (
                      <div className="gba:absolute gba:left-0 gba:top-full gba:mt-2 gba:z-50 gba:w-80 gba:rounded-lg gba:border gba:border-border gba:bg-popover gba:p-4 gba:shadow-lg">
                        <h4 className="gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wider gba:text-muted-foreground gba:mb-3">
                          Agent sources
                        </h4>
                        <div className="gba:space-y-2.5">
                          {getAllSourceTypes().map(st => (
                            <div key={st.key} className="gba:flex gba:items-start gba:gap-2">
                              <span
                                className={`gba:mt-0.5 gba:shrink-0 gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium ${st.badgeClass}`}
                              >
                                {st.label}
                              </span>
                              <p className="gba:text-xs gba:text-muted-foreground">{st.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <p className="gba:text-sm gba:text-muted-foreground">
                  Specialists on your team. Click to inspect tools, policies, and memory.
                </p>
              </div>
            </div>
            {renderHireAgentButton()}
          </div>
        )}

        <div className="gba:mt-5 gba:relative gba:max-w-sm">
          <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground" />
          <input
            type="text"
            placeholder="Search active and archived agents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:py-2 gba:pl-9 gba:pr-3 gba:text-sm gba:text-foreground gba:placeholder-muted-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
            data-testid="agents-search-input"
          />
        </div>
      </div>

      <div className="gba:flex-1 gba:overflow-y-auto">
        <div className="gba:px-6 gba:lg:px-10 gba:py-4">
          {error && (
            <div className="gba:mb-4 gba:rounded-lg gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:p-4 gba:text-sm gba:text-destructive">
              {error}
              <Button variant="link" size="sm" onClick={() => void loadAgents()} className="gba:ml-2">
                Retry
              </Button>
            </div>
          )}

          {!error && !hasAnyVisibleResults && (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-20 gba:text-center">
              <p className="gba:text-sm gba:text-muted-foreground">
                {hasSearch ? 'No agents match your search.' : 'No agents registered yet.'}
              </p>
            </div>
          )}

          {selectableFiltered.length > 0 && (
            <div
              className="gba:mb-4 gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:rounded-lg gba:border gba:border-border/60 gba:bg-muted/30 gba:px-3 gba:py-2"
              data-testid="active-bulk-toolbar"
            >
              <span className="gba:text-sm gba:font-medium gba:text-foreground">{selectedActiveIds.size} selected</span>
              <div className="gba:ml-auto gba:flex gba:items-center gba:gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllActive}
                  disabled={bulkBusy || selectedActiveIds.size === selectableFiltered.length}
                  data-testid="active-select-all"
                >
                  Select all ({selectableFiltered.length})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearActiveSelection}
                  disabled={bulkBusy || selectedActiveIds.size === 0}
                  data-testid="active-clear-selection"
                >
                  Clear
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleBulkArchive()
                  }}
                  disabled={bulkBusy || selectedActiveIds.size === 0}
                  data-testid="active-bulk-archive"
                  className="gba:text-destructive"
                >
                  {bulkBusy ? 'Working…' : `Archive selected (${selectedActiveIds.size})`}
                </Button>
              </div>
            </div>
          )}

          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:xl:grid-cols-3 gba:gap-4">
            {filtered.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onConfigure={handleSetConfiguringAgent}
                onArchive={agent => {
                  handleArchiveAgent(agent)
                }}
                isArchiving={archivingAgentId === agent.id}
                selectable={isSelectableAgent(agent)}
                selected={selectedActiveIds.has(agent.id)}
                onToggleSelect={toggleActiveSelect}
              />
            ))}
          </div>

          {builtins.length > 0 && (
            <CollapsibleFabricSection
              sectionTestId="builtins-section"
              toggleTestId="builtins-toggle"
              expanded={builtinsExpanded}
              onToggle={() => setBuiltinsExpanded(prev => !prev)}
              title="Built-in Sub-agents"
              count={builtins.length}
              description="Task-matched specialists that the Enterprise Agent activates automatically based on your request. They cannot be configured or run directly."
            >
              {builtins.map(b => {
                const sd = getSourceDisplay(b.source)
                return (
                  <div
                    key={b.id}
                    className="gba:rounded-lg gba:border gba:border-border/60 gba:bg-card/50 gba:p-4"
                    data-testid={`builtin-card-${b.id}`}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1.5">
                      <h4 className="gba:text-sm gba:font-semibold gba:text-foreground">
                        {b.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </h4>
                      <span
                        className={`gba:shrink-0 gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium ${sd.badgeClass}`}
                      >
                        {sd.label}
                      </span>
                    </div>
                    <p className="gba:text-xs gba:leading-relaxed gba:text-muted-foreground gba:line-clamp-3">
                      {b.description}
                    </p>
                    {b.categories.length > 0 && (
                      <div className="gba:flex gba:flex-wrap gba:gap-1.5 gba:mt-2.5">
                        {b.categories.map(cat => (
                          <span
                            key={cat}
                            className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:bg-muted/60 gba:px-2 gba:py-0.5 gba:text-[11px] gba:text-muted-foreground"
                          >
                            <WrenchIcon className="gba:h-3 gba:w-3" />
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </CollapsibleFabricSection>
          )}

          {showArchivedSection && (
            <CollapsibleFabricSection
              sectionTestId="archived-section"
              toggleTestId="archived-toggle"
              expanded={archivedExpanded}
              onToggle={() => setArchivedExpanded(prev => !prev)}
              title="Archived Agents"
              count={hasSearch ? filteredArchived.length : archivedAgents.length}
              description="Previously active agents that have been archived. They are excluded from orchestration but their history is preserved."
            >
              {selectableArchived.length > 0 && (
                <div
                  className="gba:mb-3 gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:rounded-lg gba:border gba:border-border/60 gba:bg-muted/30 gba:px-3 gba:py-2"
                  data-testid="archived-bulk-toolbar"
                >
                  <span className="gba:text-sm gba:font-medium gba:text-foreground">
                    {selectedArchivedIds.size} selected
                  </span>
                  <div className="gba:ml-auto gba:flex gba:items-center gba:gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAllArchived}
                      disabled={bulkBusy || selectedArchivedIds.size === selectableArchived.length}
                      data-testid="archived-select-all"
                    >
                      Select all ({selectableArchived.length})
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearArchivedSelection}
                      disabled={bulkBusy || selectedArchivedIds.size === 0}
                      data-testid="archived-clear-selection"
                    >
                      Clear
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleBulkActivate()
                      }}
                      disabled={bulkBusy || selectedArchivedIds.size === 0}
                      data-testid="archived-bulk-activate"
                    >
                      {bulkBusy ? 'Working…' : `Activate selected (${selectedArchivedIds.size})`}
                    </Button>
                  </div>
                </div>
              )}
              {filteredArchived.map(agent => {
                const archivedSelectable = isSelectableAgent(agent)
                const archivedDistinctTools = new Set<string>()
                for (const refs of Object.values(agent.skill_tools_by_id ?? {})) {
                  for (const ref of refs) archivedDistinctTools.add(ref)
                }
                const archivedToolsInSkills = archivedDistinctTools.size
                const archivedReadiness = evaluateAgentReadiness({
                  skillCount: agent.skills_count ?? 0,
                  toolsInSkillsCount: archivedToolsInSkills,
                  systemPromptLength: agent.system_prompt_length
                })
                return (
                  <div
                    key={agent.id}
                    className="gba:rounded-lg gba:border gba:border-border/60 gba:bg-card/50 gba:p-4 gba:opacity-70 gba:transition-opacity gba:hover:opacity-100"
                    data-testid={`archived-card-${agent.id}`}
                  >
                    <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:mb-1.5">
                      {archivedSelectable && (
                        <input
                          type="checkbox"
                          checked={selectedArchivedIds.has(agent.id)}
                          onChange={() => toggleArchivedSelect(agent)}
                          className="gba:h-4 gba:w-4 gba:shrink-0 gba:rounded gba:border-border gba:text-primary gba:focus:ring-primary"
                          aria-label={`Select ${agentDisplayLabel(agent)}`}
                          data-testid={`archived-select-${agent.id}`}
                        />
                      )}
                      <h4 className="gba:text-sm gba:font-semibold gba:text-foreground">{agentDisplayLabel(agent)}</h4>
                      <span className="gba:shrink-0 gba:rounded-full gba:bg-muted gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium gba:text-muted-foreground">
                        archived
                      </span>
                      {!archivedReadiness.ready && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className="gba:inline-flex gba:shrink-0 gba:cursor-default gba:items-center gba:gap-1 gba:rounded-full gba:bg-red-100 gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-semibold gba:text-red-700"
                                data-testid={`archived-not-ready-badge-${agent.id}`}
                              >
                                <WarningCircleIcon className="gba:h-3 gba:w-3 gba:shrink-0" weight="fill" />
                                Incomplete setup
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="gba:flex gba:max-w-xs gba:flex-col gba:gap-0.5">
                                {archivedReadiness.reasons.map(reason => (
                                  <span key={reason} className="gba:text-xs">
                                    {reason}
                                  </span>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <p className="gba:text-xs gba:leading-relaxed gba:text-muted-foreground gba:line-clamp-3">
                      {agent.description}
                    </p>

                    {/* Skills + tools so authors can judge whether to restore it */}
                    <div className="gba:mt-2.5 gba:flex gba:items-center gba:gap-4">
                      <span className="gba:inline-flex gba:items-center gba:gap-1 gba:text-[11px] gba:text-muted-foreground">
                        <LightbulbIcon className="gba:h-3 gba:w-3 gba:shrink-0" />
                        {agent.skills_count ?? 0} skills
                      </span>
                      <span className="gba:inline-flex gba:items-center gba:gap-1 gba:text-[11px] gba:text-muted-foreground">
                        <WrenchIcon className="gba:h-3 gba:w-3 gba:shrink-0" />
                        {archivedToolsInSkills} tools in skills
                      </span>
                    </div>

                    {agent.tags.length > 0 && (
                      <div className="gba:flex gba:flex-wrap gba:gap-1.5 gba:mt-2.5">
                        {agent.tags.map(tag => (
                          <span
                            key={tag}
                            className="gba:inline-flex gba:items-center gba:rounded-full gba:bg-muted/60 gba:px-2 gba:py-0.5 gba:text-[11px] gba:text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="gba:mt-3 gba:flex gba:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activatingAgentId === agent.id}
                        onClick={() => {
                          handleActivateAgent(agent)
                        }}
                        data-testid={`activate-agent-${agent.id}`}
                      >
                        {activatingAgentId === agent.id ? 'Activating…' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </CollapsibleFabricSection>
          )}
        </div>
      </div>

      {confirm !== null && (
        <ConfirmDialog
          open
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          destructive={confirm.destructive}
          busy={confirmBusy}
          onConfirm={() => {
            handleConfirmAccept()
          }}
          onCancel={handleConfirmCancel}
        />
      )}
    </div>
  )
}
