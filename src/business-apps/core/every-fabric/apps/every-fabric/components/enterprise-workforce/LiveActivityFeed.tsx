// Right-rail feed of an agent's in-flight runs.
//
// Driven by useWorkforceLiveActivity, it lists each live run with its current
// activity label and a pulsing indicator so an operator watching the detail
// screen can see what the agent is doing right now without opening a run.

import { ClockIcon, PulseIcon } from '@phosphor-icons/react'
import React from 'react'
import { LiveStatusPill } from './LiveStatusPill'
import { runStatusVisual } from './runDisplay'
import type { WorkforceActiveRun } from './workforceTypes'

export interface LiveActivityFeedProps {
  runs: readonly WorkforceActiveRun[]
  isConnected?: boolean
  onOpenRun?: (sessionId: string) => void
}

function relativeStart(iso: string | null | undefined): string {
  if (!iso) return 'just now'
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return 'just now'
  const seconds = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  return `${hours}h`
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({ runs, isConnected = true, onOpenRun }) => {
  return (
    <section
      className="gba:rounded-xl gba:border gba:border-border gba:bg-card gba:p-3"
      data-testid="workforce-live-activity-feed"
    >
      <div className="gba:mb-2 gba:flex gba:items-center gba:justify-between">
        <h3 className="gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
          Live activity
        </h3>
        <LiveStatusPill connected={isConnected} label={`${runs.length} running`} />
      </div>

      {runs.length === 0 ? (
        <p className="gba:py-4 gba:text-center gba:text-[11px] gba:text-muted-foreground">
          No runs in flight right now.
        </p>
      ) : (
        <ul className="gba:flex gba:flex-col gba:gap-2">
          {runs.map(run => {
            const visual = runStatusVisual(run.status)
            return (
              <li key={run.session_id}>
                <button
                  type="button"
                  onClick={onOpenRun ? () => onOpenRun(run.session_id) : undefined}
                  className="gba:flex gba:w-full gba:flex-col gba:gap-1 gba:rounded-lg gba:border gba:border-border/60 gba:bg-background gba:p-2.5 gba:text-left gba:transition-colors gba:hover:border-foreground/20 gba:disabled:cursor-default"
                  disabled={!onOpenRun}
                  data-testid={`workforce-live-run-${run.session_id}`}
                >
                  <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                    <span
                      className={`gba:inline-flex gba:items-center gba:rounded-full gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium ${visual.pillClass}`}
                    >
                      {visual.label}
                    </span>
                    <span className="gba:inline-flex gba:items-center gba:gap-1 gba:text-[10px] gba:text-muted-foreground">
                      <ClockIcon className="gba:h-3 gba:w-3" />
                      {relativeStart(run.started_at)}
                    </span>
                  </div>
                  <p className="gba:flex gba:items-center gba:gap-1.5 gba:text-[11px] gba:font-medium gba:text-foreground">
                    <PulseIcon className="gba:h-3 gba:w-3 gba:shrink-0 gba:text-emerald-600" weight="bold" />
                    <span className="gba:line-clamp-2">{run.current_activity}</span>
                  </p>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
