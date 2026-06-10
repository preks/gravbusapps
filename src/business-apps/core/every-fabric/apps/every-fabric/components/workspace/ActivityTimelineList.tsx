import React, { useMemo, type FC, type ReactNode } from 'react'
import {
  ArrowsClockwiseIcon,
  BrainIcon,
  DatabaseIcon,
  ShareNetworkIcon,
  SparkleIcon,
  WrenchIcon
} from '@phosphor-icons/react'
import type { ActivityEvent } from '../../types/enterpriseAgent'
import { parseIsoTimestamp, toolCategoryColor } from '../../utils/renderUtils'

function activityTimestampSortValue(timestamp: string): number {
  const date = parseIsoTimestamp(timestamp)
  return date ? date.getTime() : 0
}

function formatActivityTimestamp(timestamp: string): string {
  const date = parseIsoTimestamp(timestamp)
  if (!date) return ''
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function formatDurationLabel(durationMs?: number): string {
  if (typeof durationMs === 'number') {
    return `${(durationMs / 1000).toFixed(2)}s`
  }
  return ''
}

const EVENT_ICON: Record<ActivityEvent['type'], ReactNode> = {
  tool_call: <WrenchIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />,
  tool_result: <ArrowsClockwiseIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />,
  reflection: <BrainIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />,
  subagent_spawn: <ShareNetworkIcon className="gba:h-3.5 gba:w-3.5 gba:text-sky-600" />,
  memory_access: <DatabaseIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
}

const normalizeActivityText = (value?: string) => (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()

const isLikelyTaskText = (value?: string) => {
  const compact = (value ?? '').trim()
  if (!compact) return false
  return compact.length > 42 || compact.split(/\s+/).length > 5
}

const isSkillLoadActivity = (event: ActivityEvent): boolean =>
  event.type === 'tool_call' && event.toolName === 'skill_load' && !!event.skillId

const activityRowIcon = (event: ActivityEvent): ReactNode => {
  if (isSkillLoadActivity(event)) {
    return <SparkleIcon className="gba:h-3.5 gba:w-3.5 gba:text-amber-500" weight="duotone" />
  }
  return EVENT_ICON[event.type]
}

const getActivityBorderClass = (isSubagent: boolean, isSkillLoad: boolean): string => {
  if (isSubagent) return 'gba:border-l-2 gba:border-sky-400/60'
  if (isSkillLoad) return 'gba:border-l-2 gba:border-amber-400/60'
  return ''
}

interface ActivityTimelineListProps {
  events: ActivityEvent[]
}

export const ActivityTimelineList: FC<ActivityTimelineListProps> = ({ events }) => {
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => activityTimestampSortValue(a.timestamp) - activityTimestampSortValue(b.timestamp)),
    [events]
  )

  if (sortedEvents.length === 0) {
    return (
      <div className="gba:px-4 gba:py-3">
        <p className="gba:text-xs gba:text-muted-foreground/60 gba:italic">Tool activity will appear here…</p>
      </div>
    )
  }

  return (
    <>
      {sortedEvents.map(event => {
        const isSubagent = event.type === 'subagent_spawn'
        const isSkillLoad = isSkillLoadActivity(event)
        const showAgentBadge =
          isSubagent &&
          !!event.agent &&
          !isLikelyTaskText(event.agent) &&
          normalizeActivityText(event.agent) !== normalizeActivityText(event.summary)
        const timestampLabel = formatActivityTimestamp(event.timestamp)
        return (
          <div
            key={event.id}
            className={`gba:flex gba:items-start gba:gap-2.5 gba:px-4 gba:py-2 gba:hover:bg-muted/20 gba:transition-colors ${getActivityBorderClass(
              isSubagent,
              isSkillLoad
            )}`}
            data-testid={`fabric-activity-${event.id}`}
          >
            <div className="gba:shrink-0 gba:mt-0.5">{activityRowIcon(event)}</div>
            <div className="gba:flex-1 gba:min-w-0">
              {isSkillLoad ? (
                <span className="gba:mb-0.5 gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:border gba:border-amber-500/20 gba:bg-amber-500/10 gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-semibold gba:text-amber-700 dark:gba:text-amber-300">
                  <SparkleIcon className="gba:h-3 gba:w-3" weight="duotone" />
                  Skill: {event.skillName ?? event.skillId}
                </span>
              ) : (
                event.toolName && (
                  <span
                    className={`gba:inline-flex gba:items-center gba:px-1.5 gba:py-0.5 gba:rounded gba:text-[11px] gba:font-mono gba:font-semibold gba:mb-0.5 ${toolCategoryColor(event.toolName)}`}
                  >
                    {event.toolName}
                  </span>
                )
              )}
              {showAgentBadge && (
                <span className="gba:mb-0.5 gba:inline-flex gba:items-center gba:rounded-full gba:bg-sky-100 gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-semibold gba:text-sky-700 dark:gba:bg-sky-950/40 dark:gba:text-sky-300">
                  {event.agent}
                </span>
              )}
              <p className="gba:text-xs gba:text-foreground gba:leading-snug">{event.summary}</p>
              {(timestampLabel || event.durationMs !== undefined) && (
                <p className="gba:mt-1 gba:text-[10px] gba:leading-4 gba:text-muted-foreground/38">
                  {timestampLabel}
                  {timestampLabel && event.durationMs !== undefined ? ' · ' : ''}
                  {formatDurationLabel(event.durationMs)}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}
