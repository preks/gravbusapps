// Enterprise Workforce — top-level overview of the AI workforce.
//
// Discovery surface where operators can browse, search and activate
// agents. Two browsing modes:
//
//   1. Default browse mode — hero + KPIs + (collapsed) AI trigger +
//      slim filter row + tile grid.
//   2. AI find-me-an-agent mode — when the user submits a task
//      description in the expanded composer, the grid switches to
//      ranked matches with match-confidence badges.
//
// The KPI strip in the hero already gives the user an at-a-glance
// overview of how many agents are active; the "Active" filter chip in
// the filter row narrows the grid to those.

import { Button } from '@newwork/nw-design-system'
import { ArrowLeftIcon, SparkleIcon, SpinnerGapIcon, UsersThreeIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { AgentConfigView } from '../agents/AgentConfigView'
import { CreateAgentModal } from '../agents/CreateAgentModal'
import type { FabricAgent } from '../agents/agentTypes'
import type { ActiveSessionSnapshot } from '../../types/activeSession'
import { WorkforceAIComposer } from './WorkforceAIComposer'
import { WorkforceAgentTile, type WorkforceTileStatus } from './WorkforceAgentTile'
import { WorkforceFilters } from './WorkforceFilters'
import { WorkforceHero } from './WorkforceHero'
import { rankAgents } from './agentMatching'
import { useWorkforceData, type WorkforceFilter } from './useWorkforceData'

interface EnterpriseWorkforceScreenProps {
  accessToken: string
  activeSessions: ActiveSessionSnapshot[]
  onBack: () => void
}

function resolveTileStatus(agent: FabricAgent): WorkforceTileStatus {
  if (agent.source === 'builtin_subagent') return 'builtin'
  if (agent.status === 'archived') return 'archived'
  if (agent.status === 'active') return 'active'
  return 'inactive'
}

/** Maximum number of ranked agents to show when an AI query is active. */
const MAX_AI_MATCHES = 9

export const EnterpriseWorkforceScreen: React.FC<EnterpriseWorkforceScreenProps> = ({
  accessToken,
  activeSessions,
  onBack
}) => {
  const client = usePromptManagerClient(accessToken)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<WorkforceFilter>('all')
  const [aiQuery, setAiQuery] = useState<string | null>(null)
  const [configuringAgent, setConfiguringAgent] = useState<FabricAgent | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const {
    isLoading,
    error,
    counts,
    filtered,
    refetch,
    activate,
    archive,
    activatingAgentId,
    archivingAgentId,
    activeAgents,
    archivedAgents,
    builtinAgents
  } = useWorkforceData({ accessToken, filter, search })

  const liveCount = useMemo(() => activeSessions.length, [activeSessions.length])

  const aiResults = useMemo(() => {
    if (!aiQuery) return []
    const builtinAsAgents = builtinAgents.map(b => ({
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
    }))
    const pool: FabricAgent[] = [...activeAgents, ...builtinAsAgents, ...archivedAgents]
    return rankAgents(pool, aiQuery).slice(0, MAX_AI_MATCHES)
  }, [aiQuery, activeAgents, archivedAgents, builtinAgents])

  const isAIMatching = aiQuery !== null

  const handleSkillsSaved = (agentId: string, updatedSkillIds: string[]) => {
    setConfiguringAgent(prev =>
      prev && prev.id === agentId ? { ...prev, skill_ids: updatedSkillIds, skills_count: updatedSkillIds.length } : prev
    )
    void refetch()
  }

  const handleAgentUpdated = (agentId: string, updates: { name: string; description: string; tags: string[] }) => {
    setConfiguringAgent(prev =>
      prev && prev.id === agentId
        ? { ...prev, name: updates.name, description: updates.description, tags: updates.tags }
        : prev
    )
    void refetch()
  }

  if (configuringAgent) {
    return (
      <div className="gba:flex gba:flex-col gba:h-full gba:bg-background">
        <AgentConfigView
          agent={configuringAgent}
          accessToken={accessToken}
          onBack={() => setConfiguringAgent(null)}
          onSkillsSaved={handleSkillsSaved}
          onAgentUpdated={handleAgentUpdated}
        />
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid="enterprise-workforce-screen">
      <div className="gba:shrink-0 gba:border-b gba:border-border/60 gba:bg-card/30 gba:backdrop-blur">
        <div className="gba:mx-auto gba:flex gba:max-w-7xl gba:items-center gba:gap-3 gba:px-6 gba:py-3 gba:lg:px-10">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="gba:inline-flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-lg gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
            data-testid="workforce-back-button"
          >
            <ArrowLeftIcon className="gba:h-5 gba:w-5" />
          </button>
          <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">Enterprise Workforce</span>
        </div>
      </div>

      <div className="gba:flex-1 gba:overflow-y-auto">
        <div className="gba:mx-auto gba:flex gba:max-w-7xl gba:flex-col gba:gap-6 gba:px-6 gba:py-8 gba:lg:px-10">
          <WorkforceHero counts={counts} liveCount={liveCount} onHireAgent={() => setCreateOpen(true)} />

          <div className="gba:flex gba:flex-col gba:gap-3">
            <WorkforceAIComposer activeQuery={aiQuery} onSubmit={setAiQuery} onClear={() => setAiQuery(null)} />

            {!isAIMatching && (
              <WorkforceFilters
                search={search}
                onSearchChange={setSearch}
                filter={filter}
                onFilterChange={setFilter}
                counts={counts}
              />
            )}
          </div>

          {error && (
            <div
              className="gba:flex gba:items-center gba:justify-between gba:rounded-xl gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:px-4 gba:py-3 gba:text-sm gba:text-destructive"
              role="alert"
            >
              <span>{error}</span>
              <Button variant="link" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          )}

          {isLoading ? (
            <div
              className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-3 gba:py-24"
              data-testid="workforce-loading"
            >
              <SpinnerGapIcon className="gba:h-7 gba:w-7 gba:animate-spin gba:text-muted-foreground" />
              <p className="gba:text-sm gba:text-muted-foreground">Loading your workforce…</p>
            </div>
          ) : isAIMatching ? (
            <AIMatchResults
              query={aiQuery ?? ''}
              results={aiResults}
              activeAgentIds={activeAgents.map(a => a.id)}
              activatingAgentId={activatingAgentId}
              archivingAgentId={archivingAgentId}
              onActivate={activate}
              onArchive={archive}
              onConfigure={setConfiguringAgent}
            />
          ) : filtered.length === 0 ? (
            <EmptyState hasAgents={counts.total > 0} search={search} onHireAgent={() => setCreateOpen(true)} />
          ) : (
            <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:md:grid-cols-2 gba:xl:grid-cols-3">
              {filtered.map(agent => {
                const status = resolveTileStatus(agent)
                return (
                  <WorkforceAgentTile
                    key={`${status}-${agent.id}`}
                    agent={agent}
                    status={status}
                    isActivating={activatingAgentId === agent.id}
                    isArchiving={archivingAgentId === agent.id}
                    onActivate={activate}
                    onArchive={archive}
                    onConfigure={
                      status === 'active' && activeAgents.some(a => a.id === agent.id) ? setConfiguringAgent : undefined
                    }
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      {createOpen && (
        <CreateAgentModal
          open={createOpen}
          client={client}
          accessToken={accessToken}
          onClose={() => setCreateOpen(false)}
          onCreated={refetch}
        />
      )}
    </div>
  )
}

interface AIMatchResultsProps {
  query: string
  results: ReturnType<typeof rankAgents>
  activeAgentIds: string[]
  activatingAgentId: string | null
  archivingAgentId: string | null
  onActivate: (agent: FabricAgent) => Promise<void>
  onArchive: (agent: FabricAgent) => Promise<void>
  onConfigure: (agent: FabricAgent) => void
}

const AIMatchResults: React.FC<AIMatchResultsProps> = ({
  query,
  results,
  activeAgentIds,
  activatingAgentId,
  archivingAgentId,
  onActivate,
  onArchive,
  onConfigure
}) => {
  if (results.length === 0) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-3 gba:rounded-2xl gba:border gba:border-dashed gba:border-border gba:bg-card/50 gba:py-16 gba:text-center"
        data-testid="workforce-ai-no-results"
      >
        <div className="gba:flex gba:h-10 gba:w-10 gba:items-center gba:justify-center gba:rounded-lg gba:bg-muted/40">
          <SparkleIcon className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
        </div>
        <p className="gba:text-sm gba:font-medium gba:text-foreground">No agent matches that task yet</p>
        <p className="gba:max-w-md gba:text-xs gba:text-muted-foreground">
          Try rephrasing or describe the task in different words.
        </p>
      </div>
    )
  }

  return (
    <div data-testid="workforce-ai-results">
      <div className="gba:mb-3 gba:flex gba:items-center gba:gap-1.5">
        <SparkleIcon className="gba:h-3.5 gba:w-3.5 gba:text-foreground" weight="fill" />
        <p className="gba:text-xs gba:text-muted-foreground">
          Best matches for <span className="gba:font-medium gba:text-foreground">“{query}”</span>
        </p>
      </div>
      <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:md:grid-cols-2 gba:xl:grid-cols-3">
        {results.map((match, index) => {
          const agent = match.agent
          const status = resolveTileStatus(agent)
          return (
            <WorkforceAgentTile
              key={`ai-${agent.id}`}
              agent={agent}
              status={status}
              matchConfidence={match.confidence}
              matchRank={index + 1}
              isActivating={activatingAgentId === agent.id}
              isArchiving={archivingAgentId === agent.id}
              onActivate={onActivate}
              onArchive={onArchive}
              onConfigure={status === 'active' && activeAgentIds.includes(agent.id) ? onConfigure : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}

interface EmptyStateProps {
  hasAgents: boolean
  search: string
  onHireAgent: () => void
}

const EmptyState: React.FC<EmptyStateProps> = ({ hasAgents, search, onHireAgent }) => {
  if (search) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-3 gba:py-24 gba:text-center"
        data-testid="workforce-empty-search"
      >
        <div className="gba:flex gba:h-10 gba:w-10 gba:items-center gba:justify-center gba:rounded-lg gba:bg-muted/40">
          <UsersThreeIcon className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
        </div>
        <p className="gba:text-sm gba:font-medium gba:text-foreground">No agents match your search</p>
        <p className="gba:text-xs gba:text-muted-foreground">Try a different keyword or clear the filter.</p>
      </div>
    )
  }

  if (!hasAgents) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-4 gba:rounded-2xl gba:border gba:border-dashed gba:border-border gba:bg-card/50 gba:py-20 gba:px-6 gba:text-center"
        data-testid="workforce-empty"
      >
        <div className="gba:flex gba:h-12 gba:w-12 gba:items-center gba:justify-center gba:rounded-xl gba:bg-muted/40">
          <SparkleIcon className="gba:h-6 gba:w-6 gba:text-muted-foreground" />
        </div>
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">Build your AI workforce</h3>
          <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground gba:max-w-md">
            Hire your first specialist to start orchestrating work.
          </p>
        </div>
        <Button onClick={onHireAgent} data-testid="workforce-empty-cta">
          Hire your first agent
        </Button>
      </div>
    )
  }

  return (
    <div
      className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2 gba:py-20 gba:text-center"
      data-testid="workforce-empty-filter"
    >
      <p className="gba:text-sm gba:font-medium gba:text-foreground">Nothing here yet</p>
      <p className="gba:text-xs gba:text-muted-foreground">Switch the filter above to see other agents.</p>
    </div>
  )
}
