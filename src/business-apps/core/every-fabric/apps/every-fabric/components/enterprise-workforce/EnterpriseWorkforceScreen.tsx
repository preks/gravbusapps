// Workforce Agents overview screen.
//
// Replaces the previous "enterprise-agent discovery" view. This screen is
// now focused on Workforce Agents (AutonomousAgentODM records with the
// "workforce" surface). Two browsing modes:
//
//   1. Default browse mode - hero + KPIs + (collapsed) AI trigger +
//      All / Active / Paused filter + employee card grid.
//   2. AI find-me-an-agent mode - when the user submits a task
//      description in the expanded composer, the grid switches to ranked
//      Workforce Agent matches.
//
// Detailed agent configuration lives in the dedicated
// WorkforceAgentConfigView; clicking Configure on a tile navigates into
// it and back via the Workforce header.

import { Button } from '@newwork/nw-design-system'
import { ArchiveIcon, ArrowLeftIcon, SparkleIcon, SpinnerGapIcon, UsersThreeIcon } from '@phosphor-icons/react'
import React, { useCallback, useMemo, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { ArchivedAgentsPanel } from './ArchivedAgentsPanel'
import { ConfirmActionModal } from './ConfirmActionModal'
import { HireOptionsDialog } from './HireOptionsDialog'
import { HireWorkforceAgentModal, type HireWorkforceAgentFormState } from './HireWorkforceAgentModal'
import { AgentMarketplaceModal } from './marketplace/AgentMarketplaceModal'
import type { MarketplaceAgentTemplate } from './marketplace/marketplaceAgents'
import { LiveCommandCenter } from './command-center/LiveCommandCenter'
import { RunDetailScreen } from './run-detail/RunDetailScreen'
import { ValueScoreboard } from './value/ValueScoreboard'
import { WorkforceInsightsRow } from './WorkforceInsightsRow'
import { WorkforceAIComposer } from './WorkforceAIComposer'
import { WorkforceAgentDetailScreen } from './WorkforceAgentDetailScreen'
import { WorkforceFilters } from './WorkforceFilters'
import { WorkforceHero } from './WorkforceHero'
// Temporarily hidden from the UI.
// import { GlassWorkforceSphere } from './glass-sphere/GlassWorkforceSphere'
import { rankAgents, type RankableAgent } from './agentMatching'
import { useArchivedWorkforceAgents } from './useArchivedWorkforceAgents'
import { useWorkforceData, type WorkforceAgentSummary, type WorkforceFilter } from './useWorkforceData'
import { useWorkforceLiveActivity } from './useWorkforceLiveActivity'
import { useWorkforceUrlState } from './useWorkforceUrlState'
import { WorkforceDeck, type DeckMatchInfo } from './deck/WorkforceDeck'
import { TestWebhookModal } from './TestWebhookModal'
import { notifyWebhookDispatchResult } from './workforceWebhookDispatch'
import type { WorkforceAgent } from './workforceTypes'

type WorkforceView = 'active' | 'archived'

// Hire flow steps: closed → chooser → (marketplace) → create. The marketplace
// path stores the chosen template so the create dialog opens prefilled.
type HireFlow = 'closed' | 'chooser' | 'marketplace' | 'create'

interface EnterpriseWorkforceScreenProps {
  accessToken: string
  onBack: () => void
  /** When true, show developer-only tools such as Test webhook. */
  devModeEnabled?: boolean
}

/** Maximum number of ranked agents to show when an AI query is active. */
const MAX_AI_MATCHES = 9

function templateToFormState(template: MarketplaceAgentTemplate): Partial<HireWorkforceAgentFormState> {
  const { createInput } = template
  return {
    displayName: template.displayName,
    role: createInput.role ?? template.role,
    department: createInput.department ?? template.department,
    description: createInput.description ?? template.tagline,
    instructions: createInput.instructions ?? '',
    autonomyLevel: createInput.autonomy_level ?? 'approval_required'
  }
}

function toRankable(summary: WorkforceAgentSummary): RankableAgent & { __summary: WorkforceAgentSummary } {
  const { agent } = summary
  const profile = agent.workforce_profile
  return {
    id: agent.agent_id,
    name: `${agent.display_name || agent.name} ${profile.role}`.trim(),
    specialty: profile.role || agent.domain,
    domain: agent.domain,
    description: `${agent.description} ${profile.instructions}`.trim(),
    tags: [...agent.tags, profile.role, profile.department ?? ''].filter(Boolean),
    __summary: summary
  }
}

export const EnterpriseWorkforceScreen: React.FC<EnterpriseWorkforceScreenProps> = ({
  accessToken,
  onBack,
  devModeEnabled = false
}) => {
  const client = usePromptManagerClient(accessToken)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<WorkforceFilter>('all')
  const [aiQuery, setAiQuery] = useState<string | null>(null)
  const [hireFlow, setHireFlow] = useState<HireFlow>('closed')
  const [hireTemplate, setHireTemplate] = useState<MarketplaceAgentTemplate | null>(null)
  const {
    agentId: urlAgentId,
    tab: urlTab,
    runId: urlRunId,
    setAgent: setUrlAgent,
    setTab: setUrlTab,
    setRun: setUrlRun,
    updateUrl
  } = useWorkforceUrlState()
  const [view, setView] = useState<WorkforceView>('active')
  const [pendingArchive, setPendingArchive] = useState<WorkforceAgent | null>(null)
  const [archiveError, setArchiveError] = useState<string | null>(null)

  const [isTestWebhookOpen, setIsTestWebhookOpen] = useState(false)
  const [isDispatchingWebhook, setIsDispatchingWebhook] = useState(false)
  const [webhookError, setWebhookError] = useState<string | null>(null)

  const {
    isLoading,
    error,
    counts,
    filtered,
    agents,
    webhookOptions,
    refetch,
    activate,
    pause,
    archive,
    activatingAgentId,
    pausingAgentId,
    archivingAgentId
  } = useWorkforceData({ accessToken, filter, search })

  const {
    agents: archivedAgents,
    isLoading: archivedLoading,
    isRestoring: archivedRestoring,
    error: archivedError,
    refetch: refetchArchived,
    restore: restoreArchived
  } = useArchivedWorkforceAgents({ accessToken, enabled: view === 'archived' })

  // Live "who is working now" activity, streamed for the whole workforce.
  // Only active while browsing the active list and not in AI-matching mode.
  const liveActivity = useWorkforceLiveActivity(accessToken, '', view === 'active' && !urlAgentId)

  const aiResults = useMemo(() => {
    if (!aiQuery) return []
    const rankablePool = agents.map(toRankable)
    return rankAgents(rankablePool, aiQuery).slice(0, MAX_AI_MATCHES)
  }, [aiQuery, agents])

  const isAIMatching = aiQuery !== null

  // Ordered summaries the deck renders: ranked AI matches when a query is
  // active, otherwise the filtered active/paused list.
  const aiSummaries = useMemo(() => aiResults.map(match => match.agent.__summary), [aiResults])
  const aiMatchById = useMemo(() => {
    const map: Record<string, DeckMatchInfo> = {}
    aiResults.forEach((match, index) => {
      map[match.agent.__summary.agent.agent_id] = { rank: index + 1, confidence: match.confidence }
    })
    return map
  }, [aiResults])

  const deckSummaries = isAIMatching ? aiSummaries : filtered

  // Active agents drive the 3D glass sphere showpiece on the overview.
  // Temporarily hidden from the UI.
  // const activeSummaries = useMemo(() => agents.filter(summary => summary.agent.status === 'active'), [agents])

  // Stable id -> display name lookup for the live strip + per-agent charts.
  const nameById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const summary of agents) {
      map[summary.agent.agent_id] = summary.agent.display_name || summary.agent.name
    }
    return map
  }, [agents])

  const handleConfigure = (agent: WorkforceAgent) => {
    setUrlAgent(agent.agent_id)
  }

  const handleConfigBack = () => {
    setUrlAgent(null)
    void refetch()
  }

  const handleHireSuccess = () => {
    void refetch()
  }

  const openHireChooser = useCallback(() => {
    setHireTemplate(null)
    setHireFlow('chooser')
  }, [])

  const closeHireFlow = useCallback(() => {
    setHireFlow('closed')
    setHireTemplate(null)
  }, [])

  const handleHireFromMarketplace = useCallback((template: MarketplaceAgentTemplate) => {
    setHireTemplate(template)
    setHireFlow('create')
  }, [])

  // Two-step archive: requesting opens the confirm modal; only ``confirm``
  // actually hits the backend. Keeps the destructive call gated and lets
  // the user back out without state mutations.
  const requestArchive = useCallback(async (agent: WorkforceAgent) => {
    setArchiveError(null)
    setPendingArchive(agent)
  }, [])

  const cancelArchive = useCallback(() => {
    if (archivingAgentId) return
    setPendingArchive(null)
    setArchiveError(null)
  }, [archivingAgentId])

  const confirmArchive = useCallback(async () => {
    if (!pendingArchive) return
    setArchiveError(null)
    try {
      await archive(pendingArchive)
      setPendingArchive(null)
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : 'Failed to archive agent.')
    }
  }, [archive, pendingArchive])

  const openTestWebhook = useCallback(() => {
    setWebhookError(null)
    setIsTestWebhookOpen(true)
  }, [])

  const closeTestWebhook = useCallback(() => {
    setIsTestWebhookOpen(false)
    setWebhookError(null)
  }, [])

  const handleDispatchTestWebhook = useCallback(
    async (triggerId: string, payload: { subject: string; body: string }) => {
      setIsDispatchingWebhook(true)
      setWebhookError(null)
      try {
        const result = await client.dispatchWorkforceTestWebhook(triggerId, payload)
        const option = webhookOptions.find(item => item.triggerId === triggerId)
        notifyWebhookDispatchResult(result, sessionId => {
          if (option) {
            setUrlAgent(option.agentId)
            setUrlTab('runs')
            setUrlRun(sessionId)
          }
        })
        void refetch()
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send webhook.'
        setWebhookError(message)
        throw err
      } finally {
        setIsDispatchingWebhook(false)
      }
    },
    [client, refetch, setUrlAgent, setUrlRun, setUrlTab, webhookOptions]
  )

  const handleRestore = useCallback(
    async (agent: WorkforceAgent) => {
      try {
        await restoreArchived(agent)
        // Refresh the active list so the restored (paused) agent reappears
        // without the user having to switch view manually.
        void refetch()
      } catch {
        // useArchivedWorkforceAgents already captured the error
      }
    },
    [refetch, restoreArchived]
  )

  // A selected run takes over the whole screen (deep-linked via `?runId=`).
  // Back clears the run id, returning to the agent context (or overview).
  if (urlRunId) {
    return (
      <RunDetailScreen runId={urlRunId} accessToken={accessToken} nameById={nameById} onBack={() => setUrlRun(null)} />
    )
  }

  if (urlAgentId) {
    return (
      <WorkforceAgentDetailScreen
        accessToken={accessToken}
        agentId={urlAgentId}
        tab={urlTab}
        runId={urlRunId}
        devModeEnabled={devModeEnabled}
        onBack={handleConfigBack}
        onChangeTab={setUrlTab}
        onSelectRun={setUrlRun}
      />
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid="enterprise-workforce-screen">
      <div className="gba:shrink-0 gba:border-b gba:border-border/60 gba:bg-card/30 gba:backdrop-blur">
        <div className="gba:mx-auto gba:flex gba:max-w-screen-2xl gba:items-center gba:gap-3 gba:px-6 gba:py-3 gba:lg:px-10">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="gba:inline-flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-lg gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
            data-testid="workforce-back-button"
          >
            <ArrowLeftIcon className="gba:h-5 gba:w-5" />
          </button>
          <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">Digital Workforce</span>
          <div className="gba:ml-auto gba:inline-flex gba:rounded-md gba:border gba:border-border gba:bg-background gba:p-0.5">
            <button
              type="button"
              onClick={() => setView('active')}
              className={`gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded gba:px-3 gba:py-1 gba:text-xs gba:font-medium gba:transition-colors ${
                view === 'active'
                  ? 'gba:bg-muted gba:text-foreground'
                  : 'gba:text-muted-foreground gba:hover:text-foreground'
              }`}
              data-testid="workforce-view-active"
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setView('archived')}
              className={`gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded gba:px-3 gba:py-1 gba:text-xs gba:font-medium gba:transition-colors ${
                view === 'archived'
                  ? 'gba:bg-muted gba:text-foreground'
                  : 'gba:text-muted-foreground gba:hover:text-foreground'
              }`}
              data-testid="workforce-view-archived"
            >
              <ArchiveIcon className="gba:h-3.5 gba:w-3.5" />
              Archived
            </button>
          </div>
        </div>
      </div>

      {view === 'active' ? (
        <div className="gba:flex gba:min-h-0 gba:flex-1 gba:flex-col gba:lg:flex-row">
          <div className="gba:min-w-0 gba:flex-1 gba:overflow-y-auto">
            <div className="gba:mx-auto gba:flex gba:max-w-screen-2xl gba:flex-col gba:gap-6 gba:px-6 gba:py-8 gba:lg:px-10">
              <WorkforceHero
                counts={counts}
                onHireAgent={openHireChooser}
                onTestWebhook={devModeEnabled ? openTestWebhook : undefined}
                canTestWebhook={devModeEnabled && webhookOptions.length > 0}
                workingNow={liveActivity.workingAgentIds.size}
              />

              {/* Temporarily hidden from the UI.
              {!isAIMatching && activeSummaries.length > 0 && (
                <GlassWorkforceSphere summaries={activeSummaries} isAgentWorking={liveActivity.isAgentWorking} />
              )}
              */}

              <div className="gba:flex gba:flex-col gba:gap-6">
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
                    data-testid="workforce-error"
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
                ) : isAIMatching && aiSummaries.length === 0 ? (
                  <AINoResults />
                ) : !isAIMatching && filtered.length === 0 ? (
                  <EmptyState hasAgents={counts.total > 0} search={search} onHire={openHireChooser} />
                ) : (
                  <WorkforceDeck
                    summaries={deckSummaries}
                    isAgentWorking={liveActivity.isAgentWorking}
                    currentActivityForAgent={agentId => liveActivity.activeRunForAgent(agentId)?.current_activity}
                    matchById={isAIMatching ? aiMatchById : undefined}
                    aiQuery={aiQuery ?? undefined}
                    activatingAgentId={activatingAgentId}
                    pausingAgentId={pausingAgentId}
                    archivingAgentId={archivingAgentId}
                    onActivate={activate}
                    onPause={pause}
                    onArchive={requestArchive}
                    onConfigure={handleConfigure}
                  />
                )}

                {!isAIMatching && <ValueScoreboard accessToken={accessToken} />}

                {!isAIMatching && <WorkforceInsightsRow accessToken={accessToken} nameById={nameById} />}
              </div>
            </div>
          </div>

          {!isAIMatching && (
            <aside
              className="gba:order-last gba:flex gba:shrink-0 gba:flex-col gba:border-t gba:border-border/60 gba:bg-muted/20 gba:lg:order-none gba:lg:w-80 gba:lg:border-t-0 gba:lg:border-l gba:lg:overflow-y-auto"
              data-testid="workforce-command-center-sidebar"
            >
              <LiveCommandCenter
                variant="sidebar"
                feed={liveActivity.feed}
                overview={liveActivity.overview}
                completedToday={liveActivity.completedToday}
                throughputBuckets={liveActivity.throughputBuckets}
                isConnected={liveActivity.isConnected}
                nameById={nameById}
                onOpenRun={(agentId, runId) => updateUrl({ agentId, tab: 'runs', runId })}
              />
            </aside>
          )}
        </div>
      ) : (
        <div className="gba:flex-1 gba:overflow-y-auto">
          <div className="gba:mx-auto gba:flex gba:max-w-screen-2xl gba:flex-col gba:gap-6 gba:px-6 gba:py-8 gba:lg:px-10">
            <ArchivedAgentsPanel
              agents={archivedAgents}
              isLoading={archivedLoading}
              isRestoring={archivedRestoring}
              errorMessage={archivedError}
              onRefresh={() => void refetchArchived()}
              onRestore={handleRestore}
            />
          </div>
        </div>
      )}

      <HireOptionsDialog
        open={hireFlow === 'chooser'}
        onClose={closeHireFlow}
        onChooseMarketplace={() => setHireFlow('marketplace')}
        onChooseCreate={() => {
          setHireTemplate(null)
          setHireFlow('create')
        }}
      />

      <AgentMarketplaceModal
        open={hireFlow === 'marketplace'}
        onClose={closeHireFlow}
        onHire={handleHireFromMarketplace}
      />

      {hireFlow === 'create' && (
        <HireWorkforceAgentModal
          open
          client={client}
          onClose={closeHireFlow}
          onCreated={handleHireSuccess}
          initialValues={hireTemplate ? templateToFormState(hireTemplate) : undefined}
          tags={hireTemplate?.createInput.tags}
          title={hireTemplate ? `Hire ${hireTemplate.displayName}` : undefined}
          subtitle={
            hireTemplate ? 'Review and confirm. You can fine-tune triggers, skills and budget after hiring.' : undefined
          }
        />
      )}

      <ConfirmActionModal
        open={pendingArchive !== null}
        title="Archive this workforce agent?"
        description={
          pendingArchive ? (
            <>
              <strong className="gba:font-semibold gba:text-foreground">
                {pendingArchive.display_name || pendingArchive.name}
              </strong>{' '}
              will be paused and hidden from the workforce. Triggers stop firing immediately. You can restore the agent
              from the Archived view at any time.
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Archive agent"
        isBusy={archivingAgentId !== null}
        errorMessage={archiveError}
        onCancel={cancelArchive}
        onConfirm={confirmArchive}
        testIdPrefix="workforce-archive-confirm"
      />

      {devModeEnabled && (
        <TestWebhookModal
          open={isTestWebhookOpen}
          options={webhookOptions}
          isDispatching={isDispatchingWebhook}
          errorMessage={webhookError}
          onClose={closeTestWebhook}
          onSubmit={handleDispatchTestWebhook}
        />
      )}
    </div>
  )
}

