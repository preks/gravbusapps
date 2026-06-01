import React, { useMemo, type FC, type ReactNode } from 'react'
import {
  BrainIcon,
  CompassIcon,
  HandIcon,
  ListChecksIcon,
  ShareNetworkIcon,
  SparkleIcon,
  TargetIcon,
  WrenchIcon
} from '@phosphor-icons/react'
import type { DecisionCategory, ActivityEvent } from '../../types/enterpriseAgent'
import type { DecisionItem } from '../../hooks/useFabricDecisions'
import { toolCategoryColor } from '../../utils/renderUtils'
import {
  DECISION_CATEGORY_LABEL,
  formatTimelineClockTime,
  mergeSessionTimelineEntries,
  type SessionTimelineEntry
} from './sessionTimelineMerge'

const DECISION_ICON: Record<DecisionCategory, ReactNode> = {
  skill: <SparkleIcon className="gba:h-3 gba:w-3 gba:text-amber-600" weight="duotone" />,
  tool_routing: <CompassIcon className="gba:h-3 gba:w-3 gba:text-sky-600" weight="duotone" />,
  reflection: <BrainIcon className="gba:h-3 gba:w-3 gba:text-violet-600" weight="duotone" />,
  hitl: <HandIcon className="gba:h-3 gba:w-3 gba:text-orange-600" weight="duotone" />,
  plan: <ListChecksIcon className="gba:h-3 gba:w-3 gba:text-emerald-600" weight="duotone" />
}

const DOT_RING: Record<DecisionCategory, string> = {
  skill: 'gba:border-amber-500',
  tool_routing: 'gba:border-sky-500',
  reflection: 'gba:border-violet-500',
  hitl: 'gba:border-orange-500',
  plan: 'gba:border-emerald-500'
}

const ACTIVITY_DOT: Record<ActivityEvent['type'], string> = {
  tool_call: 'gba:border-muted-foreground/50',
  tool_result: 'gba:border-muted-foreground/40',
  reflection: 'gba:border-violet-500',
  subagent_spawn: 'gba:border-sky-500',
  memory_access: 'gba:border-muted-foreground/50'
}

const isSkillLoadActivity = (event: ActivityEvent): boolean =>
  event.type === 'tool_call' && event.toolName === 'skill_load' && !!event.skillId

