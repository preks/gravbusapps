import * as React from 'react'
import type { PlanItem } from '../../types/enterpriseAgent'

interface AgentPlanRevealProps {
  items: PlanItem[]
  isCollapsing: boolean
}

const PendingIcon: React.FC = () => (
  <svg
    viewBox="0 0 16 16"
    className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground/60"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="6" />
  </svg>
)

const ActiveIcon: React.FC = () => (
  <span
    className="gba:relative gba:inline-flex gba:items-center gba:justify-center gba:w-3.5 gba:h-3.5"
    aria-hidden="true"
  >
    <span className="gba:absolute gba:inline-flex gba:h-full gba:w-full gba:rounded-full gba:bg-primary/40 gba:animate-ping" />
    <span className="gba:relative gba:inline-flex gba:rounded-full gba:h-2 gba:w-2 gba:bg-primary" />
  </span>
)

const DoneIcon: React.FC = () => (
  <svg
    viewBox="0 0 16 16"
    className="gba:w-3.5 gba:h-3.5 gba:text-emerald-600 dark:gba:text-emerald-400"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="6.5" strokeWidth="1.25" />
    <path d="M5 8.25 L7.25 10.5 L11 6.5" />
  </svg>
)

const FailedIcon: React.FC = () => (
  <svg
    viewBox="0 0 16 16"
    className="gba:w-3.5 gba:h-3.5 gba:text-destructive"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="6.5" strokeWidth="1.25" />
    <path d="M5.5 5.5 L10.5 10.5 M10.5 5.5 L5.5 10.5" />
  </svg>
)

const SkippedIcon: React.FC = () => (
  <svg
    viewBox="0 0 16 16"
    className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground/50"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M3.5 8 L12.5 8" />
  </svg>
)

const StatusIcon: React.FC<{ status: PlanItem['status'] }> = ({ status }) => {
  switch (status) {
    case 'in_progress':
      return <ActiveIcon />
    case 'done':
      return <DoneIcon />
    case 'failed':
      return <FailedIcon />
    case 'skipped':
      return <SkippedIcon />
    default:
      return <PendingIcon />
  }
}

const labelClassFor = (status: PlanItem['status']): string => {
  switch (status) {
    case 'done':
      return 'gba:text-muted-foreground gba:line-through gba:decoration-muted-foreground/40'
    case 'in_progress':
      return 'gba:text-foreground gba:font-medium'
    case 'failed':
      return 'gba:text-destructive'
    case 'skipped':
      return 'gba:text-muted-foreground/70 gba:italic'
    default:
      return 'gba:text-foreground/80'
  }
}

export const AgentPlanReveal: React.FC<AgentPlanRevealProps> = ({ items, isCollapsing }) => {
  const total = items.length
  const completed = React.useMemo(
    () => items.filter(i => i.status === 'done' || i.status === 'skipped').length,
    [items]
  )

  // The deterministic template ack ("Working on this. I'll draw on …") used
  // to render at the top of this card. It was visually heavy, route-static,
  // and duplicated information the live activity ticker now surfaces in
  // real time. We deliberately do NOT render ackText here anymore — the
  // ticker (StreamingPreviewBubble) and ElegantStatusIndicator handle that
  // surface. Only render this card when the agent has produced an actual
  // checklist of plan items.
  if (total === 0) return null

  // Once the final answer is streaming, collapse the full card down to a
  // single thin recap line so the user still has a tiny record of what got
  // planned/done above the answer.
  if (isCollapsing) {
    return (
      <div
        className="gba:mt-2 gba:mb-3 gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground gba:transition-opacity gba:duration-300 gba:animate-in gba:fade-in"
        data-testid="agent-plan-reveal-collapsed"
      >
        <span className="gba:inline-flex gba:items-center gba:gap-1">
          <DoneIcon />
          <span>
            Plan: {completed} / {total} done
          </span>
        </span>
      </div>
    )
  }

  return (
    <div
      className="gba:mt-3 gba:mb-3 gba:rounded-md gba:border gba:border-border/60 gba:bg-muted/30 gba:px-3.5 gba:py-3 gba:transition-all gba:duration-300 gba:animate-in gba:fade-in gba:slide-in-from-bottom-1"
      data-testid="agent-plan-reveal"
    >
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
        <span className="gba:text-[11px] gba:uppercase gba:tracking-wider gba:text-muted-foreground gba:font-semibold">
          Plan
        </span>
        <span className="gba:text-[11px] gba:text-muted-foreground gba:tabular-nums">
          {completed} / {total}
        </span>
      </div>
      <ul className="gba:flex gba:flex-col gba:gap-1.5 gba:list-none gba:m-0 gba:p-0">
        {items.map(item => (
          <li
            key={item.id}
            className="gba:flex gba:items-start gba:gap-2 gba:text-sm gba:leading-snug gba:animate-in gba:fade-in gba:slide-in-from-left-1 gba:duration-200"
          >
            <span className="gba:mt-0.5 gba:shrink-0 gba:transition-all gba:duration-200">
              <StatusIcon status={item.status} />
            </span>
            <span className={`gba:transition-colors gba:duration-200 ${labelClassFor(item.status)}`}>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
