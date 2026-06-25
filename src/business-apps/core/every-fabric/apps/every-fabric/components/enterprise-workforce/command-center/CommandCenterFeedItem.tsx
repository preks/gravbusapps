// One card in the Live Command Center feed.
//
// Renders an agent run as either "active" (pulsing, with current activity and
// elapsed time) or "finished" (outcome pill, duration, case + credits). The
// trigger source icon answers "what caused it". Clicking opens that run.

import { ClockIcon, CoinsIcon, PulseIcon } from '@phosphor-icons/react'
import { useTranslation } from '@newwork/nw-design-system'
import React from 'react'
import { statusVisualForRun } from '../runDisplay'
import { sourceVisual } from '../workforceSourceDisplay'
import { isNeedsYouItem, type WorkforceFeedItem } from '../workforceFeedModel'
import { caseRefLabel, elapsedSince, formatDurationMs } from './commandCenterFormat'
import translations from '../../../_i18n'

export interface CommandCenterFeedItemProps {
  item: WorkforceFeedItem
  nameById: Record<string, string>
  onOpenRun: (agentId: string, sessionId: string) => void
}

function agentLabel(item: WorkforceFeedItem, nameById: Record<string, string>): string {
  return item.displayName || nameById[item.agentId] || item.agentId.slice(0, 8)
}

export const CommandCenterFeedItem: React.FC<CommandCenterFeedItemProps> = ({ item, nameById, onOpenRun }) => {
  const { t } = useTranslation(translations)
  const label = agentLabel(item, nameById)
  const source = sourceVisual(item.source)
  const sourceLabel = t(source.labelKey)
  const SourceIcon = source.icon
  // A non-terminal run is "live", but only genuinely-working runs (running /
  // pending) get the green pulse. Action-required runs (waiting / escalated /
  // budget-paused / flow approval) are live too, yet must read amber, so they
  // render as a status card like finished runs — never the green dot.
  const isLiveRun = item.kind === 'active'
  const needsAttention = isNeedsYouItem(item)
  const isWorking = isLiveRun && !needsAttention
  // Live runs and action-required runs are both ongoing, so show how long they
  // have been running / waiting. Only truly finished runs report a duration;
  // flow-pending "Awaiting approval" cards are modelled as finished but are
  // still waiting, so they use elapsed time too (never a bare dash).
  const showElapsed = isLiveRun || needsAttention
  const statusVisual = statusVisualForRun({
    status: item.status,
    pending_flow_approval: item.pendingFlowApproval
  })
  const caseLabel = caseRefLabel(item.caseRef)
  const duration = formatDurationMs(item.durationMs)
  // The provenance row below always shows the source, so the secondary line
  // never repeats it: working runs show their live activity; other cards show
  // the case they acted on (if any) and are otherwise omitted. This kills the
  // "Inbound email / Inbound email" duplication on action-required cards.
  const secondaryText = isWorking ? item.currentActivity || t('action-working') : caseLabel

  return (
    <button
      type="button"
      onClick={() => onOpenRun(item.agentId, item.sessionId)}
      className={`gba:flex gba:w-full gba:flex-col gba:gap-1.5 gba:rounded-lg gba:border gba:bg-background gba:p-2.5 gba:text-left gba:transition-colors gba:hover:border-foreground/20 ${
        item.isNew ? 'gba:border-primary/40 gba:animate-in gba:fade-in gba:slide-in-from-top-1' : 'gba:border-border/60'
      }`}
      data-testid={`command-center-item-${item.key}`}
      data-kind={item.kind}
    >
      <div className="gba:flex gba:items-center gba:gap-2">
        {isWorking ? (
          <span className="gba:relative gba:flex gba:h-1.5 gba:w-1.5 gba:shrink-0">
            <span className="gba:absolute gba:inline-flex gba:h-full gba:w-full gba:animate-ping gba:rounded-full gba:bg-emerald-400" />
            <span className="gba:relative gba:inline-flex gba:h-1.5 gba:w-1.5 gba:rounded-full gba:bg-emerald-500" />
          </span>
        ) : (
          <span
            className={`gba:inline-flex gba:items-center gba:rounded-full gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium ${statusVisual.pillClass}`}
          >
            {statusVisual.label}
          </span>
        )}
        <span className="gba:truncate gba:text-xs gba:font-semibold gba:text-foreground" title={label}>
          {label}
        </span>
        <span className="gba:ml-auto gba:inline-flex gba:items-center gba:gap-1 gba:text-[10px] gba:text-muted-foreground">
          <ClockIcon className="gba:h-3 gba:w-3" />
          {showElapsed ? elapsedSince(item.timestamp) : (duration ?? '—')}
        </span>
      </div>

      {secondaryText && (
        <p
          className="gba:flex gba:items-center gba:gap-1.5 gba:text-[11px] gba:text-muted-foreground"
          data-testid={`command-center-activity-${item.key}`}
        >
          {isWorking ? (
            <PulseIcon className="gba:h-3 gba:w-3 gba:shrink-0 gba:text-emerald-600" weight="bold" />
          ) : (
            <SourceIcon className="gba:h-3 gba:w-3 gba:shrink-0" weight="bold" />
          )}
          <span className="gba:truncate">{secondaryText}</span>
        </p>
      )}

      <div className="gba:flex gba:items-center gba:gap-2 gba:text-[10px] gba:text-muted-foreground">
        <span className="gba:inline-flex gba:items-center gba:gap-1">
          <SourceIcon className="gba:h-3 gba:w-3" />
          {sourceLabel}
        </span>
        {item.trigger?.name && <span className="gba:truncate">· {item.trigger.name}</span>}
        {!isLiveRun && item.credits !== null && (
          <span className="gba:ml-auto gba:inline-flex gba:items-center gba:gap-1">
            <CoinsIcon className="gba:h-3 gba:w-3" />
            {item.credits}
          </span>
        )}
      </div>
    </button>
  )
}