const normalizeActivityText = (value?: string) => (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()

const isLikelyTaskText = (value?: string) => {
  const compact = (value ?? '').trim()
  if (!compact) return false
  return compact.length > 42 || compact.split(/\s+/).length > 5
}

function TimelineDot({ ringClass }: Readonly<{ ringClass: string }>) {
  return (
    <span
      className={`gba:relative gba:z-10 gba:block gba:h-2.5 gba:w-2.5 gba:shrink-0 gba:rounded-full gba:border-2 gba:bg-card ${ringClass}`}
      aria-hidden
    />
  )
}

function DecisionRow({ decision }: Readonly<{ decision: DecisionItem }>) {
  const icon = DECISION_ICON[decision.category] ?? (
    <TargetIcon className="gba:h-3 gba:w-3 gba:text-muted-foreground" weight="duotone" />
  )
  const label = DECISION_CATEGORY_LABEL[decision.category] ?? decision.category
  const ring = DOT_RING[decision.category] ?? 'gba:border-primary'

  return (
    <div className="gba:flex gba:gap-4 gba:pb-5 gba:last:pb-2" data-testid={`fabric-decision-${decision.id}`}>
      <div className="gba:flex gba:w-6 gba:shrink-0 gba:justify-center gba:pt-1.5">
        <TimelineDot ringClass={ring} />
      </div>
      <div className="gba:min-w-0 gba:flex-1">
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-x-2 gba:gap-y-0.5">
          <time
            className="gba:font-mono gba:text-[10px] gba:font-semibold gba:text-muted-foreground gba:tabular-nums"
            dateTime={decision.timestamp}
          >
            {formatTimelineClockTime(decision.timestamp)}
          </time>
          <span className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded gba:bg-muted/60 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
            {icon}
            {label}
          </span>
          {typeof decision.confidence === 'number' && (
            <span className="gba:text-[10px] gba:text-muted-foreground/60">
              {Math.round(decision.confidence * 100)}%
            </span>
          )}
        </div>
        <p className="gba:mt-1 gba:text-xs gba:font-medium gba:text-foreground gba:leading-snug">{decision.title}</p>
        {decision.chosen && decision.chosen !== decision.title && (
          <p className="gba:mt-0.5 gba:text-[11px] gba:font-mono gba:text-muted-foreground/80 gba:leading-snug">
            {decision.chosen}
          </p>
        )}
        {decision.rationale && (
          <p className="gba:mt-0.5 gba:text-[11px] gba:text-muted-foreground gba:leading-snug gba:line-clamp-3">
            {decision.rationale}
          </p>
        )}
      </div>
    </div>
  )
}

function ActivityRow({ event }: Readonly<{ event: ActivityEvent }>) {
  const isSubagent = event.type === 'subagent_spawn'
  const isSkillLoad = isSkillLoadActivity(event)
  const showAgentBadge =
    isSubagent &&
    !!event.agent &&
    !isLikelyTaskText(event.agent) &&
    normalizeActivityText(event.agent) !== normalizeActivityText(event.summary)

  let ring = ACTIVITY_DOT[event.type]
  if (isSkillLoad) ring = 'gba:border-amber-500'

  return (
    <div className="gba:flex gba:gap-4 gba:pb-5 gba:last:pb-2" data-testid={`fabric-activity-${event.id}`}>
      <div className="gba:flex gba:w-6 gba:shrink-0 gba:justify-center gba:pt-1.5">
        <TimelineDot ringClass={ring} />
      </div>
      <div className="gba:min-w-0 gba:flex-1">
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-x-2 gba:gap-y-0.5">
          <time
            className="gba:font-mono gba:text-[10px] gba:font-semibold gba:text-muted-foreground gba:tabular-nums"
            dateTime={event.timestamp}
          >
            {formatTimelineClockTime(event.timestamp)}
          </time>
          {isSkillLoad ? (
            <span className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:border gba:border-amber-500/20 gba:bg-amber-500/10 gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:text-amber-700 dark:gba:text-amber-300">
              <SparkleIcon className="gba:h-3 gba:w-3" weight="duotone" />
              Tool
            </span>
          ) : (
            event.toolName && (
              <span
                className={`gba:inline-flex gba:items-center gba:gap-1 gba:rounded gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-mono gba:font-semibold ${toolCategoryColor(event.toolName)}`}
              >
                <WrenchIcon className="gba:h-3 gba:w-3" />
                {event.toolName}
              </span>
            )
          )}
          {isSubagent && <ShareNetworkIcon className="gba:h-3 gba:w-3 gba:text-sky-600" />}
        </div>
        {showAgentBadge && (
          <span className="gba:mt-1 gba:inline-flex gba:items-center gba:rounded-full gba:bg-sky-100 gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:text-sky-700 dark:gba:bg-sky-950/40 dark:gba:text-sky-300">
            {event.agent}
          </span>
        )}
        <p className="gba:mt-1 gba:text-xs gba:text-foreground gba:leading-snug">{event.summary}</p>
        {event.durationMs !== undefined && (
          <p className="gba:mt-0.5 gba:text-[10px] gba:text-muted-foreground/50">
            {(event.durationMs / 1000).toFixed(2)}s
          </p>
        )}
      </div>
    </div>
  )
}

function TimelineEntryRow({ entry }: Readonly<{ entry: SessionTimelineEntry }>) {
  if (entry.kind === 'decision') {
    return <DecisionRow decision={entry.decision} />
  }
  return <ActivityRow event={entry.activity} />
}

interface UnifiedSessionTimelineProps {
  decisions: DecisionItem[]
  activityEvents: ActivityEvent[]
}

export const UnifiedSessionTimeline: FC<UnifiedSessionTimelineProps> = ({ decisions, activityEvents }) => {
  const entries = useMemo(() => mergeSessionTimelineEntries(decisions, activityEvents), [decisions, activityEvents])

  if (entries.length === 0) {
    return (
      <div className="gba:px-4 gba:py-4">
        <p className="gba:text-xs gba:text-muted-foreground/60 gba:italic">Session events will appear here…</p>
      </div>
    )
  }

  return (
    <div className="gba:px-4 gba:py-3" data-testid="fabric-unified-session-timeline">
      <div className="gba:relative gba:pl-0.5">
        <div
          className="gba:pointer-events-none gba:absolute gba:left-3 gba:top-3 gba:bottom-3 gba:w-px gba:bg-border/70"
          aria-hidden
        />
        {entries.map(entry => (
          <TimelineEntryRow key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}
