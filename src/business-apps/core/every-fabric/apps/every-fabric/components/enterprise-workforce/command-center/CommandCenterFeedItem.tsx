// One card in the Live Command Center feed.
//
// Renders an agent run as either "active" (pulsing, with current activity and
// elapsed time) or "finished" (outcome pill, duration, case + credits). The
// trigger source icon answers "what caused it". Clicking opens that run.

import { ClockIcon, CoinsIcon, PulseIcon } from '@phosphor-icons/react'
import React from 'react'
import { statusVisualForRun } from '../runDisplay'
import { sourceVisual } from '../workforceSourceDisplay'
import type { WorkforceFeedItem } from '../workforceFeedModel'
import { caseRefLabel, elapsedSince, formatDurationMs } from './commandCenterFormat'

export interface CommandCenterFeedItemProps {
  item: WorkforceFeedItem
  nameById: Record<string, string>
  onOpenRun: (agentId: string, sessionId: string) => void
}

function agentLabel(item: WorkforceFeedItem, nameById: Record<string, string>): string {
  return item.displayName || nameById[item.agentId] || item.agentId.slice(0, 8)
}

export const CommandCenterFeedItem: React.FC<CommandCenterFeedItemProps> = ({ item, nameById, onOpenRun }) => {
  const source = sourceVisual(item.source)
  const SourceIcon = source.icon
  const isActive = item.kind === 'active'
  const statusVisual = statusVisualForRun({
    status: item.status,
    pending_flow_approval: item.pendingFlowApproval
  })
  const caseLabel = caseRefLabel(item.caseRef)
  const duration = formatDurationMs(item.durationMs)

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
        {isActive ? (
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
        <span className="gba:truncate gba:text-xs gba:font-semibold gba:text-foreground">
          {agentLabel(item, nameById)}
        </span>
        <span className="gba:ml-auto gba:inline-flex gba:items-center gba:gap-1 gba:text-[10px] gba:text-muted-foreground">
          <ClockIcon className="gba:h-3 gba:w-3" />
          {isActive ? elapsedSince(item.timestamp) : (duration ?? '—')}
        </span>
      </div>

      <p className="gba:flex gba:items-center gba:gap-1.5 gba:text-[11px] gba:text-muted-foreground">
        {isActive ? (
          <PulseIcon className="gba:h-3 gba:w-3 gba:shrink-0 gba:text-emerald-600" weight="bold" />
        ) : (
          <SourceIcon className="gba:h-3 gba:w-3 gba:shrink-0" weight="bold" />
        )}
        <span className="gba:truncate">
          {isActive ? item.currentActivity || 'Working…' : caseLabel || source.label}
        </span>
      </p>

      <div className="gba:flex gba:items-center gba:gap-2 gba:text-[10px] gba:text-muted-foreground">
        <span className="gba:inline-flex gba:items-center gba:gap-1">
          <SourceIcon className="gba:h-3 gba:w-3" />
          {source.label}
        </span>
        {item.trigger?.name && <span className="gba:truncate">· {item.trigger.name}</span>}
        {!isActive && item.credits !== null && (
          <span className="gba:ml-auto gba:inline-flex gba:items-center gba:gap-1">
            <CoinsIcon className="gba:h-3 gba:w-3" />
            {item.credits}
          </span>
        )}
      </div>
    </button>
  )
}
