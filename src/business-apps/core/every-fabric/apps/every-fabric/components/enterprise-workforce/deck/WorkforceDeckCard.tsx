// A single sleek card in the Agent Deck.
//
// Self-contained: shows the agent's avatar, name, role/department, status, a
// short description, the trigger / last-run / credits stats, and the
// Activate / Pause / Archive actions - so the deck loses none of the grid's
// functionality. The whole card is clickable to open the agent detail; inner
// action buttons stop propagation so they don't trigger that. The card's
// transform + stacking are driven by the parent deck (fan + hover-grow); this
// component only reports hover/focus and renders content. Action testids match
// the original tile for stable tests.

import { Button, useTranslation } from '@newwork/nw-design-system'
import { ArchiveIcon, LightningIcon, PauseIcon, PlayIcon, PulseIcon, SparkleIcon } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import React from 'react'
import type { WorkforceAgentSummary } from '../useWorkforceData'
import type { WorkforceAgent } from '../workforceTypes'
import {
  avatarAccent,
  formatAgentName,
  formatRelative,
  resolveInitials,
  statusPill,
  type WorkforceTileStatus
} from '../workforceAgentDisplay'
import translations from '../../../_i18n'

interface WorkforceDeckCardProps {
  summary: WorkforceAgentSummary
  style: React.CSSProperties
  isActive: boolean
  onHover: () => void
  isActivating?: boolean
  isPausing?: boolean
  isArchiving?: boolean
  isWorking?: boolean
  currentActivity?: string | null
  onActivate?: (agent: WorkforceAgent) => void
  onPause?: (agent: WorkforceAgent) => void
  onArchive?: (agent: WorkforceAgent) => void
  onConfigure?: (agent: WorkforceAgent) => void
  matchConfidence?: number
  matchRank?: number
}

interface DeckStatProps {
  icon: Icon
  label: string
  testId: string
}

const DeckStat: React.FC<DeckStatProps> = ({ icon: IconComponent, label, testId }) => (
  <span
    className="gba:inline-flex gba:items-center gba:gap-1.5 gba:text-[11px] gba:text-muted-foreground"
    data-testid={testId}
  >
    <IconComponent className="gba:h-3 gba:w-3 gba:shrink-0" />
    <span className="gba:truncate">{label}</span>
  </span>
)

