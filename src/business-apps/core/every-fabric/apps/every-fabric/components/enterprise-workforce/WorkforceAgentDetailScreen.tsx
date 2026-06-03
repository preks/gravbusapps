// Phase A: per-agent detail screen (the new entry point invoked by
// EnterpriseWorkforceScreen when a `?agentId=` URL is present).
//
// Owns:
//   * Agent + triggers loading (via useWorkforceAgentConfig).
//   * Tab routing (Overview / Runs / Inbox / Trace / Config).
//   * Test-run modal + run-detail drawer (shared across tabs).
//
// Tabs are kept dumb — they consume their own hooks and emit
// callbacks. URL state is the single source of truth for
// `tab` and `runId`, so deep-linking and back/forward Just Work.

import { ArrowLeftIcon, CircleNotchIcon, FlaskIcon, WarningIcon } from '@phosphor-icons/react'
import React, { useCallback, useState } from 'react'
import { useWorkforceAgentConfig } from './useWorkforceAgentConfig'
import { useWorkforceLiveActivity } from './useWorkforceLiveActivity'
import { useWorkforceRuns } from './useWorkforceRuns'
import { LiveActivityFeed } from './LiveActivityFeed'
import { TestRunModal } from './TestRunModal'
import { AgentConfigTab } from './agent-detail/tabs/AgentConfigTab'
import { AgentInboxTab } from './agent-detail/tabs/AgentInboxTab'
import { AgentOverviewTab } from './agent-detail/tabs/AgentOverviewTab'
import { AgentRunsTab } from './agent-detail/tabs/AgentRunsTab'
import { AgentTraceTab } from './agent-detail/tabs/AgentTraceTab'
import type { WorkforceDetailTab } from './useWorkforceUrlState'
import type { WorkforceRun } from './workforceTypes'

export interface WorkforceAgentDetailScreenProps {
  accessToken: string
  agentId: string
  tab: WorkforceDetailTab
  runId: string | null
  onBack: () => void
  onChangeTab: (tab: WorkforceDetailTab) => void
  onSelectRun: (runId: string | null) => void
}

interface TabDefinition {
  id: WorkforceDetailTab
  label: string
  testId: string
}

const TABS: ReadonlyArray<TabDefinition> = [
  { id: 'overview', label: 'Overview', testId: 'workforce-detail-tab-overview' },
  { id: 'runs', label: 'Runs', testId: 'workforce-detail-tab-runs' },
  { id: 'inbox', label: 'Inbox', testId: 'workforce-detail-tab-inbox' },
  { id: 'trace', label: 'Trace', testId: 'workforce-detail-tab-trace' },
  { id: 'config', label: 'Config', testId: 'workforce-detail-tab-config' }
]

