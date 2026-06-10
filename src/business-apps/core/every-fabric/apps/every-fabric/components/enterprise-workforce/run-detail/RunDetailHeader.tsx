// Header for the full-screen run detail: a back affordance, the run identity +
// live status, and a compact fact grid answering who ran it, what triggered it,
// which case it touched, when it started, how long it took, and what it cost.

import {
  ArrowLeftIcon,
  ClockIcon,
  CoinsIcon,
  IdentificationBadgeIcon,
  SpinnerGapIcon,
  TimerIcon
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import React from 'react'
import { LiveStatusPill } from '../LiveStatusPill'
import { formatTimestamp, runCredits, runDurationLabel, runStatusVisual } from '../runDisplay'
import { sourceVisual } from '../workforceSourceDisplay'
import type { WorkforceRun, WorkforceRunTraceEvent } from '../workforceTypes'
import { RunContextLinks } from './RunContextLinks'
import { resolveSource, resolveTriggerName } from './runDetailFacts'

export interface RunDetailHeaderProps {
  run: WorkforceRun
  agentName: string
  accessToken: string
  trace: readonly WorkforceRunTraceEvent[]
  isStreaming: boolean
  isConnected: boolean
  isRefreshing: boolean
  onBack: () => void
}

interface FactProps {
  icon: Icon
  label: string
  value: string
}

const Fact: React.FC<FactProps> = ({ icon: IconComponent, label, value }) => (
  <div className="gba:flex gba:items-start gba:gap-2">
    <IconComponent className="gba:mt-0.5 gba:h-4 gba:w-4 gba:shrink-0 gba:text-muted-foreground" />
    <div className="gba:min-w-0">
      <p className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
        {label}
      </p>
      <p className="gba:truncate gba:text-xs gba:font-medium gba:text-foreground" title={value}>
        {value}
      </p>
    </div>
  </div>
)

export const RunDetailHeader: React.FC<RunDetailHeaderProps> = ({
  run,
  agentName,
  accessToken,
  trace,
  isStreaming,
  isConnected,
  isRefreshing,
  onBack
}) => {
  const visual = runStatusVisual(run.status)
  const source = resolveSource(run)
  const sourceInfo = sourceVisual(source)
  const SourceIcon = sourceInfo.icon
  const triggerName = resolveTriggerName(run)
  const triggerValue = triggerName ? `${sourceInfo.label} · ${triggerName}` : sourceInfo.label
  const duration = runDurationLabel(run)
  const credits = runCredits(run)

  return (
    <header className="gba:shrink-0 gba:border-b gba:border-border gba:bg-card gba:px-6 gba:py-4">
      <div className="gba:mx-auto gba:max-w-5xl">
        <div className="gba:flex gba:items-center gba:gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="gba:inline-flex gba:h-8 gba:w-8 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-md gba:text-muted-foreground gba:hover:bg-muted/60 gba:hover:text-foreground"
            data-testid="run-detail-back"
          >
            <ArrowLeftIcon className="gba:h-4 gba:w-4" />
          </button>
          <span
            className={`gba:inline-flex gba:items-center gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium ${visual.pillClass}`}
            data-testid="run-detail-status"
          >
            {visual.label}
          </span>
          <h1
            className="gba:truncate gba:text-base gba:font-semibold gba:text-foreground"
            data-testid="run-detail-title"
          >
            {agentName}
          </h1>
          {isStreaming && <LiveStatusPill connected={isConnected} />}
          {isRefreshing && !isStreaming && (
            <span className="gba:inline-flex gba:items-center gba:gap-1 gba:text-[11px] gba:text-muted-foreground">
              <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin" />
              Refreshing
            </span>
          )}
          <span className="gba:ml-auto gba:font-mono gba:text-[11px] gba:text-muted-foreground">
            {run.session_id.slice(0, 8)}
          </span>
        </div>

        <div className="gba:mt-4 gba:grid gba:grid-cols-2 gba:gap-3 gba:sm:grid-cols-3 gba:lg:grid-cols-5">
          <Fact icon={IdentificationBadgeIcon} label="Agent" value={agentName} />
          <Fact icon={SourceIcon} label="Trigger" value={triggerValue} />
          <Fact icon={ClockIcon} label="Started" value={formatTimestamp(run.started_at ?? run.created_at)} />
          <Fact icon={TimerIcon} label="Duration" value={duration ?? '—'} />
          <Fact icon={CoinsIcon} label="Credits" value={`${credits}`} />
        </div>

        <RunContextLinks run={run} accessToken={accessToken} trace={trace} />
      </div>
    </header>
  )
}
