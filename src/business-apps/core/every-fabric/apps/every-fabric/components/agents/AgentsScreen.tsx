// Agents screen — browsable catalog of available AI agents.

import { Button } from '@newwork/nw-design-system'
import {
  ArrowLeftIcon,
  CaretDownIcon,
  CaretRightIcon,
  InfoIcon,
  MagnifyingGlassIcon,
  SpinnerGapIcon,
  WrenchIcon
} from '@phosphor-icons/react'
import { type FC, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import type { AgentRegistryEntry } from '@/business-apps/platform/apps/agent-mesh/types/agentMesh'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { AgentCard } from './AgentCard'
import { AgentConfigView } from './AgentConfigView'
import { CreateAgentModal } from './CreateAgentModal'
import { getAllSourceTypes, getSourceDisplay } from './agentSourceUtils'
import type { BuiltinSubagent, FabricAgent } from './agentTypes'

function mapRegistryEntryToFabricAgent(e: AgentRegistryEntry, statusFallback: 'active' | 'archived'): FabricAgent {
  return {
    id: e.id,
    name: e.name,
    description: e.description,
    agent_type: e.agent_type,
    specialty: e.specialty,
    domain: ((e as Record<string, unknown>).domain as string | null) ?? e.specialty,
    avatar: e.avatar,
    color: e.color,
    is_public: e.is_public,
    tags: e.tags ?? [],
    tools_count: e.tools_count ?? 0,
    knowledge_sources_count: e.knowledge_sources_count ?? 0,
    skill_ids: e.skill_ids ?? [],
    skills_count: e.skills_count ?? 0,
    source: e.source ?? 'prompt_odm',
    status: e.status ?? statusFallback,
    created_at: e.created_at
  }
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
  onRunTask: (agent: FabricAgent) => void
  /** When true, the header bar is hidden (used when embedded inside SettingsScreen tabs). */
  embedded?: boolean
}

export const AgentsScreen: FC<AgentsScreenProps> = ({ accessToken, onBack, onRunTask, embedded = false }) => {
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
  const [configuringAgent, setConfiguringAgent] = useState<FabricAgent | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [archivingAgentId, setArchivingAgentId] = useState<string | null>(null)
  const [activatingAgentId, setActivatingAgentId] = useState<string | null>(null)

  const renderHireAgentButton = () => (
    <button
      type="button"
      onClick={() => setCreateOpen(true)}
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
      const [entries, builtinEntries, archivedEntries] = await Promise.all([
        client.getAgentRegistry({ limit: 200 }),
        client.getBuiltinSubagents().catch(() => [] as BuiltinSubagent[]),
        client.getAgentRegistry({ limit: 200, status: 'archived' }).catch(() => [] as AgentRegistryEntry[])
      ])
      const mapped: FabricAgent[] = entries.map(e => mapRegistryEntryToFabricAgent(e, 'active'))
      const mappedArchived: FabricAgent[] = archivedEntries.map(e => mapRegistryEntryToFabricAgent(e, 'archived'))
      setAgents(mapped)
      setArchivedAgents(mappedArchived)
      setBuiltins(builtinEntries)
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

  const handleArchiveAgent = useCallback(
    async (agent: FabricAgent) => {
      const confirmed = window.confirm(
        `Archive "${agent.name.replace(/_/g, ' ')}"? It will be hidden from agent selection and orchestration, but history is preserved.`
      )
      if (!confirmed) return

      setArchivingAgentId(agent.id)
      setError(null)
      try {
        await client.archiveAgent(agent.id)
        setAgents(prev => prev.filter(a => a.id !== agent.id))
        setArchivedAgents(prev => [...prev, { ...agent, status: 'archived' }])
        if (configuringAgent?.id === agent.id) setConfiguringAgent(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to archive agent')
      } finally {
        setArchivingAgentId(null)
      }
    },
    [client, configuringAgent?.id]
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

  const filtered = useMemo(() => {
    if (!search.trim()) return agents
    const q = search.toLowerCase()
    return agents.filter(
      a =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        (a.specialty ?? '').toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q))
    )
  }, [agents, search])

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

  if (configuringAgent) {
    return (
      <AgentConfigView
        agent={configuringAgent}
        accessToken={accessToken}
        onBack={() => setConfiguringAgent(null)}
        onSkillsSaved={handleSkillsSaved}
        onAgentUpdated={(agentId, updates) => {
          setAgents(prev =>
            prev.map(a =>
              a.id === agentId ? { ...a, name: updates.name, description: updates.description, tags: updates.tags } : a
            )
          )
          setConfiguringAgent(prev =>
            prev && prev.id === agentId
              ? { ...prev, name: updates.name, description: updates.description, tags: updates.tags }
              : prev
          )
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
            placeholder="Search agents..."
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

          {!error && filtered.length === 0 && (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-20 gba:text-center">
              <p className="gba:text-sm gba:text-muted-foreground">
                {search ? 'No agents match your search.' : 'No agents registered yet.'}
              </p>
            </div>
          )}

          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:xl:grid-cols-3 gba:gap-4">
            {filtered.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onRunTask={onRunTask}
                onConfigure={setConfiguringAgent}
                onArchive={agent => {
                  handleArchiveAgent(agent)
                }}
                isArchiving={archivingAgentId === agent.id}
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

          {archivedAgents.length > 0 && (
            <CollapsibleFabricSection
              sectionTestId="archived-section"
              toggleTestId="archived-toggle"
              expanded={archivedExpanded}
              onToggle={() => setArchivedExpanded(prev => !prev)}
              title="Archived Agents"
              count={archivedAgents.length}
              description="Previously active agents that have been archived. They are excluded from orchestration but their history is preserved."
            >
              {archivedAgents.map(agent => {
                const sd = getSourceDisplay(agent.source)
                return (
                  <div
                    key={agent.id}
                    className="gba:rounded-lg gba:border gba:border-border/60 gba:bg-card/50 gba:p-4 gba:opacity-70"
                    data-testid={`archived-card-${agent.id}`}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1.5">
                      <h4 className="gba:text-sm gba:font-semibold gba:text-foreground">
                        {agent.name.replace(/_/g, ' ')}
                      </h4>
                      <span
                        className={`gba:shrink-0 gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium ${sd.badgeClass}`}
                      >
                        {sd.label}
                      </span>
                      <span className="gba:shrink-0 gba:rounded-full gba:bg-muted gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium gba:text-muted-foreground">
                        archived
                      </span>
                    </div>
                    <p className="gba:text-xs gba:leading-relaxed gba:text-muted-foreground gba:line-clamp-3">
                      {agent.description}
                    </p>
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

      {createOpen && (
        <CreateAgentModal
          open={createOpen}
          client={client}
          accessToken={accessToken}
          onClose={() => setCreateOpen(false)}
          onCreated={loadAgents}
        />
      )}
    </div>
  )
}
