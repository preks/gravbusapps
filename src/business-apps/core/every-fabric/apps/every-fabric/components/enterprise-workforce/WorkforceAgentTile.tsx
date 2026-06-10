// Workforce agent tile - employee-style card for the Workforce overview.
//
// Layout:
//   - Avatar block + name + role/department in the header.
//   - Status pill (Active / Paused) with a subtle dot on the avatar.
//   - Description below.
//   - Stats row: triggers · last run · credits this week.
//   - Action row: Pause/Activate · Archive.
//
// The whole card is clickable (opens the agent detail); the action buttons
// stop propagation so they keep their own behaviour.
//
// Designed to read like a row in an HR directory - the agent IS an employee.

import { Button } from '@newwork/nw-design-system'
import { ArchiveIcon, LightningIcon, PauseIcon, PlayIcon, PulseIcon, SparkleIcon } from '@phosphor-icons/react'
import React from 'react'
import type { WorkforceAgentSummary } from './useWorkforceData'
import { formatLastRunLabel } from './runDisplay'
import {
  avatarAccent,
  formatAgentName,
  resolveInitials,
  statusPill,
  type WorkforceTileStatus
} from './workforceAgentDisplay'
import type { WorkforceAgent } from './workforceTypes'

export type { WorkforceTileStatus }

interface WorkforceAgentTileProps {
  summary: WorkforceAgentSummary
  isActivating?: boolean
  isPausing?: boolean
  isArchiving?: boolean
  onActivate?: (agent: WorkforceAgent) => void
  onPause?: (agent: WorkforceAgent) => void
  onArchive?: (agent: WorkforceAgent) => void
  onConfigure?: (agent: WorkforceAgent) => void
  /** Optional 0-100 confidence shown as a corner badge when AI matching is active. */
  matchConfidence?: number
  /** Position 1-based within a ranked list. */
  matchRank?: number
  /** True when the agent currently has at least one in-flight run. */
  isWorking?: boolean
  /** Human-readable label of what the agent is doing right now. */
  currentActivity?: string | null
}

interface MatchBadgeProps {
  confidence: number
  rank?: number
}

const MatchBadge: React.FC<MatchBadgeProps> = ({ confidence, rank }) => {
  if (rank === 1) {
    return (
      <span className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:bg-foreground gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wider gba:text-background">
        <SparkleIcon className="gba:h-3 gba:w-3" weight="fill" />
        Best match
      </span>
    )
  }
  return (
    <span className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:bg-muted gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:text-muted-foreground">
      <SparkleIcon className="gba:h-3 gba:w-3" />
      {confidence}%
    </span>
  )
}

interface StatChipProps {
  icon: typeof LightningIcon
  label: string
  testId: string
}

const StatChip: React.FC<StatChipProps> = ({ icon: IconComponent, label, testId }) => (
  <span
    className="gba:inline-flex gba:items-center gba:gap-1 gba:text-[11px] gba:text-muted-foreground"
    data-testid={testId}
  >
    <IconComponent className="gba:h-3 gba:w-3" />
    {label}
  </span>
)

