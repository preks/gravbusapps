// Recovery view for soft-deleted Workforce Agents.
//
// Pure presentation - the agent list, loading/error state and restore
// mutation come from useArchivedWorkforceAgents. The parent screen
// owns the "Active vs Archived" toggle and renders this in place of
// the regular grid.

import { Button } from '@newwork/nw-design-system'
import { ArchiveIcon, ArrowCounterClockwiseIcon, ArrowsClockwiseIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import React from 'react'
import { formatTimestamp } from './runDisplay'
import type { WorkforceAgent } from './workforceTypes'

export interface ArchivedAgentsPanelProps {
  agents: WorkforceAgent[]
  isLoading: boolean
  isRestoring: string | null
  errorMessage?: string | null
  onRefresh: () => void
  onRestore: (agent: WorkforceAgent) => void
}

export const ArchivedAgentsPanel: React.FC<ArchivedAgentsPanelProps> = ({
  agents,
  isLoading,
  isRestoring,
  errorMessage,
  onRefresh,
  onRestore
}) => {
  return (
    <section
      className="gba:rounded-2xl gba:border gba:border-border/60 gba:bg-card gba:p-5 gba:shadow-sm"
      data-testid="workforce-archived-panel"
    >
      <header className="gba:mb-4 gba:flex gba:items-start gba:justify-between gba:gap-3">
        <div>
          <h2 className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-semibold gba:text-foreground">
            <ArchiveIcon className="gba:h-4 gba:w-4" />
            Archived agents
          </h2>
          <p className="gba:mt-0.5 gba:text-xs gba:text-muted-foreground">
            Soft-deleted workforce agents. Restoring brings them back paused so you can review before re-activating.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="gba:inline-flex gba:h-8 gba:items-center gba:justify-center gba:gap-1.5 gba:rounded-md gba:border gba:border-border gba:bg-background gba:px-2.5 gba:text-xs gba:font-medium gba:text-foreground gba:hover:bg-muted/60 gba:disabled:cursor-not-allowed gba:disabled:opacity-50"
          data-testid="workforce-archived-refresh"
          aria-label="Refresh archived agents"
        >
          {isLoading ? (
            <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
          ) : (
            <ArrowsClockwiseIcon className="gba:h-3.5 gba:w-3.5" />
          )}
          Refresh
        </button>
      </header>

      {errorMessage && (
        <div
          className="gba:mb-3 gba:rounded-lg gba:border gba:border-destructive/40 gba:bg-destructive/5 gba:px-3 gba:py-2 gba:text-xs gba:text-destructive"
          role="alert"
          data-testid="workforce-archived-error"
        >
          {errorMessage}
        </div>
      )}

      {isLoading && agents.length === 0 ? (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-10 gba:text-muted-foreground">
          <SpinnerGapIcon className="gba:mr-2 gba:h-4 gba:w-4 gba:animate-spin" />
          <span className="gba:text-sm">Loading archived agents…</span>
        </div>
      ) : agents.length === 0 ? (
        <div
          className="gba:rounded-lg gba:border gba:border-dashed gba:border-border gba:bg-muted/30 gba:px-4 gba:py-8 gba:text-center"
          data-testid="workforce-archived-empty"
        >
          <p className="gba:text-sm gba:font-medium gba:text-foreground">No archived agents</p>
          <p className="gba:mt-1 gba:text-xs gba:text-muted-foreground">
            When you archive an agent it shows up here so you can restore it.
          </p>
        </div>
      ) : (
        <ul className="gba:divide-y gba:divide-border/60">
          {agents.map(agent => {
            const profile = agent.workforce_profile
            const archivedAt = profile.archived_at ?? agent.updated_at
            const busy = isRestoring === agent.agent_id
            return (
              <li
                key={agent.agent_id}
                className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:py-3"
                data-testid={`workforce-archived-row-${agent.agent_id}`}
              >
                <div className="gba:min-w-0 gba:flex-1">
                  <p className="gba:truncate gba:text-sm gba:font-medium gba:text-foreground">
                    {agent.display_name || agent.name}
                  </p>
                  <p className="gba:mt-0.5 gba:truncate gba:text-xs gba:text-muted-foreground">
                    {profile.role || 'No role set'}
                    {profile.department ? ` · ${profile.department}` : ''}
                  </p>
                  <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">
                    Archived {formatTimestamp(archivedAt)}
                    {profile.archived_by_user_id ? ` by ${profile.archived_by_user_id}` : ''}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => onRestore(agent)}
                  data-testid={`workforce-archived-restore-${agent.agent_id}`}
                >
                  {busy ? (
                    <SpinnerGapIcon className="gba:mr-1 gba:h-3.5 gba:w-3.5 gba:animate-spin" />
                  ) : (
                    <ArrowCounterClockwiseIcon className="gba:mr-1 gba:h-3.5 gba:w-3.5" />
                  )}
                  {busy ? 'Restoring…' : 'Restore'}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