export const WorkforceDeckCard: React.FC<WorkforceDeckCardProps> = ({
  summary,
  style,
  isActive,
  onHover,
  isActivating = false,
  isPausing = false,
  isArchiving = false,
  isWorking = false,
  currentActivity,
  onActivate,
  onPause,
  onArchive,
  onConfigure,
  matchConfidence,
  matchRank
}) => {
  const { t } = useTranslation(translations)
  const { agent } = summary
  const profile = agent.workforce_profile
  const displayName = formatAgentName(agent.display_name || agent.name)
  const accentClass = avatarAccent(agent.agent_id)
  const status: WorkforceTileStatus = agent.status === 'paused' ? 'paused' : 'active'
  const pill = statusPill(status)
  const roleLabel = profile.role || agent.domain || t('tile-specialist-fallback')
  const departmentLabel = profile.department ?? null
  const isTopMatch = matchRank === 1
  const isClickable = Boolean(onConfigure)

  const handleOpen = () => onConfigure?.(agent)

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isClickable) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleOpen()
    }
  }

  return (
    <div
      data-testid={`workforce-agent-card-${agent.agent_id}`}
      role={isClickable ? 'button' : 'group'}
      aria-label={isClickable ? t('tile-open-agent', { name: displayName }) : displayName}
      tabIndex={0}
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={isClickable ? handleOpen : undefined}
      onKeyDown={handleKeyDown}
      style={style}
      className={`gba:relative gba:flex gba:h-72 gba:w-60 gba:shrink-0 gba:flex-col gba:rounded-2xl gba:border gba:bg-card gba:p-4 gba:transition-all gba:duration-300 gba:ease-out gba:will-change-transform focus-visible:gba:outline-none focus-visible:gba:ring-2 focus-visible:gba:ring-ring ${
        isClickable ? 'gba:cursor-pointer' : ''
      } ${
        isActive ? 'gba:border-foreground/20 gba:shadow-2xl' : 'gba:border-border gba:shadow-sm'
      } ${status === 'paused' && !isActive ? 'gba:opacity-90' : ''}`}
    >
      {/* Header */}
      <div className="gba:flex gba:items-start gba:gap-3">
        <div className="gba:relative gba:shrink-0">
          {isWorking && status === 'active' && (
            <span
              aria-hidden
              className="gba:absolute gba:inset-0 gba:animate-ping gba:rounded-xl gba:bg-emerald-400/40"
            />
          )}
          <div
            className={`gba:relative gba:flex gba:h-11 gba:w-11 gba:items-center gba:justify-center gba:rounded-xl gba:text-sm gba:font-semibold gba:shadow-sm ${accentClass}`}
          >
            {resolveInitials(displayName)}
          </div>
        </div>

        <div className="gba:min-w-0 gba:flex-1">
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-1.5">
            <h3 className="gba:line-clamp-2 gba:text-sm gba:font-semibold gba:leading-tight gba:text-foreground">
              {displayName}
            </h3>
            {matchConfidence !== undefined ? (
              <span
                className={`gba:inline-flex gba:shrink-0 gba:items-center gba:gap-0.5 gba:rounded-full gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-semibold ${
                  isTopMatch ? 'gba:bg-foreground gba:text-background' : 'gba:bg-muted gba:text-muted-foreground'
                }`}
                data-testid={`workforce-agent-match-${agent.agent_id}`}
              >
                <SparkleIcon className="gba:h-2.5 gba:w-2.5" weight={isTopMatch ? 'fill' : 'regular'} />
                {isTopMatch ? '#1' : `${matchConfidence}%`}
              </span>
            ) : isWorking ? (
              <span
                className="gba:inline-flex gba:shrink-0 gba:items-center gba:gap-1 gba:rounded-full gba:bg-emerald-50 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:text-emerald-700"
                data-testid={`workforce-agent-working-${agent.agent_id}`}
              >
                <span className="gba:relative gba:flex gba:h-1.5 gba:w-1.5">
                  <span className="gba:absolute gba:inline-flex gba:h-full gba:w-full gba:animate-ping gba:rounded-full gba:bg-emerald-400" />
                  <span className="gba:relative gba:inline-flex gba:h-1.5 gba:w-1.5 gba:rounded-full gba:bg-emerald-500" />
                </span>
                {t('tile-working')}
              </span>
            ) : (
              <span
                className={`gba:shrink-0 gba:rounded-full gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium ${pill.className}`}
                data-testid={`workforce-agent-status-${agent.agent_id}`}
              >
                {t(pill.labelKey)}
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
      <p className="gba:mt-3 gba:line-clamp-2 gba:text-sm gba:leading-relaxed gba:text-muted-foreground">
        {agent.description || t('tile-no-description')}
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

      {/* Stats */}
      <div className="gba:mt-3 gba:flex gba:flex-col gba:gap-1" data-testid={`workforce-agent-stats-${agent.agent_id}`}>
        <DeckStat
          icon={LightningIcon}
          label={t('tile-triggers-stat', {
            active: summary.activeTriggerCount,
            total: summary.triggerCount
          })}
          testId={`workforce-agent-triggers-${agent.agent_id}`}
        />
        <DeckStat
          icon={PulseIcon}
          label={t('tile-last-run-stat', { time: formatRelative(summary.lastCompletedAt) })}
          testId={`workforce-agent-lastrun-${agent.agent_id}`}
        />
        <DeckStat
          icon={SparkleIcon}
          label={t('tile-credits-stat', { credits: summary.creditsThisWeek })}
          testId={`workforce-agent-credits-${agent.agent_id}`}
        />
      </div>

      {/* Actions pinned to the bottom */}
      <div className="gba:mt-auto gba:flex gba:items-center gba:gap-2 gba:pt-3">
        {status === 'active' ? (
          <Button
            variant="outline"
            size="sm"
            className="gba:flex-1"
            disabled={isPausing}
            onClick={event => {
              event.stopPropagation()
              onPause?.(agent)
            }}
            data-testid={`workforce-agent-pause-${agent.agent_id}`}
          >
            <PauseIcon className="gba:mr-1 gba:h-3.5 gba:w-3.5" />
            {isPausing ? t('tile-pausing') : t('tile-pause')}
          </Button>
        ) : (
          <Button
            size="sm"
            className="gba:flex-1"
            disabled={isActivating}
            onClick={event => {
              event.stopPropagation()
              onActivate?.(agent)
            }}
            data-testid={`workforce-agent-activate-${agent.agent_id}`}
          >
            <PlayIcon className="gba:mr-1 gba:h-3.5 gba:w-3.5" />
            {isActivating ? t('tile-activating') : t('tile-activate')}
          </Button>
        )}

        {onArchive && (
          <Button
            variant="outline"
            size="sm"
            disabled={isArchiving}
            onClick={event => {
              event.stopPropagation()
              onArchive(agent)
            }}
            data-testid={`workforce-agent-archive-${agent.agent_id}`}
            aria-label={t('tile-archive-aria')}
          >
            <ArchiveIcon className="gba:h-3.5 gba:w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
