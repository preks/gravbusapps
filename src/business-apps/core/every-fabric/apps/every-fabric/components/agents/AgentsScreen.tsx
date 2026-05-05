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
import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { AgentCard } from './AgentCard'
import { CreateAgentModal } from './CreateAgentModal'
import { SkillAssignmentPicker } from './SkillAssignmentPicker'
import { getAllSourceTypes, getSourceDisplay } from './agentSourceUtils'
import type { BuiltinSubagent, FabricAgent } from './agentTypes'

interface AgentsScreenProps {
  accessToken: string
  onBack: () => void
  onRunTask: (agent: FabricAgent) => void
  /** When true, the header bar is hidden (used when embedded inside SettingsScreen tabs). */
  embedded?: boolean
}

export const AgentsScreen: React.FC<AgentsScreenProps> = ({ accessToken, onBack, onRunTask, embedded = false }) => {
  const client = usePromptManagerClient(accessToken)
  const [agents, setAgents] = useState<FabricAgent[]>([])
  const [builtins, setBuiltins] = useState<BuiltinSubagent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [builtinsExpanded, setBuiltinsExpanded] = useState(false)
  const [showLegend, setShowLegend] = useState(false)
  const [configuringAgent, setConfiguringAgent] = useState<FabricAgent | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [archivingAgentId, setArchivingAgentId] = useState<string | null>(null)

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
      const [entries, builtinEntries] = await Promise.all([
        client.getAgentRegistry({ limit: 200 }),
        client.getBuiltinSubagents().catch(() => [] as BuiltinSubagent[])
      ])
      const mapped: FabricAgent[] = entries.map(e => ({
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
        status: e.status ?? 'active',
        created_at: e.created_at
      }))
      setAgents(mapped)
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
    setConfiguringAgent(null)
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
        if (configuringAgent?.id === agent.id) setConfiguringAgent(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to archive agent')
      } finally {
        setArchivingAgentId(null)
      }
    },
    [client, configuringAgent?.id]
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
                onArchive={agent => void handleArchiveAgent(agent)}
                isArchiving={archivingAgentId === agent.id}
              />
            ))}
          </div>

          {builtins.length > 0 && (
            <div className="gba:mt-8" data-testid="builtins-section">
              <button
                type="button"
                onClick={() => setBuiltinsExpanded(prev => !prev)}
                className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-semibold gba:text-foreground gba:hover:text-foreground/80 gba:transition-colors"
                data-testid="builtins-toggle"
              >
                {builtinsExpanded ? (
                  <CaretDownIcon className="gba:h-4 gba:w-4" />
                ) : (
                  <CaretRightIcon className="gba:h-4 gba:w-4" />
                )}
                Built-in Sub-agents
                <span className="gba:text-xs gba:font-normal gba:text-muted-foreground">({builtins.length})</span>
              </button>
              {builtinsExpanded && (
                <>
                  <p className="gba:mt-2 gba:text-xs gba:text-muted-foreground gba:max-w-2xl">
                    Task-matched specialists that the Enterprise Agent activates automatically based on your request.
                    They cannot be configured or run directly.
                  </p>
                  <div className="gba:mt-3 gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:xl:grid-cols-3 gba:gap-3">
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
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {configuringAgent && (
        <SkillAssignmentPicker
          agent={configuringAgent}
          accessToken={accessToken}
          onClose={() => setConfiguringAgent(null)}
          onSaved={ids => handleSkillsSaved(configuringAgent.id, ids)}
        />
      )}
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