const AINoResults: React.FC = () => (
  <div
    className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-3 gba:rounded-2xl gba:border gba:border-dashed gba:border-border gba:bg-card/50 gba:py-16 gba:text-center"
    data-testid="workforce-ai-no-results"
  >
    <div className="gba:flex gba:h-10 gba:w-10 gba:items-center gba:justify-center gba:rounded-lg gba:bg-muted/40">
      <SparkleIcon className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
    </div>
    <p className="gba:text-sm gba:font-medium gba:text-foreground">No workforce agent matches that task yet</p>
    <p className="gba:max-w-md gba:text-xs gba:text-muted-foreground">
      Try rephrasing, or hire a new specialist for this work.
    </p>
  </div>
)

interface EmptyStateProps {
  hasAgents: boolean
  search: string
  onHire: () => void
}

const EmptyState: React.FC<EmptyStateProps> = ({ hasAgents, search, onHire }) => {
  if (search) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-3 gba:py-24 gba:text-center"
        data-testid="workforce-empty-search"
      >
        <div className="gba:flex gba:h-10 gba:w-10 gba:items-center gba:justify-center gba:rounded-lg gba:bg-muted/40">
          <UsersThreeIcon className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
        </div>
        <p className="gba:text-sm gba:font-medium gba:text-foreground">No workforce agents match your search</p>
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
            Hire your first specialist - they will react to your triggers, follow your policies, and escalate when they
            need a human.
          </p>
        </div>
        <Button onClick={onHire} data-testid="workforce-empty-cta">
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