export const WorkforceAgentTile: React.FC<WorkforceAgentTileProps> = ({
  summary,
  isActivating = false,
  isPausing = false,
  isArchiving = false,
  onActivate,
  onPause,
  onArchive,
  onConfigure,
  matchConfidence,
  matchRank,
  isWorking = false,
  currentActivity
}) => {
  const { agent } = summary
  const profile = agent.workforce_profile
  const displayName = formatAgentName(agent.display_name || agent.name)
  // Accent comes from a DS-token palette keyed off the agent id so each agent
  // keeps a stable colour without hardcoded hex or inline styles.
  const accentClass = avatarAccent(agent.agent_id)
  const status: WorkforceTileStatus = agent.status === 'paused' ? 'paused' : 'active'
  const pill = statusPill(status)
  const isTopMatch = matchRank === 1
  const roleLabel = profile.role || agent.domain || 'Workforce specialist'
  const departmentLabel = profile.department ?? null
  const canOpen = Boolean(onConfigure)
  const handleOpen = () => onConfigure?.(agent)
  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!canOpen) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleOpen()
    }
  }

  return (
    <div
      className={`gba:group gba:relative gba:flex gba:flex-col gba:rounded-xl gba:border gba:bg-card gba:transition-colors gba:duration-150 ${
        isTopMatch ? 'gba:border-foreground/30' : 'gba:border-border gba:hover:border-foreground/20'
      } ${status === 'paused' ? 'gba:opacity-80' : ''} ${
        canOpen
          ? 'gba:cursor-pointer gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring'
          : ''
      }`}
      data-testid={`workforce-agent-tile-${agent.agent_id}`}
      role={canOpen ? 'button' : undefined}
      tabIndex={canOpen ? 0 : undefined}
      aria-label={canOpen ? `Open ${displayName}` : undefined}
      onClick={canOpen ? handleOpen : undefined}
      onKeyDown={canOpen ? handleCardKeyDown : undefined}
    >
      <div className="gba:flex gba:flex-1 gba:flex-col gba:p-4">
        {/* Header */}
        <div className="gba:flex gba:items-start gba:gap-3">
          <div className="gba:relative gba:shrink-0">
            <div
              className={`gba:flex gba:h-10 gba:w-10 gba:items-center gba:justify-center gba:rounded-lg gba:text-xs gba:font-semibold ${accentClass}`}
            >
              {resolveInitials(displayName)}
            </div>
            {status === 'active' && (
              <span aria-hidden className="gba:absolute gba:-bottom-0.5 gba:-right-0.5 gba:flex gba:h-2.5 gba:w-2.5">
                {isWorking && (
                  <span className="gba:absolute gba:inline-flex gba:h-full gba:w-full gba:animate-ping gba:rounded-full gba:bg-emerald-400" />
                )}
                <span className="gba:relative gba:inline-flex gba:h-2.5 gba:w-2.5 gba:rounded-full gba:border-2 gba:border-card gba:bg-emerald-500" />
              </span>
            )}
          </div>

          <div className="gba:flex-1 gba:min-w-0">
            <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
              <h3 className="gba:truncate gba:text-sm gba:font-semibold gba:text-foreground">{displayName}</h3>
              {matchConfidence !== undefined ? (
                <MatchBadge confidence={matchConfidence} rank={matchRank} />
              ) : isWorking ? (
                <span
                  className="gba:inline-flex gba:shrink-0 gba:items-center gba:gap-1 gba:rounded-full gba:bg-emerald-50 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:text-emerald-700"
                  data-testid={`workforce-agent-working-${agent.agent_id}`}
                >
                  <span className="gba:relative gba:flex gba:h-1.5 gba:w-1.5">
                    <span className="gba:absolute gba:inline-flex gba:h-full gba:w-full gba:animate-ping gba:rounded-full gba:bg-emerald-400" />
                    <span className="gba:relative gba:inline-flex gba:h-1.5 gba:w-1.5 gba:rounded-full gba:bg-emerald-500" />
                  </span>
                  Working
                </span>
              ) : (
                <span
                  className={`gba:shrink-0 gba:rounded-full gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium ${pill.className}`}
                  data-testid={`workforce-agent-status-${agent.agent_id}`}
                >
                  {pill.label}
                </span>
              )}
            </div>
            <p className="gba:mt-0.5 gba:truncate gba:text-xs gba:text-muted-foreground" title={roleLabel}>
              {roleLabel}
              {departmentLabel ? ` · ${departmentLabel}` : ''}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="gba:mt-3 gba:line-clamp-2 gba:min-h-[2.5rem] gba:text-sm gba:leading-relaxed gba:text-muted-foreground">
          {agent.description || 'No description provided yet.'}
        </p>

        {isWorking && currentActivity && (
          <p
            className="gba:mt-2 gba:flex gba:items-center gba:gap-1.5 gba:truncate gba:text-[11px] gba:font-medium gba:text-emerald-700"
            title={currentActivity}
            data-testid={`workforce-agent-activity-${agent.agent_id}`}
          >
            <PulseIcon className="gba:h-3 gba:w-3 gba:shrink-0" weight="bold" />
            <span className="gba:truncate">{currentActivity}</span>
          </p>
        )}

        {/* Stats row */}
        <div
          className="gba:mt-3 gba:flex gba:flex-wrap gba:items-center gba:gap-x-3 gba:gap-y-1"
          data-testid={`workforce-agent-stats-${agent.agent_id}`}
        >
          <StatChip
            icon={LightningIcon}
            label={`${summary.activeTriggerCount}/${summary.triggerCount} triggers`}
            testId={`workforce-agent-triggers-${agent.agent_id}`}
          />
          <StatChip
            icon={PulseIcon}
            label={`Last run ${formatLastRunLabel(summary.lastCompletedAt)}`}
            testId={`workforce-agent-lastrun-${agent.agent_id}`}
          />
          <StatChip
            icon={SparkleIcon}
            label={`${summary.creditsThisWeek} credits / 7d`}
            testId={`workforce-agent-credits-${agent.agent_id}`}
          />
        </div>

        {/* Action row pinned at the bottom. Stop propagation so the buttons
            keep their own behaviour and don't also trigger the card open. */}
        <div
          className="gba:mt-4 gba:flex gba:items-center gba:gap-2"
          onClick={event => event.stopPropagation()}
          onKeyDown={event => event.stopPropagation()}
          role="presentation"
        >
          {status === 'active' ? (
            <Button
              variant="outline"
              size="sm"
              className="gba:flex-1"
              disabled={isPausing}
              onClick={() => onPause?.(agent)}
              data-testid={`workforce-agent-pause-${agent.agent_id}`}
            >
              <PauseIcon className="gba:mr-1 gba:h-3.5 gba:w-3.5" />
              {isPausing ? 'Pausing…' : 'Pause'}
            </Button>
          ) : (
            <Button
              size="sm"
              className="gba:flex-1"
              disabled={isActivating}
              onClick={() => onActivate?.(agent)}
              data-testid={`workforce-agent-activate-${agent.agent_id}`}
            >
              <PlayIcon className="gba:mr-1 gba:h-3.5 gba:w-3.5" />
              {isActivating ? 'Activating…' : 'Activate'}
            </Button>
          )}

          {onArchive && (
            <Button
              variant="outline"
              size="sm"
              disabled={isArchiving}
              onClick={() => onArchive(agent)}
              data-testid={`workforce-agent-archive-${agent.agent_id}`}
              aria-label="Remove from workforce"
            >
              <ArchiveIcon className="gba:h-3.5 gba:w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
