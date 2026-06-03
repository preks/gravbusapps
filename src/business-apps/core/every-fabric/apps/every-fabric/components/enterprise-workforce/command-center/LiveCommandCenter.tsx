// Live Command Center for the Workforce overview hub.
//
// A workspace-wide, semi-live view of what the whole digital workforce is
// doing right now: a status ribbon (running / waiting / pending + last-hour
// throughput) over a chronological feed of just-started, active, and
// just-finished runs with their triggers and outcomes. Subsumes the old
// "working now" strip. Always visible on the overview; the feed shows a calm
// idle state when there is genuinely no activity.

import { LightningIcon } from '@phosphor-icons/react'
import React from 'react'
import type { WorkforceActiveOverview } from '../workforceTypes'
import type { WorkforceFeedItem } from '../workforceFeedModel'
import { CommandCenterFeed } from './CommandCenterFeed'
import { CommandCenterRibbon } from './CommandCenterRibbon'

export interface LiveCommandCenterProps {
  feed: readonly WorkforceFeedItem[]
  overview: WorkforceActiveOverview | null
  completedToday: number
  throughputBuckets: readonly number[]
  isConnected: boolean
  nameById: Record<string, string>
  onOpenRun: (agentId: string, sessionId: string) => void
}

export const LiveCommandCenter: React.FC<LiveCommandCenterProps> = ({
  feed,
  overview,
  completedToday,
  throughputBuckets,
  isConnected,
  nameById,
  onOpenRun
}) => {
  const counts = overview?.status_counts ?? { running: 0, pending: 0, waiting_for_human: 0 }

  return (
    <section
      className="gba:flex gba:flex-col gba:gap-3 gba:rounded-xl gba:border gba:border-border/60 gba:bg-card gba:p-4"
      data-testid="workforce-command-center"
    >
      <header className="gba:flex gba:items-center gba:gap-2">
        <LightningIcon className="gba:h-4 gba:w-4 gba:text-primary" weight="fill" />
        <h2 className="gba:text-sm gba:font-semibold gba:text-foreground">Command center</h2>
      </header>

      <CommandCenterRibbon
        running={counts.running}
        waitingForHuman={counts.waiting_for_human}
        pending={counts.pending}
        completedToday={completedToday}
        throughputBuckets={throughputBuckets}
        isConnected={isConnected}
      />

      <CommandCenterFeed items={feed} nameById={nameById} onOpenRun={onOpenRun} />
    </section>
  )
}