export const WorkforceAgentDetailScreen: React.FC<WorkforceAgentDetailScreenProps> = ({
  accessToken,
  agentId,
  tab,
  runId,
  onBack,
  onChangeTab,
  onSelectRun
}) => {
  const {
    agent,
    triggers,
    isLoading,
    error,
    savingSection,
    pendingTriggerId,
    saveSection,
    createTrigger,
    updateTrigger,
    deleteTrigger,
    clearError
  } = useWorkforceAgentConfig({ accessToken, agentId })

  const {
    runs,
    isLoading: runsLoading,
    isPolling: runsPolling,
    error: runsError,
    isStarting,
    refetch: refetchRuns,
    startRun,
    clearError: clearRunsError
  } = useWorkforceRuns({ accessToken, agentId, pageSize: 5 })

  // Live activity for this agent, streamed across all its in-flight runs.
  const liveActivity = useWorkforceLiveActivity(accessToken)
  const liveAgentRuns = liveActivity.runsByAgent.get(agentId) ?? []

  const [isTestRunOpen, setIsTestRunOpen] = useState(false)

  const openTestRun = useCallback(() => {
    clearRunsError()
    setIsTestRunOpen(true)
  }, [clearRunsError])

  const closeTestRun = useCallback(() => setIsTestRunOpen(false), [])

  // Opening a run (started, picked from a list, or the live feed) deep-links to
  // the full-screen run detail via the shared `runId` URL state.
  const handleStartRun = useCallback(
    async (input: { input: string; trigger_id?: string | null }) => {
      const created = await startRun(input)
      onSelectRun(created.session_id)
      return created
    },
    [startRun, onSelectRun]
  )

  const handleOpenRun = useCallback(
    (run: WorkforceRun) => {
      onSelectRun(run.session_id)
    },
    [onSelectRun]
  )

  const handleRefreshRecentRuns = useCallback(() => {
    void refetchRuns()
  }, [refetchRuns])

  const handleOpenTrace = useCallback(
    (run: WorkforceRun) => {
      onSelectRun(run.session_id)
    },
    [onSelectRun]
  )

  const handleOpenLiveRun = useCallback(
    (sessionId: string) => {
      onSelectRun(sessionId)
    },
    [onSelectRun]
  )

  return (
    <div className="gba:flex gba:h-full gba:flex-col gba:overflow-hidden" data-testid="workforce-detail-screen">
      <header className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:border-b gba:border-border gba:bg-card gba:px-6 gba:py-3">
        <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to workforce"
            className="gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-md gba:text-muted-foreground gba:hover:bg-muted/60 gba:hover:text-foreground"
            data-testid="workforce-detail-back"
          >
            <ArrowLeftIcon className="gba:h-4 gba:w-4" />
          </button>
          <div className="gba:min-w-0">
            <h2
              className="gba:truncate gba:text-sm gba:font-semibold gba:text-foreground"
              data-testid="workforce-detail-title"
            >
              {agent ? agent.display_name : 'Loading agent…'}
            </h2>
            {agent && (
              <p className="gba:truncate gba:text-[11px] gba:text-muted-foreground">
                {agent.workforce_profile.role || 'No role set'}
                {agent.workforce_profile.department ? ` · ${agent.workforce_profile.department}` : ''}
              </p>
            )}
          </div>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <span
            className={`gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium ${
              agent?.status === 'active'
                ? 'gba:bg-emerald-50 gba:text-emerald-700'
                : 'gba:bg-muted gba:text-muted-foreground'
            }`}
            data-testid="workforce-detail-status"
          >
            {agent?.status ?? '—'}
          </span>
          {agent && (
            <button
              type="button"
              onClick={openTestRun}
              className="gba:inline-flex gba:h-8 gba:items-center gba:gap-1.5 gba:rounded-md gba:bg-primary gba:px-3 gba:text-xs gba:font-medium gba:text-primary-foreground gba:hover:bg-primary/90"
              data-testid="workforce-detail-test-run"
            >
              <FlaskIcon className="gba:h-3.5 gba:w-3.5" />
              Test run
            </button>
          )}
        </div>
      </header>

      <nav
        className="gba:flex gba:gap-1 gba:border-b gba:border-border gba:bg-card/40 gba:px-6"
        data-testid="workforce-detail-tabs"
        role="tablist"
      >
        {TABS.map(tabDef => {
          const isActive = tab === tabDef.id
          return (
            <button
              key={tabDef.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChangeTab(tabDef.id)}
              className={`gba:relative gba:px-3 gba:py-2 gba:text-xs gba:font-medium gba:transition-colors ${
                isActive ? 'gba:text-foreground' : 'gba:text-muted-foreground gba:hover:text-foreground'
              }`}
              data-testid={tabDef.testId}
            >
              {tabDef.label}
              {isActive && (
                <span
                  className="gba:absolute gba:inset-x-2 gba:-bottom-px gba:h-0.5 gba:rounded-full gba:bg-primary"
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </nav>

      <div className="gba:flex-1 gba:overflow-y-auto gba:bg-background">
        <div className="gba:mx-auto gba:flex gba:max-w-6xl gba:gap-6 gba:px-6 gba:py-6">
          <div className="gba:min-w-0 gba:flex-1">
            {error && (
              <div
                className="gba:mb-4 gba:flex gba:items-start gba:gap-2 gba:rounded-lg gba:border gba:border-destructive/40 gba:bg-destructive/5 gba:px-3 gba:py-2 gba:text-xs gba:text-destructive"
                data-testid="workforce-detail-error"
              >
                <WarningIcon className="gba:mt-0.5 gba:h-4 gba:w-4" />
                <div className="gba:flex-1">{error}</div>
                <button
                  type="button"
                  onClick={clearError}
                  className="gba:text-destructive gba:hover:underline"
                  data-testid="workforce-detail-error-dismiss"
                >
                  Dismiss
                </button>
              </div>
            )}

            {isLoading && !agent && (
              <div
                className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground"
                data-testid="workforce-detail-loading"
              >
                <CircleNotchIcon className="gba:h-4 gba:w-4 gba:animate-spin" />
                Loading workforce agent…
              </div>
            )}

            {agent && tab === 'overview' && (
              <AgentOverviewTab
                accessToken={accessToken}
                agentId={agentId}
                recentRuns={{
                  runs,
                  isLoading: runsLoading,
                  isPolling: runsPolling,
                  error: runsError,
                  onRefresh: handleRefreshRecentRuns
                }}
                onOpenRun={handleOpenRun}
                onTestRun={openTestRun}
                onViewAllRuns={() => onChangeTab('runs')}
              />
            )}
            {agent && tab === 'runs' && (
              <AgentRunsTab
                accessToken={accessToken}
                agentId={agentId}
                onOpenRun={handleOpenRun}
                onOpenTrace={handleOpenTrace}
              />
            )}
            {agent && tab === 'inbox' && (
              <AgentInboxTab
                accessToken={accessToken}
                agentId={agentId}
                onOpenRun={handleOpenRun}
                onOpenTrace={handleOpenTrace}
              />
            )}
            {agent && tab === 'trace' && (
              <AgentTraceTab accessToken={accessToken} agentId={agentId} runId={runId} onSelectRun={onSelectRun} />
            )}
            {agent && tab === 'config' && (
              <AgentConfigTab
                agent={agent}
                accessToken={accessToken}
                triggers={triggers}
                savingSection={savingSection}
                pendingTriggerId={pendingTriggerId}
                saveSection={saveSection}
                createTrigger={createTrigger}
                updateTrigger={updateTrigger}
                deleteTrigger={deleteTrigger}
              />
            )}
          </div>

          {liveAgentRuns.length > 0 && (
            <aside className="gba:hidden gba:w-72 gba:shrink-0 gba:lg:block">
              <div className="gba:sticky gba:top-0">
                <LiveActivityFeed
                  runs={liveAgentRuns}
                  isConnected={liveActivity.isConnected}
                  onOpenRun={handleOpenLiveRun}
                />
              </div>
            </aside>
          )}
        </div>
      </div>

      {agent && (
        <TestRunModal
          open={isTestRunOpen}
          agent={agent}
          triggers={triggers}
          isStarting={isStarting}
          errorMessage={runsError}
          onClose={closeTestRun}
          onSubmit={handleStartRun}
        />
      )}
    </div>
  )
}
